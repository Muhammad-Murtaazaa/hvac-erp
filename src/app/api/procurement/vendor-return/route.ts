import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry, recordStockMovement } from "@/lib/ledger";
import { postJournalEntry } from "@/lib/journal";
import { recordAuditSnapshot } from "@/lib/audit";
import { parsePoMetadata } from "@/lib/poHelper";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendorReturns = await prisma.vendorReturn.findMany({
    include: {
      vendor: true,
      lineItems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ vendorReturns });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { vendorId, lineItems, reason } = await req.json(); // lineItems = Array of { productId, quantity, grnLineItemId }

    if (!vendorId || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Vendor and return items are required" }, { status: 400 });
    }

    const vendorReturn = await prisma.$transaction(async (tx) => {
      const lastVRet = await tx.vendorReturn.findFirst({
        orderBy: { createdAt: "desc" },
        select: { vendorReturnNumber: true },
      });

      let nextNum = 10001;
      if (lastVRet && lastVRet.vendorReturnNumber) {
        const match = lastVRet.vendorReturnNumber.match(/VRET-(\d+)/);
        if (match && match[1]) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      let vendorReturnNumber = `VRET-${nextNum}`;
      while (await tx.vendorReturn.findUnique({ where: { vendorReturnNumber } })) {
        nextNum++;
        vendorReturnNumber = `VRET-${nextNum}`;
      }

      let totalAmount = 0;
      let totalTaxableAmount = 0;
      let totalTaxAmount = 0;

      // Create the Vendor Return header
      const createdReturn = await tx.vendorReturn.create({
        data: {
          vendorReturnNumber,
          vendorId,
          reason: reason || "Defective stock return",
          totalAmount: 0.00, // We will update this after calculating
          date: new Date(),
        },
      });

      for (const item of lineItems) {
        const qtyToReturn = parseInt(item.quantity);
        const productId = item.productId;
        const grnLineItemId = item.grnLineItemId;

        if (isNaN(qtyToReturn) || qtyToReturn <= 0) {
          throw new Error(`Invalid quantity to return: ${item.quantity}`);
        }

        if (!grnLineItemId) {
          throw new Error(`GRN Line Item link is required for validation`);
        }

        // 1. Fetch GRN Line Item to validate received quantity
        const grnLine = await tx.gRNLineItem.findUnique({
          where: { id: grnLineItemId },
          include: {
            goodsReceivedNote: {
              include: {
                purchaseOrder: true,
              },
            },
          },
        });

        if (!grnLine || grnLine.productId !== productId) {
          throw new Error(`Linked GRN line item not found or product SKU mismatch`);
        }

        // 2. Fetch previous vendor returns against this GRN Line Item
        const priorReturns = await tx.vendorReturnLineItem.aggregate({
          where: { grnLineItemId },
          _sum: { quantity: true },
        });

        const previouslyReturned = priorReturns._sum.quantity || 0;
        const remainingReturnable = grnLine.quantityReceived - previouslyReturned;

        if (qtyToReturn > remainingReturnable) {
          throw new Error(
            `Cannot return ${qtyToReturn} units. Only ${remainingReturnable} units are returnable from GRN ${grnLine.goodsReceivedNote.grnNumber}`
          );
        }

        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error("Product not found");

        if (product.onHandQty < qtyToReturn) {
          throw new Error(`Insufficient stock for ${product.sku}. On hand: ${product.onHandQty}, Return: ${qtyToReturn}`);
        }

        // Reconcile PO line item if linked to allow receiving replacement
        if (grnLine.goodsReceivedNote.poId) {
          const poLine = await tx.pOLineItem.findFirst({
            where: {
              poId: grnLine.goodsReceivedNote.poId,
              productId: productId,
            },
          });
          if (poLine && poLine.quantityReceived >= qtyToReturn) {
            await tx.pOLineItem.update({
              where: { id: poLine.id },
              data: {
                quantityReceived: {
                  decrement: qtyToReturn,
                },
              },
            });
          }
        }

        const originalUnitCost = Number(grnLine.unitCost);
        const po = grnLine.goodsReceivedNote.purchaseOrder;
        const poMeta = po ? parsePoMetadata(po.notes, po) : { isGst: false, taxRate: 18 };

        // 3. Decrement inventory and log in StockLedger
        await recordStockMovement(tx, {
          productId,
          type: "VENDOR_RETURN",
          quantity: -qtyToReturn,
          referenceDoc: vendorReturnNumber,
        });

        // 4. Balanced Ledger entries (Debit AP / Credit Inventory Asset & Sales Tax Payable)
        const lineTaxable = Math.round(qtyToReturn * originalUnitCost);
        const lineTax = poMeta.isGst ? Math.round(lineTaxable * ((poMeta.taxRate || 18) / 100)) : 0;
        const lineTotalAP = lineTaxable + lineTax;

        const targetVendor = await tx.vendor.findUnique({ where: { id: vendorId } });

        // Debit Accounts Payable (Trade Creditors) / Credit Inventory Asset
        await recordLedgerEntry(tx, {
          description: `Return ${qtyToReturn} units of ${product.sku} to vendor (${vendorReturnNumber})`,
          debitAccount: "Accounts Payable (Trade Creditors)",
          creditAccount: "Inventory Asset",
          amount: lineTaxable,
          referenceType: "VENDOR_RETURN",
          referenceId: createdReturn.id,
          partyType: "VENDOR",
          partyId: vendorId,
          partyName: targetVendor?.name || "Vendor",
          voucherType: "DN",
          voucherNumber: vendorReturnNumber,
        });

        // Debit Accounts Payable (Trade Creditors) / Credit Sales Tax Payable (GST reversal)
        if (lineTax > 0) {
          await recordLedgerEntry(tx, {
            description: `Sales Tax (GST) reversal on vendor return ${vendorReturnNumber}`,
            debitAccount: "Accounts Payable (Trade Creditors)",
            creditAccount: "Sales Tax Payable",
            amount: lineTax,
            referenceType: "VENDOR_RETURN",
            referenceId: createdReturn.id,
            partyType: "VENDOR",
            partyId: vendorId,
            partyName: targetVendor?.name || "Vendor",
            voucherType: "DN",
            voucherNumber: vendorReturnNumber,
          });
        }

        // 5. Create Return Line Item
        await tx.vendorReturnLineItem.create({
          data: {
            vendorReturnId: createdReturn.id,
            grnLineItemId,
            productId,
            quantity: qtyToReturn,
            unitCost: originalUnitCost,
          },
        });

        totalTaxableAmount += lineTaxable;
        totalTaxAmount += lineTax;
        totalAmount += lineTotalAP;
      }

      // Native Double-Entry Journal: Vendor Return
      if (totalAmount > 0) {
        await postJournalEntry(tx, {
          entryDate: new Date(),
          narration: `Vendor return (${vendorReturnNumber}) to vendor`,
          sourceType: "VENDOR_RETURN",
          sourceId: createdReturn.id,
          idempotencyKey: `VENDOR_RETURN:${createdReturn.id}:debit-memo`,
          lines: [
            {
              accountName: "Accounts Payable (Trade Creditors)",
              partyId: vendorId,
              debit: totalAmount,
              credit: 0,
            },
            {
              accountName: "Inventory Asset",
              partyId: null,
              debit: 0,
              credit: totalTaxableAmount,
            },
            ...(totalTaxAmount > 0
              ? [
                  {
                    accountName: "Sales Tax Payable",
                    partyId: null,
                    debit: 0,
                    credit: totalTaxAmount,
                  },
                ]
              : []),
          ],
        });
      }

      // Update total return amount and complete the return status
      return await tx.vendorReturn.update({
        where: { id: createdReturn.id },
        data: {
          totalAmount,
          status: "COMPLETED",
        },
        include: {
          lineItems: true,
        },
      });
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "VendorReturn",
      entityId: vendorReturn.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: vendorReturn,
    });

    return NextResponse.json({ vendorReturn });
  } catch (error: any) {
    console.error("[Vendor Return POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
