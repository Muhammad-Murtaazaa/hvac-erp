import prisma from "./db";

export interface AuditActor {
  id: string;
  email: string;
}

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "ROLLBACK";

export type AuditEntityName =
  | "Product"
  | "Invoice"
  | "PurchaseOrder"
  | "Employee"
  | "Complaint"
  | "Vendor"
  | "DeliveryOrder"
  | "GoodsReceivedNote"
  | "StockAdjustment"
  | "Return"
  | "VendorReturn"
  | "Payment"
  | "PayrollRun";

/**
 * Computes a shallow/recursive diff between before and after objects.
 */
export function computeDiff(before: any, after: any): Record<string, { old: any; new: any }> {
  const diff: Record<string, { old: any; new: any }> = {};
  if (!before && !after) return diff;

  const allKeys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
  for (const key of allKeys) {
    // Skip volatile / system fields
    if (["updatedAt", "createdAt"].includes(key)) continue;

    const valBefore = before ? before[key] : undefined;
    const valAfter = after ? after[key] : undefined;

    if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
      diff[key] = { old: valBefore, new: valAfter };
    }
  }
  return diff;
}

/**
 * Records an audit snapshot for an entity change.
 */
export async function recordAuditSnapshot(params: {
  entityName: AuditEntityName | string;
  entityId: string;
  action: AuditAction;
  actor: AuditActor;
  beforeState?: any;
  afterState?: any;
  diff?: any;
}) {
  try {
    const computed = computeDiff(params.beforeState, params.afterState);
    const diffStr = params.diff
      ? typeof params.diff === "string"
        ? params.diff
        : JSON.stringify(params.diff)
      : Object.keys(computed).length > 0
      ? JSON.stringify(computed)
      : null;

    return await prisma.auditSnapshot.create({
      data: {
        entityName: params.entityName,
        entityId: params.entityId,
        action: params.action,
        actorId: params.actor.id || "system",
        actorEmail: params.actor.email || "system@erp.local",
        beforeState: params.beforeState ? JSON.stringify(params.beforeState) : null,
        afterState: params.afterState ? JSON.stringify(params.afterState) : null,
        diff: diffStr,
      },
    });
  } catch (error) {
    console.error("Failed to record audit snapshot:", error);
    return null;
  }
}

/**
 * Rolls back an entity to its state before a specific snapshot was taken,
 * cleanly handling foreign keys, stock levels, and ledger finances.
 */
export async function rollbackSnapshot(snapshotId: string, actor: AuditActor) {
  const snapshot = await prisma.auditSnapshot.findUnique({
    where: { id: snapshotId },
  });

  if (!snapshot) {
    throw new Error("Audit snapshot not found.");
  }

  if (snapshot.isRolledBack) {
    throw new Error("This snapshot has already been rolled back.");
  }

  const { entityName, entityId, action, beforeState, afterState } = snapshot;

  return await prisma.$transaction(async (tx) => {
    // ----------------------------------------------------
    // 1. INVOICE ROLLBACK
    // ----------------------------------------------------
    if (entityName === "Invoice") {
      if (action === "CREATE") {
        // Fetch invoice with line items
        const invoice = await tx.invoice.findUnique({
          where: { id: entityId },
          include: { lineItems: true, payments: true },
        });

        if (invoice) {
          // Revert inventory deduction
          for (const item of invoice.lineItems) {
            if (item.productId) {
              const product = await tx.product.findUnique({ where: { id: item.productId } });
              if (product) {
                const restoredQty = product.onHandQty + item.quantity;
                await tx.product.update({
                  where: { id: item.productId },
                  data: { onHandQty: restoredQty },
                });
                await tx.stockLedger.create({
                  data: {
                    productId: item.productId,
                    type: "MANUAL_ADJUSTMENT",
                    quantity: item.quantity,
                    referenceDoc: `ROLLBACK-${invoice.invoiceNumber}`,
                    runningBalance: restoredQty,
                  },
                });
              }
            }
          }

          // Delete financial ledger entries
          await tx.ledgerEntry.deleteMany({
            where: { referenceType: "INVOICE", referenceId: entityId },
          });

          // Delete payments & line items
          await tx.payment.deleteMany({ where: { invoiceId: entityId } });
          await tx.invoiceLineItem.deleteMany({ where: { invoiceId: entityId } });
          await tx.invoice.delete({ where: { id: entityId } });
        }
      } else if (beforeState) {
        const prev = JSON.parse(beforeState);
        await tx.invoice.update({
          where: { id: entityId },
          data: {
            status: prev.status,
            totalAmount: prev.totalAmount,
            amountPaid: prev.amountPaid,
            notes: prev.notes,
            subjectHeading: prev.subjectHeading,
            subjectDescription: prev.subjectDescription,
            clientName: prev.clientName,
            clientPhone: prev.clientPhone,
            clientAddress: prev.clientAddress,
          },
        });
      }
    }

    // ----------------------------------------------------
    // 2. GOODS RECEIVED NOTE (GRN) ROLLBACK
    // ----------------------------------------------------
    else if (entityName === "GoodsReceivedNote") {
      if (action === "CREATE") {
        const grn = await tx.goodsReceivedNote.findUnique({
          where: { id: entityId },
          include: { lineItems: true },
        });

        if (grn) {
          // Revert stock increments & decrease PO line received count
          for (const item of grn.lineItems) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (product) {
              const restoredQty = Math.max(0, product.onHandQty - item.quantityReceived);
              await tx.product.update({
                where: { id: item.productId },
                data: { onHandQty: restoredQty },
              });
              await tx.stockLedger.create({
                data: {
                  productId: item.productId,
                  type: "MANUAL_ADJUSTMENT",
                  quantity: -item.quantityReceived,
                  referenceDoc: `ROLLBACK-${grn.grnNumber}`,
                  runningBalance: restoredQty,
                },
              });
            }

            // Restore PO line item
            const poLine = await tx.pOLineItem.findFirst({
              where: { poId: grn.poId, productId: item.productId },
            });
            if (poLine) {
              await tx.pOLineItem.update({
                where: { id: poLine.id },
                data: { quantityReceived: Math.max(0, poLine.quantityReceived - item.quantityReceived) },
              });
            }

            // If it had a POPendingItem, reopen it
            if (item.poPendingItemId) {
              const pending = await tx.pOPendingItem.findUnique({ where: { id: item.poPendingItemId } });
              if (pending) {
                await tx.pOPendingItem.update({
                  where: { id: item.poPendingItemId },
                  data: {
                    quantityResolved: Math.max(0, pending.quantityResolved - item.quantityReceived),
                    isResolved: false,
                  },
                });
              }
            }
          }

          // Delete financial ledger entries
          await tx.ledgerEntry.deleteMany({
            where: { referenceType: "PO_RECEIPT", referenceId: entityId },
          });

          await tx.gRNLineItem.deleteMany({ where: { grnId: entityId } });
          await tx.goodsReceivedNote.delete({ where: { id: entityId } });
        }
      }
    }

    // ----------------------------------------------------
    // 3. PURCHASE ORDER ROLLBACK
    // ----------------------------------------------------
    else if (entityName === "PurchaseOrder") {
      if (action === "CREATE") {
        await tx.pOPendingItem.deleteMany({ where: { poId: entityId } });
        await tx.pOLineItem.deleteMany({ where: { poId: entityId } });
        await tx.purchaseOrder.delete({ where: { id: entityId } });
      } else if (beforeState) {
        const prev = JSON.parse(beforeState);
        await tx.purchaseOrder.update({
          where: { id: entityId },
          data: {
            status: prev.status,
            discount: prev.discount,
            totalAmount: prev.totalAmount,
            notes: prev.notes,
          },
        });
      }
    }

    // ----------------------------------------------------
    // 4. STOCK ADJUSTMENT ROLLBACK
    // ----------------------------------------------------
    else if (entityName === "StockAdjustment") {
      if (action === "CREATE") {
        const adj = await tx.stockAdjustment.findUnique({ where: { id: entityId } });
        if (adj) {
          const product = await tx.product.findUnique({ where: { id: adj.productId } });
          if (product) {
            const restoredQty = product.onHandQty - adj.adjustedQty;
            await tx.product.update({
              where: { id: adj.productId },
              data: { onHandQty: restoredQty },
            });
            await tx.stockLedger.create({
              data: {
                productId: adj.productId,
                type: "MANUAL_ADJUSTMENT",
                quantity: -adj.adjustedQty,
                referenceDoc: `ROLLBACK-ADJ-${entityId.slice(0, 8)}`,
                runningBalance: restoredQty,
              },
            });
          }
          await tx.ledgerEntry.deleteMany({
            where: { referenceType: "STOCK_ADJUSTMENT", referenceId: entityId },
          });
          await tx.stockAdjustment.delete({ where: { id: entityId } });
        }
      }
    }

    // ----------------------------------------------------
    // 5. DELIVERY ORDER ROLLBACK
    // ----------------------------------------------------
    else if (entityName === "DeliveryOrder") {
      if (action === "CREATE") {
        await tx.invoice.updateMany({
          where: { doId: entityId },
          data: { doId: null },
        });
        await tx.dOLineItem.deleteMany({ where: { doId: entityId } });
        await tx.deliveryOrder.delete({ where: { id: entityId } });
      } else if (beforeState) {
        const prev = JSON.parse(beforeState);
        await tx.deliveryOrder.update({
          where: { id: entityId },
          data: {
            status: prev.status,
            clientName: prev.clientName,
            clientPhone: prev.clientPhone,
            deliveryAddress: prev.deliveryAddress,
            notes: prev.notes,
            through: prev.through,
            vehicle: prev.vehicle,
            poNumber: prev.poNumber,
          },
        });
      }
    }

    // ----------------------------------------------------
    // 6. EMPLOYEE ROLLBACK
    // ----------------------------------------------------
    else if (entityName === "Employee") {
      if (action === "CREATE") {
        await tx.attendance.deleteMany({ where: { employeeId: entityId } });
        await tx.employee.delete({ where: { id: entityId } });
      } else if (beforeState) {
        const prev = JSON.parse(beforeState);
        await tx.employee.update({
          where: { id: entityId },
          data: {
            employeeNo: prev.employeeNo,
            name: prev.name,
            cnic: prev.cnic,
            phone: prev.phone,
            address: prev.address,
            department: prev.department,
            position: prev.position,
            status: prev.status,
            baseSalary: prev.baseSalary,
            bankDetails: prev.bankDetails,
            fatherName: prev.fatherName,
            fatherPhone: prev.fatherPhone,
            responsiblePerson: prev.responsiblePerson,
            refPhone: prev.refPhone,
          },
        });
      }
    }

    // ----------------------------------------------------
    // 7. PAYROLL RUN ROLLBACK
    // ----------------------------------------------------
    else if (entityName === "PayrollRun") {
      if (action === "CREATE") {
        await tx.ledgerEntry.deleteMany({
          where: { referenceType: "PAYROLL", referenceId: entityId },
        });
        await tx.payrollRun.delete({ where: { id: entityId } });
      } else if (beforeState) {
        const prev = JSON.parse(beforeState);
        await tx.ledgerEntry.deleteMany({
          where: { referenceType: "PAYROLL", referenceId: entityId },
        });
        await tx.payrollRun.update({
          where: { id: entityId },
          data: {
            status: prev.status,
            paymentDate: prev.paymentDate ? new Date(prev.paymentDate) : null,
            baseSalary: prev.baseSalary,
            allowances: prev.allowances,
            deductions: prev.deductions,
            netPay: prev.netPay,
          },
        });
      }
    }

    // ----------------------------------------------------
    // 8. PRODUCT ROLLBACK
    // ----------------------------------------------------
    else if (entityName === "Product") {
      if (action === "CREATE") {
        await tx.product.delete({ where: { id: entityId } });
      } else if (beforeState) {
        const prev = JSON.parse(beforeState);
        await tx.product.update({
          where: { id: entityId },
          data: {
            sku: prev.sku,
            name: prev.name,
            category: prev.category,
            unit: prev.unit,
            reorderLevel: prev.reorderLevel,
            averageCost: prev.averageCost,
            salesPrice: prev.salesPrice,
            onHandQty: prev.onHandQty,
          },
        });
      }
    }

    // ----------------------------------------------------
    // 9. COMPLAINT ROLLBACK
    // ----------------------------------------------------
    else if (entityName === "Complaint") {
      if (action === "CREATE") {
        await tx.complaintTimeline.deleteMany({ where: { complaintId: entityId } });
        await tx.attachment.deleteMany({ where: { complaintId: entityId } });
        await tx.complaint.delete({ where: { id: entityId } });
      } else if (beforeState) {
        const prev = JSON.parse(beforeState);
        await tx.complaint.update({
          where: { id: entityId },
          data: {
            status: prev.status,
            remarks: prev.remarks,
            assignedTechnicianId: prev.assignedTechnicianId,
            amount: prev.amount,
            amountStatus: prev.amountStatus,
            description: prev.description,
          },
        });
      }
    }

    // ----------------------------------------------------
    // 10. VENDOR ROLLBACK
    // ----------------------------------------------------
    else if (entityName === "Vendor") {
      if (action === "CREATE") {
        await tx.vendor.delete({ where: { id: entityId } });
      } else if (beforeState) {
        const prev = JSON.parse(beforeState);
        await tx.vendor.update({
          where: { id: entityId },
          data: {
            name: prev.name,
            contactPerson: prev.contactPerson,
            phone: prev.phone,
            email: prev.email,
            address: prev.address,
            paymentTerms: prev.paymentTerms,
          },
        });
      }
    }

    // ----------------------------------------------------
    // GENERIC FALLBACK FOR OTHER MODELS
    // ----------------------------------------------------
    else {
      const modelName = entityName.charAt(0).toLowerCase() + entityName.slice(1);
      const model = (tx as any)[modelName];
      if (!model) {
        throw new Error(`Unsupported model rollback for: ${entityName}`);
      }

      if (action === "CREATE") {
        await model.delete({ where: { id: entityId } });
      } else if (beforeState) {
        const prev = JSON.parse(beforeState);
        const cleanData: any = {};
        for (const k of Object.keys(prev)) {
          if (!["createdAt", "updatedAt", "id", "lineItems", "attachments", "timelines"].includes(k)) {
            cleanData[k] = prev[k];
          }
        }
        await model.update({ where: { id: entityId }, data: cleanData });
      }
    }

    // Mark original snapshot as rolled back
    await tx.auditSnapshot.update({
      where: { id: snapshotId },
      data: { isRolledBack: true },
    });

    // Record the rollback as an audit event
    await tx.auditSnapshot.create({
      data: {
        entityName: snapshot.entityName,
        entityId: snapshot.entityId,
        action: "ROLLBACK",
        actorId: actor.id || "system",
        actorEmail: actor.email || "system@erp.local",
        beforeState: snapshot.afterState,
        afterState: snapshot.beforeState,
        diff: JSON.stringify({ rollbackFromSnapshotId: snapshotId }),
      },
    });

    return {
      success: true,
      message: `Successfully rolled back ${snapshot.entityName} (${snapshot.entityId}) and restored inventory & financial balances.`,
    };
  });
}
