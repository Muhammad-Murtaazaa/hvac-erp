import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { recordLedgerEntry } from "@/lib/ledger";
import { postJournalEntry, mapPaymentMethodToAccount } from "@/lib/journal";
import { recordAuditSnapshot } from "@/lib/audit";
import { formatInvoiceNotesPayload, parseInvoiceMetadata } from "@/lib/invoiceHelper";
import { parseDateForStorage } from "@/lib/dateUtils";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        deliveryOrder: true,
        payments: true,
        complaint: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      customerId: inputCustomerId,
      clientName,
      clientPhone,
      clientAddress,
      site,
      date,
      lineItems,
      complaintId,
      notes,
      subjectHeading,
      subjectDescription,
      isGst,
      postingOption,
      discountType: reqDiscountType,
      discountPercent: reqDiscountPercent,
      discountAmount: reqDiscountAmount,
      discount: reqDiscount,
      taxRate: reqTaxRate,
      amountReceived: reqAmountReceived,
      paymentMethod: reqPaymentMethod,
    } = body;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        lineItems: true,
        payments: true,
        complaint: true,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const finalClientName = (clientName || "").trim();
    const finalClientPhone = (clientPhone || "").trim();
    const finalClientAddress = (clientAddress || "").trim();

    if (!finalClientName || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Client details and billing line items are required" }, { status: 400 });
    }

    const updatedInvoice = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Resolve or create Customer profile strictly by entity/company name
      let resolvedCustomerId = inputCustomerId || null;
      if (!resolvedCustomerId && finalClientName) {
        const existingCust = await tx.customer.findFirst({
          where: { name: { equals: finalClientName, mode: "insensitive" } },
        });

        if (existingCust) {
          resolvedCustomerId = existingCust.id;
        } else {
          try {
            const newCust = await tx.customer.create({
              data: {
                name: finalClientName,
                phone: finalClientPhone || `0300-${Math.floor(1000000 + Math.random() * 9000000)}`,
                address: finalClientAddress || null,
              },
            });
            resolvedCustomerId = newCust.id;
          } catch {
            // Handle unique phone collision if shared with sister company
            try {
              const uniquePhone = `${finalClientPhone || "0300-0000000"}-${Math.floor(100 + Math.random() * 900)}`;
              const newCust = await tx.customer.create({
                data: {
                  name: finalClientName,
                  phone: uniquePhone,
                  address: finalClientAddress || null,
                },
              });
              resolvedCustomerId = newCust.id;
            } catch {
              resolvedCustomerId = null;
            }
          }
        }
      }

      // 2. Process Line Items and Calculate Totals & COGS
      let subtotalAmount = 0;
      let totalCogs = 0;
      const lineItemsWithInfo = [];

      for (const item of lineItems) {
        const qty = parseInt(item.quantity);
        const price = Number(item.salesPrice);
        const productId = item.productId || null;

        if (isNaN(qty) || qty <= 0) throw new Error(`Invalid billing quantity`);
        if (isNaN(price) || price < 0) throw new Error(`Invalid billing rate`);

        let productInfo = null;
        if (productId) {
          productInfo = await tx.product.findUnique({ where: { id: productId } });
          if (!productInfo) throw new Error(`Product not found for line item`);
        }

        const lineTotal = Math.round(qty * price);
        subtotalAmount += lineTotal;

        let lineCogs = 0;
        if (productInfo) {
          lineCogs = Math.round(qty * Number(productInfo.averageCost));
          totalCogs += lineCogs;
        }

        let extraFieldsData: any = {};
        if (item.extraFields) {
          try {
            extraFieldsData = typeof item.extraFields === "string" ? JSON.parse(item.extraFields) : { ...item.extraFields };
          } catch (e) {
            extraFieldsData = {};
          }
        }
        if (item.unit) {
          extraFieldsData.unit = item.unit;
        }

        lineItemsWithInfo.push({
          productId,
          description: item.description || null,
          quantity: qty,
          salesPrice: Math.round(price),
          cogs: lineCogs,
          extraFields: Object.keys(extraFieldsData).length > 0 ? JSON.stringify(extraFieldsData) : null,
        });
      }

      subtotalAmount = Math.round(subtotalAmount);

      // 3. Calculate Discounts & GST Sales Tax
      const discountType: "FIXED" | "PERCENTAGE" = reqDiscountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
      const discountPercent = Number(reqDiscountPercent || 0);
      let discountAmount = 0;
      if (discountType === "PERCENTAGE" && discountPercent > 0 && subtotalAmount > 0) {
        discountAmount = Math.round(subtotalAmount * (discountPercent / 100));
      } else {
        discountAmount = Math.round(Number(reqDiscountAmount ?? reqDiscount ?? 0));
      }
      discountAmount = Math.max(0, Math.min(discountAmount, subtotalAmount));
      const taxableAmount = Math.max(0, subtotalAmount - discountAmount);

      let salesTaxRate = 18;
      if (reqTaxRate !== undefined && reqTaxRate !== null && !isNaN(Number(reqTaxRate))) {
        salesTaxRate = Number(reqTaxRate);
      } else {
        const taxSetting = await tx.systemSetting.findUnique({
          where: { key: "salesTaxRate" },
        });
        salesTaxRate = taxSetting ? Number(taxSetting.value) : 18;
      }

      const isGstEnabled = isGst !== false;
      const taxAmount = isGstEnabled ? Math.round(taxableAmount * (salesTaxRate / 100)) : 0;
      const finalTotalAmount = Math.round(taxableAmount + taxAmount);

      // 4. Format notes payload with updated metadata
      const formattedNotes = formatInvoiceNotesPayload({
        userNotes: notes || "",
        isGst: isGstEnabled,
        taxRate: salesTaxRate,
        taxAmount,
        discountType,
        discountPercent,
        discountAmount,
        subtotalAmount,
        totalAmount: finalTotalAmount,
        site: site || body.site || "",
      });

      // 5. Calculate Status & Synchronize Payments
      const existingPayments = existingInvoice.payments || [];
      const currentAmountPaid = existingPayments.reduce(
        (acc, p) => acc + Number(p.amountPaid || 0),
        0
      );

      let finalAmountPaid = 0;
      const pMethod = reqPaymentMethod || existingPayments[0]?.method || "CASH";

      if (reqAmountReceived !== undefined) {
        finalAmountPaid = Math.max(0, Math.min(finalTotalAmount, Number(reqAmountReceived)));
        if (finalAmountPaid > 0) {
          if (existingPayments.length > 0) {
            await tx.payment.update({
              where: { id: existingPayments[0].id },
              data: { amountPaid: finalAmountPaid, method: pMethod },
            });
            if (existingPayments.length > 1) {
              const extraIds = existingPayments.slice(1).map((p) => p.id);
              await tx.payment.deleteMany({ where: { id: { in: extraIds } } });
            }
          } else {
            await tx.payment.create({
              data: {
                invoiceId: existingInvoice.id,
                amountPaid: finalAmountPaid,
                method: pMethod,
              },
            });
          }
        } else {
          if (existingPayments.length > 0) {
            await tx.payment.deleteMany({ where: { invoiceId: existingInvoice.id } });
          }
        }
      } else {
        const wasFullyPaid =
          existingInvoice.status === "PAID" ||
          (currentAmountPaid >= Number(existingInvoice.totalAmount) && Number(existingInvoice.totalAmount) > 0);

        if (wasFullyPaid || (currentAmountPaid > finalTotalAmount && finalTotalAmount >= 0)) {
          finalAmountPaid = finalTotalAmount;
          if (existingPayments.length === 1) {
            await tx.payment.update({
              where: { id: existingPayments[0].id },
              data: { amountPaid: finalTotalAmount },
            });
          } else if (existingPayments.length > 1) {
            let remainingToDistribute = finalTotalAmount;
            for (let i = 0; i < existingPayments.length; i++) {
              const p = existingPayments[i];
              if (i === existingPayments.length - 1) {
                await tx.payment.update({
                  where: { id: p.id },
                  data: { amountPaid: Math.max(0, remainingToDistribute) },
                });
              } else {
                const allocated = Math.min(Number(p.amountPaid), remainingToDistribute);
                await tx.payment.update({
                  where: { id: p.id },
                  data: { amountPaid: allocated },
                });
                remainingToDistribute -= allocated;
              }
            }
          }
        } else {
          finalAmountPaid = currentAmountPaid;
        }
      }

      let invoiceStatus = "UNPAID";
      if (finalAmountPaid >= finalTotalAmount && finalTotalAmount > 0) {
        invoiceStatus = "PAID";
      } else if (finalAmountPaid > 0) {
        invoiceStatus = "PARTIALLY_PAID";
      }

      // 6. Delete old line items and recreate updated ones
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId: existingInvoice.id },
      });

      const effectiveComplaintId = complaintId !== undefined ? complaintId : existingInvoice.complaintId;
      const invoiceDate = date ? parseDateForStorage(date) : existingInvoice.date;

      const invoiceUpdated = await tx.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          customerId: resolvedCustomerId || null,
          clientName: finalClientName,
          clientPhone: finalClientPhone || null,
          clientAddress: finalClientAddress || null,
          date: invoiceDate,
          status: invoiceStatus,
          totalAmount: finalTotalAmount,
          amountPaid: finalAmountPaid,
          notes: formattedNotes,
          subjectHeading: subjectHeading || null,
          subjectDescription: subjectDescription || null,
          isGst: isGstEnabled,
          complaintId: effectiveComplaintId || null,
          lineItems: {
            create: lineItemsWithInfo.map((l) => ({
              productId: l.productId,
              description: l.description,
              quantity: l.quantity,
              salesPrice: Math.round(l.salesPrice),
              extraFields: l.extraFields,
            })),
          },
        },
        include: {
          lineItems: {
            include: {
              product: true,
            },
          },
          complaint: true,
          payments: true,
          deliveryOrder: true,
        },
      });

      // 7. Synchronize linked complaint if present
      if (effectiveComplaintId) {
        const comp = await tx.complaint.findUnique({ where: { id: effectiveComplaintId } });
        if (comp) {
          await tx.complaint.update({
            where: { id: effectiveComplaintId },
            data: {
              amount: finalTotalAmount,
              amountStatus: invoiceStatus,
              customerId: resolvedCustomerId || comp.customerId,
            },
          });

          await tx.complaintTimeline.create({
            data: {
              complaintId: effectiveComplaintId,
              changedById: session.id,
              fromStatus: comp.status,
              toStatus: comp.status,
              remarks: `Billing Invoice ${existingInvoice.invoiceNumber} updated (PKR ${finalTotalAmount.toLocaleString()}).`,
            },
          });
        }
      }

      // 8. Synchronize Financial Ledger & Journal Entries (NO double entries!)
      // Remove previous invoice revenue, tax, and cogs ledger entries so we can update them in-place
      await tx.ledgerEntry.deleteMany({
        where: {
          OR: [
            { referenceType: "INVOICE", referenceId: existingInvoice.id },
            { voucherNumber: existingInvoice.invoiceNumber, referenceType: "INVOICE" },
            { voucherNumber: existingInvoice.invoiceNumber, voucherType: { in: ["INV", "COGS"] } },
          ],
        },
      });

      // Remove previous double-entry journal entries for invoice revenue and cogs
      await tx.journalEntry.deleteMany({
        where: {
          sourceType: "INVOICE",
          sourceId: existingInvoice.id,
          idempotencyKey: {
            in: [
              `INVOICE:${existingInvoice.id}:revenue`,
              `INVOICE:${existingInvoice.id}:cogs`,
            ],
          },
        },
      });

      // Posting option: "CUSTOMER_LEDGER" | "GENERAL_LEDGER" | "NO_LEDGER"
      const selectedPosting = postingOption || "CUSTOMER_LEDGER";
      const isPartyPosting = selectedPosting === "CUSTOMER_LEDGER";
      const isNoLedger = selectedPosting === "NO_LEDGER";

      if (!isNoLedger) {
        // Customer / General Ledger Revenue Entry (Unified Net Total Amount)
        await recordLedgerEntry(tx, {
          entryDate: invoiceDate,
          description: `Revenue for Invoice ${existingInvoice.invoiceNumber} issued to ${finalClientName}${!isPartyPosting ? " (GL Only)" : ""}`,
          debitAccount: "Accounts Receivable (Trade Debtors)",
          creditAccount: effectiveComplaintId ? "Service & Maintenance Income" : "Sales Revenue",
          amount: finalTotalAmount,
          referenceType: "INVOICE",
          referenceId: existingInvoice.id,
          partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
          partyId: isPartyPosting ? resolvedCustomerId : null,
          partyName: isPartyPosting ? finalClientName : null,
          voucherType: "INV",
          voucherNumber: existingInvoice.invoiceNumber,
        });

        // Native Double-Entry Journal: Revenue & Tax
        const revenueLines = [
          {
            accountName: "Accounts Receivable (Trade Debtors)",
            partyId: isPartyPosting ? resolvedCustomerId : null,
            debit: finalTotalAmount,
            credit: 0,
          },
          {
            accountName: effectiveComplaintId ? "Service & Maintenance Income" : "Sales Revenue",
            partyId: null,
            debit: 0,
            credit: taxableAmount,
          },
        ];
        if (taxAmount > 0) {
          revenueLines.push({
            accountName: "Sales Tax Payable",
            partyId: null,
            debit: 0,
            credit: taxAmount,
          });
        }

        await postJournalEntry(tx, {
          entryDate: invoiceDate,
          narration: `Revenue for Invoice ${existingInvoice.invoiceNumber} issued to ${finalClientName}${!isPartyPosting ? " (GL Only)" : ""}`,
          sourceType: "INVOICE",
          sourceId: existingInvoice.id,
          idempotencyKey: `INVOICE:${existingInvoice.id}:revenue`,
          lines: revenueLines,
        });

        // COGS Entries (Internal Inventory movement - never attached to customer account)
        if (totalCogs > 0) {
          await recordLedgerEntry(tx, {
            entryDate: invoiceDate,
            description: `COGS release for Invoice ${existingInvoice.invoiceNumber}`,
            debitAccount: "Cost of Goods Sold",
            creditAccount: "Inventory Asset",
            amount: totalCogs,
            referenceType: "INVOICE",
            referenceId: existingInvoice.id,
            partyType: "GENERAL",
            partyId: null,
            partyName: null,
            voucherType: "COGS",
            voucherNumber: existingInvoice.invoiceNumber,
          });

          await postJournalEntry(tx, {
            entryDate: invoiceDate,
            narration: `COGS release for Invoice ${existingInvoice.invoiceNumber}`,
            sourceType: "INVOICE",
            sourceId: existingInvoice.id,
            idempotencyKey: `INVOICE:${existingInvoice.id}:cogs`,
            lines: [
              {
                accountName: "Cost of Goods Sold",
                partyId: null,
                debit: totalCogs,
                credit: 0,
              },
              {
                accountName: "Inventory Asset",
                partyId: null,
                debit: 0,
                credit: totalCogs,
              },
            ],
          });
        }

        // Sync payment vouchers & journals
        const isBank = pMethod === "BANK" || pMethod === "BANK_TRANSFER" || pMethod === "CHEQUE" || pMethod === "ONLINE";
        const liquidAcc = isBank ? "Bank Account (Meezan Bank)" : "Cash in Hand";

        if (finalAmountPaid > 0) {
          // Check for existing payment ledger entries
          const existingPaymentLedgers = await tx.ledgerEntry.findMany({
            where: {
              OR: [
                { referenceType: "INVOICE", referenceId: existingInvoice.id, voucherType: { in: ["CRV", "BRV"] } },
                { voucherNumber: existingInvoice.invoiceNumber, voucherType: { in: ["CRV", "BRV"] } },
              ],
            },
          });

          if (existingPaymentLedgers.length > 0) {
            // Update existing entry in-place without creating duplicate rows
            await tx.ledgerEntry.updateMany({
              where: {
                id: { in: existingPaymentLedgers.map((l) => l.id) },
              },
              data: {
                entryDate: invoiceDate,
                description: `Payment received against Invoice ${existingInvoice.invoiceNumber} via ${pMethod}${!isPartyPosting ? " (GL Only)" : ""}`,
                debitAccount: liquidAcc,
                creditAccount: "Accounts Receivable (Trade Debtors)",
                amount: finalAmountPaid,
                partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
                partyId: isPartyPosting ? resolvedCustomerId : null,
                partyName: isPartyPosting ? finalClientName : null,
                voucherType: isBank ? "BRV" : "CRV",
                paymentMethod: pMethod,
              },
            });
          } else {
            // Record payment ledger entry if none existed before
            await recordLedgerEntry(tx, {
              entryDate: invoiceDate,
              description: `Payment received against Invoice ${existingInvoice.invoiceNumber} via ${pMethod}${!isPartyPosting ? " (GL Only)" : ""}`,
              debitAccount: liquidAcc,
              creditAccount: "Accounts Receivable (Trade Debtors)",
              amount: finalAmountPaid,
              referenceType: "INVOICE",
              referenceId: existingInvoice.id,
              partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
              partyId: isPartyPosting ? resolvedCustomerId : null,
              partyName: isPartyPosting ? finalClientName : null,
              voucherType: isBank ? "BRV" : "CRV",
              voucherNumber: existingInvoice.invoiceNumber,
              paymentMethod: pMethod,
            });
          }

          // Double-Entry Journal for Payments
          const paymentJournals = await tx.journalEntry.findMany({
            where: {
              OR: [
                { sourceId: existingInvoice.id, sourceType: "INVOICE" },
                { idempotencyKey: { startsWith: `INVOICE:${existingInvoice.id}:payment` } },
                ...existingPayments.map((p) => ({ sourceId: p.id })),
              ],
            },
            include: { lines: true },
          });

          if (paymentJournals.length > 0) {
            for (const pj of paymentJournals) {
              for (const line of pj.lines) {
                await tx.journalLine.update({
                  where: { id: line.id },
                  data: {
                    debit: Number(line.debit) > 0 ? finalAmountPaid : 0,
                    credit: Number(line.credit) > 0 ? finalAmountPaid : 0,
                    partyId: isPartyPosting && line.partyId ? resolvedCustomerId : line.partyId,
                  },
                });
              }
            }
          } else {
            await postJournalEntry(tx, {
              entryDate: invoiceDate,
              narration: `Payment received against Invoice ${existingInvoice.invoiceNumber} via ${pMethod}${!isPartyPosting ? " (GL Only)" : ""}`,
              sourceType: "INVOICE",
              sourceId: existingInvoice.id,
              idempotencyKey: `INVOICE:${existingInvoice.id}:payment:default`,
              lines: [
                {
                  accountName: mapPaymentMethodToAccount(pMethod),
                  partyId: null,
                  debit: finalAmountPaid,
                  credit: 0,
                },
                {
                  accountName: "Accounts Receivable (Trade Debtors)",
                  partyId: isPartyPosting ? resolvedCustomerId : null,
                  debit: 0,
                  credit: finalAmountPaid,
                },
              ],
            });
          }
        } else {
          // finalAmountPaid is 0: remove payment ledger entries and payment journals
          await tx.ledgerEntry.deleteMany({
            where: {
              OR: [
                { referenceType: "INVOICE", referenceId: existingInvoice.id, voucherType: { in: ["CRV", "BRV"] } },
                { voucherNumber: existingInvoice.invoiceNumber, voucherType: { in: ["CRV", "BRV"] } },
              ],
            },
          });

          const paymentJournals = await tx.journalEntry.findMany({
            where: {
              OR: [
                { sourceId: existingInvoice.id, sourceType: "INVOICE" },
                { idempotencyKey: { startsWith: `INVOICE:${existingInvoice.id}:payment` } },
                ...existingPayments.map((p) => ({ sourceId: p.id })),
              ],
            },
            select: { id: true },
          });
          if (paymentJournals.length > 0) {
            const jIds = paymentJournals.map((j) => j.id);
            await tx.journalLine.deleteMany({ where: { journalEntryId: { in: jIds } } });
            await tx.journalEntry.deleteMany({ where: { id: { in: jIds } } });
          }
        }
      }

      return invoiceUpdated;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Invoice",
      entityId: updatedInvoice.id,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      beforeState: existingInvoice,
      afterState: updatedInvoice,
    });

    return NextResponse.json({ invoice: updatedInvoice, success: true });
  } catch (error: any) {
    console.error("[Invoice PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        payments: true,
        returns: true,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (existingInvoice.payments && existingInvoice.payments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete an invoice with recorded payments. Please refund or reverse payments first." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Delete associated ledger entries (revenue, tax, cogs)
      await tx.ledgerEntry.deleteMany({
        where: {
          referenceType: "INVOICE",
          referenceId: existingInvoice.id,
        },
      });

      // 2. Delete associated journal entries
      await tx.journalEntry.deleteMany({
        where: {
          sourceType: "INVOICE",
          sourceId: existingInvoice.id,
        },
      });

      // 3. Delete invoice line items
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId: existingInvoice.id },
      });

      // 4. Delete invoice
      await tx.invoice.delete({
        where: { id: existingInvoice.id },
      });
    });

    await recordAuditSnapshot({
      entityName: "Invoice",
      entityId: existingInvoice.id,
      action: "DELETE",
      actor: { id: session.id, email: session.email },
      beforeState: existingInvoice,
    });

    return NextResponse.json({ success: true, message: "Invoice deleted successfully and ledger entries cleared" });
  } catch (error: any) {
    console.error("[Invoice DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete invoice" }, { status: 500 });
  }
}
