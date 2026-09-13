import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry, recordStockMovement, updateProductAverageCost } from "@/lib/ledger";
import { postJournalEntry } from "@/lib/journal";
import { recordAuditSnapshot } from "@/lib/audit";
import { parsePoMetadata } from "@/lib/poHelper";

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

    // Wrap the entire stock-in + ledger-write in a single database transaction with extended timeout for cloud databases
    const grn = await prisma.$transaction(async (tx) => {
      const lastGRN = await tx.goodsReceivedNote.findFirst({
        orderBy: { receivedAt: "desc" },
        select: { grnNumber: true },
      });

      let nextNum = 10001;
      if (lastGRN && lastGRN.grnNumber) {
        const match = lastGRN.grnNumber.match(/GRN-(\d+)/);
        if (match && match[1]) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      let grnNumber = `GRN-${nextNum}`;
      while (await tx.goodsReceivedNote.findUnique({ where: { grnNumber } })) {
        nextNum++;
        grnNumber = `GRN-${nextNum}`;
      }

      // 1. Create GoodsReceivedNote header
      const createdGRN = await tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          poId,
          receivedById: session.id,
          notes: notes || "",
        },
      });

      // Calculate PO discount and tax parameters using PO metadata
      const poMeta = parsePoMetadata(po.notes, po);
      const poSubtotal = poMeta.subtotalAmount || (po.lineItems || []).reduce(
        (acc: number, l: any) => acc + (Number(l.quantityOrdered) || 0) * (Number(l.unitCost) || 0),
        0
      );
      const poDiscount = poMeta.discountAmount || Number(po.discount || 0);
      const discountRatio = poSubtotal > 0 && poDiscount > 0 ? (poDiscount / poSubtotal) : 0;

      let totalGrnNetValue = 0;
      let totalGrnDiscount = 0;

      // Process each received item
      for (const item of lineItems) {
        const qtyReceived = parseInt(item.quantityReceived);
        const productId = item.productId;

        if (isNaN(qtyReceived) || qtyReceived <= 0) {
          throw new Error(`Invalid quantity received: ${item.quantityReceived}`);
        }

        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error(`Product not found: ${productId}`);

        // Find the original PO line item
        const poLine = item.poLineItemId
          ? po.lineItems.find((l) => l.id === item.poLineItemId)
          : po.lineItems.find((l) => l.productId === productId && l.quantityReceived < l.quantityOrdered) ||
            po.lineItems.find((l) => l.productId === productId);
        if (!poLine) {
          throw new Error(`Product ${product.sku} is not part of this Purchase Order`);
        }

        // Canonical undiscounted base unit cost from the PO
        const rawUnitCost = poLine ? Math.round(Number(poLine.unitCost)) : Math.round(Number(item.unitCost));

        // Calculate line discount and net inventory asset debit
        const lineRawTotal = Math.round(qtyReceived * rawUnitCost);
        const lineDiscount = Math.round(lineRawTotal * discountRatio);
        const lineNetTotal = Math.max(0, lineRawTotal - lineDiscount);
        const effectiveUnitCost = qtyReceived > 0 ? Math.round((lineNetTotal / qtyReceived) * 100) / 100 : rawUnitCost;

        totalGrnNetValue += lineNetTotal;
        totalGrnDiscount += lineDiscount;

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

        // b. Update stock quantity (stock price / averageCost remains unchanged as requested)
        const currentOnHand = product.onHandQty;
        const runningBalance = currentOnHand + qtyReceived;
        const newIncoming = Math.max(0, product.incomingQty - qtyReceived);

        await tx.product.update({
          where: { id: productId },
          data: {
            onHandQty: runningBalance,
            incomingQty: newIncoming,
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
          const totalReceivedSoFar = poLine.quantityReceived + qtyReceived;
          const ordered = poLine.quantityOrdered;

          if (totalReceivedSoFar < ordered) {
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

        // e. Write GRN Line Item with effective unit cost
        await tx.gRNLineItem.create({
          data: {
            grnId: createdGRN.id,
            productId,
            quantityReceived: qtyReceived,
            unitCost: effectiveUnitCost,
            poPendingItemId: linkedPendingId,
          },
        });
      }

      // Calculate GST on received taxable amount if GST enabled
      const taxRate = poMeta.taxRate || 18;
      const totalGrnTax = poMeta.isGst ? Math.round(totalGrnNetValue * (taxRate / 100)) : 0;
      const totalGrnPayable = totalGrnNetValue + totalGrnTax;

      // Post balanced General Ledger & Journal entries for the GRN
      if (totalGrnPayable > 0) {
        // Flat Ledger Entry: Inventory Asset
        await recordLedgerEntry(tx, {
          entryDate: createdGRN.receivedAt || new Date(),
          description: `Stock intake against ${po.poNumber} (${grnNumber}) from ${po.vendor?.name || "Vendor"}${totalGrnDiscount > 0 ? ` (Net of PKR ${totalGrnDiscount.toLocaleString()} discount)` : ""}`,
          debitAccount: "Inventory Asset",
          creditAccount: "Accounts Payable (Trade Creditors)",
          amount: totalGrnNetValue,
          referenceType: "PO_RECEIPT",
          referenceId: createdGRN.id,
          partyType: "VENDOR",
          partyId: po.vendorId,
          partyName: po.vendor?.name || "Vendor",
          voucherType: "GRN",
          voucherNumber: grnNumber,
        });

        // Flat Ledger Entry: Input GST if applicable
        if (totalGrnTax > 0) {
          await recordLedgerEntry(tx, {
            entryDate: createdGRN.receivedAt || new Date(),
            description: `Input Sales Tax (GST) on ${po.poNumber} (${grnNumber})`,
            debitAccount: "Sales Tax Payable",
            creditAccount: "Accounts Payable (Trade Creditors)",
            amount: totalGrnTax,
            referenceType: "PO_RECEIPT",
            referenceId: createdGRN.id,
            partyType: "VENDOR",
            partyId: po.vendorId,
            partyName: po.vendor?.name || "Vendor",
            voucherType: "GRN",
            voucherNumber: grnNumber,
          });
        }

        // Native Double-Entry Journal
        const journalLines: Array<{
          accountName: string;
          partyId: string | null;
          debit: number;
          credit: number;
        }> = [
          {
            accountName: "Inventory Asset",
            partyId: null,
            debit: totalGrnNetValue,
            credit: 0,
          },
        ];

        if (totalGrnTax > 0) {
          journalLines.push({
            accountName: "Sales Tax Payable",
            partyId: null,
            debit: totalGrnTax,
            credit: 0,
          });
        }

        journalLines.push({
          accountName: "Accounts Payable (Trade Creditors)",
          partyId: po.vendorId,
          debit: 0,
          credit: totalGrnPayable,
        });

        await postJournalEntry(tx, {
          entryDate: createdGRN.receivedAt || new Date(),
          narration: `Stock Intake for ${po.poNumber} (${grnNumber}) from ${po.vendor?.name || "Vendor"}`,
          sourceType: "PO_RECEIPT",
          sourceId: createdGRN.id,
          idempotencyKey: `GRN:${createdGRN.id}:intake`,
          lines: journalLines,
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
