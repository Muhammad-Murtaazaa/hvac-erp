import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry, recordStockMovement, updateProductAverageCost } from "@/lib/ledger";
import { postJournalEntry } from "@/lib/journal";
import { recordAuditSnapshot } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { poId, lineItems, notes } = await req.json(); // lineItems = Array of { productId, quantityReceived, unitCost, poPendingItemId? }

    if (!poId || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "PO ID and received line items are required" }, { status: 400 });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        lineItems: true,
        pendingItems: true,
        vendor: true,
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    if (po.status === "DRAFT" || po.status === "CANCELLED" || po.status === "COMPLETED") {
      return NextResponse.json({ error: `Cannot receive items against PO in ${po.status} status` }, { status: 400 });
    }

    const grnCount = await prisma.goodsReceivedNote.count();
    const grnNumber = `GRN-${10001 + grnCount}`;

    // Wrap the entire stock-in + ledger-write in a single database transaction with extended timeout for cloud databases
    const grn = await prisma.$transaction(async (tx) => {
      // 1. Create GoodsReceivedNote header
      const createdGRN = await tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          poId,
          receivedById: session.id,
          notes: notes || "",
        },
      });

      let totalGrnValue = 0;
      // Process each received item
      for (const item of lineItems) {
        const qtyReceived = parseInt(item.quantityReceived);
        const costPerUnit = Math.round(Number(item.unitCost));
        const productId = item.productId;

        if (isNaN(qtyReceived) || qtyReceived <= 0) {
          throw new Error(`Invalid quantity received: ${item.quantityReceived}`);
        }

        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error(`Product not found: ${productId}`);

        // Find the original PO line item (by explicit poLineItemId first, then by pending productId)
        const poLine = item.poLineItemId
          ? po.lineItems.find((l) => l.id === item.poLineItemId)
          : po.lineItems.find((l) => l.productId === productId && l.quantityReceived < l.quantityOrdered) ||
            po.lineItems.find((l) => l.productId === productId);
        if (!poLine) {
          throw new Error(`Product ${product.sku} is not part of this Purchase Order`);
        }

        const remaining = poLine.quantityOrdered - poLine.quantityReceived;
        if (qtyReceived > remaining) {
          throw new Error(`Cannot receive ${qtyReceived} units for SKU ${product.sku}. Only ${remaining} outstanding units remain.`);
        }

        // a. Update PO Line Item quantities
        await tx.pOLineItem.update({
          where: { id: poLine.id },
          data: {
            quantityReceived: {
              increment: qtyReceived,
            },
          },
        });

        // b. Calculate new stock, incoming, and weighted average cost together
        const currentOnHand = product.onHandQty;
        const currentCost = Number(product.averageCost);
        const runningBalance = currentOnHand + qtyReceived;
        const newIncoming = Math.max(0, product.incomingQty - qtyReceived);
        let newCost = currentCost;
        if (runningBalance > 0) {
          newCost = Math.round((currentOnHand * currentCost + qtyReceived * costPerUnit) / runningBalance);
        } else {
          newCost = costPerUnit;
        }

        // Single atomic Product update for stock, incoming, and cost
        await tx.product.update({
          where: { id: productId },
          data: {
            onHandQty: runningBalance,
            incomingQty: newIncoming,
            averageCost: newCost,
          },
        });

        // c. Create StockLedger log
        await tx.stockLedger.create({
          data: {
            productId,
            type: "PO_RECEIPT",
            quantity: qtyReceived,
            referenceDoc: grnNumber,
            runningBalance,
          },
        });

        // d. Handle shortfalls / shortage resolutions
        let linkedPendingId: string | null = null;

        if (item.poPendingItemId) {
          // Case 1: Subsequent receipt resolving an active shortage from Pending Stock view
          const pendingItem = await tx.pOPendingItem.findUnique({
            where: { id: item.poPendingItemId },
          });

          if (!pendingItem) throw new Error(`Pending stock item ${item.poPendingItemId} not found`);

          const outstandingShortage = pendingItem.quantityMissing - pendingItem.quantityResolved;
          if (qtyReceived > outstandingShortage) {
            throw new Error(`Cannot receive ${qtyReceived} units for shortage. Only ${outstandingShortage} outstanding units remain.`);
          }

          const resolved = Math.min(qtyReceived, outstandingShortage);
          const newResolvedTotal = pendingItem.quantityResolved + resolved;
          const isNowResolved = newResolvedTotal >= pendingItem.quantityMissing;

          await tx.pOPendingItem.update({
            where: { id: pendingItem.id },
            data: {
              quantityResolved: newResolvedTotal,
              isResolved: isNowResolved,
            },
          });
          linkedPendingId = pendingItem.id;
        } else {
          // Case 2: Initial receipt from PO screen
          const totalReceivedSoFar = poLine.quantityReceived + qtyReceived;
          const ordered = poLine.quantityOrdered;

          if (totalReceivedSoFar < ordered) {
            // Log shortfall shortage
            const shortfall = ordered - totalReceivedSoFar;
            const newPending = await tx.pOPendingItem.create({
              data: {
                poId,
                productId,
                quantityMissing: shortfall,
                quantityResolved: 0,
                isResolved: false,
              },
            });
            linkedPendingId = newPending.id;
          }
        }

        // e. Double-Entry General Ledger write (Debit Inventory Asset / Credit Accounts Payable)
        const lineTotalAmount = Math.round(qtyReceived * costPerUnit);
        totalGrnValue += lineTotalAmount;

        await recordLedgerEntry(tx, {
          description: `Received ${qtyReceived} units of ${product.sku} against ${po.poNumber} (${grnNumber})`,
          debitAccount: "Inventory Asset",
          creditAccount: "Accounts Payable (Trade Creditors)",
          amount: lineTotalAmount,
          referenceType: "PO_RECEIPT",
          referenceId: createdGRN.id,
          partyType: "VENDOR",
          partyId: po.vendorId,
          partyName: po.vendor?.name || "Vendor",
          voucherType: "GRN",
          voucherNumber: grnNumber,
        });

        // f. Write GRN Line Item
        await tx.gRNLineItem.create({
          data: {
            grnId: createdGRN.id,
            productId,
            quantityReceived: qtyReceived,
            unitCost: costPerUnit,
            poPendingItemId: linkedPendingId,
          },
        });
      }

      // Native Double-Entry Journal: One JournalEntry per GRN receipt
      if (totalGrnValue > 0) {
        await postJournalEntry(tx, {
          entryDate: new Date(),
          narration: `Stock Intake for ${po.poNumber} (${grnNumber}) from ${po.vendor?.name || "Vendor"}`,
          sourceType: "PO_RECEIPT",
          sourceId: createdGRN.id,
          idempotencyKey: `GRN:${createdGRN.id}:intake`,
          lines: [
            {
              accountName: "Inventory Asset",
              partyId: null,
              debit: totalGrnValue,
              credit: 0,
            },
            {
              accountName: "Accounts Payable (Trade Creditors)",
              partyId: po.vendorId,
              debit: 0,
              credit: totalGrnValue,
            },
          ],
        });
      }

      // 2. Recalculate and update PO overall status
      const allPoLines = await tx.pOLineItem.findMany({ where: { poId } });
      const allPendingLines = await tx.pOPendingItem.findMany({ where: { poId } });

      const allReceived = allPoLines.every((l) => l.quantityReceived >= l.quantityOrdered);
      const allShortagesResolved = allPendingLines.every((l) => l.isResolved);

      let finalStatus = "PARTIALLY_RECEIVED";
      if (allReceived && allShortagesResolved) {
        finalStatus = "COMPLETED";
      }

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: finalStatus as any,
        },
      });

      return createdGRN;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "GoodsReceivedNote",
      entityId: grn.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: grn,
    });

    return NextResponse.json({ grn });
  } catch (error: any) {
    console.error("[GRN POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
