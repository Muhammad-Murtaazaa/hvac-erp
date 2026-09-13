import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry, recordStockMovement } from "@/lib/ledger";
import { postJournalEntry } from "@/lib/journal";
import { recordAuditSnapshot } from "@/lib/audit";
import { parseInvoiceMetadata } from "@/lib/invoiceHelper";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const returns = await prisma.return.findMany({
    include: {
      invoice: true,
      lineItems: {
        include: {
          product: true,
        },
      },
      refunds: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ returns });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { invoiceId, lineItems, reason } = await req.json(); // lineItems = Array of { invoiceLineItemId, quantity, refundPrice }

    const targetInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!targetInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const customerReturn = await prisma.$transaction(async (tx) => {
      const lastRet = await tx.return.findFirst({
        orderBy: { createdAt: "desc" },
        select: { returnNumber: true },
      });

      let nextNum = 10001;
      if (lastRet && lastRet.returnNumber) {
        const match = lastRet.returnNumber.match(/RET-(\d+)/);
        if (match && match[1]) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      let returnNumber = `RET-${nextNum}`;
      while (await tx.return.findUnique({ where: { returnNumber } })) {
        nextNum++;
        returnNumber = `RET-${nextNum}`;
      }

      // Create Return Header
      const createdReturn = await tx.return.create({
        data: {
          returnNumber,
          invoiceId,
          status: "PENDING",
          reason: reason || "Customer return",
          totalAmount: 0.00, // Will update
        },
      });

      let totalReturnTaxable = 0;
      let totalCogsToReverse = 0;

      for (const item of lineItems) {
        const qtyToReturn = parseInt(item.quantity);
        const refundRate = Number(item.refundPrice);
        const invoiceLineItemId = item.invoiceLineItemId;

        if (isNaN(qtyToReturn) || qtyToReturn <= 0) {
          throw new Error(`Invalid return quantity`);
        }

        // 1. Fetch Invoice Line Item to check purchased quantity
        const invLine = await tx.invoiceLineItem.findUnique({
          where: { id: invoiceLineItemId },
          include: {
            invoice: true,
          },
        });

        if (!invLine || invLine.invoiceId !== invoiceId) {
          throw new Error(`Linked invoice line item not found or invoice ID mismatch`);
        }

        // 2. Calculate cumulative prior returned quantity
        const priorReturns = await tx.returnLineItem.aggregate({
          where: { invoiceLineItemId },
          _sum: { quantity: true },
        });

        const previouslyReturned = priorReturns._sum.quantity || 0;
        const remainingReturnable = invLine.quantity - previouslyReturned;

        if (qtyToReturn > remainingReturnable) {
          throw new Error(
            `Cannot return ${qtyToReturn} units. Only ${remainingReturnable} units are returnable on this invoice line item.`
          );
        }

        const lineRefund = qtyToReturn * refundRate;
        totalReturnTaxable += lineRefund;

        // 3. Process stock adjustment if it is a catalog item
        if (invLine.productId) {
          const product = await tx.product.findUnique({ where: { id: invLine.productId } });
          if (!product) throw new Error("Catalog product not found");

          // Customer returns increase stock
          await recordStockMovement(tx, {
            productId: invLine.productId,
            type: "RETURN",
            quantity: qtyToReturn,
            referenceDoc: returnNumber,
          });

          // Add to COGS reversal using current average cost
          totalCogsToReverse += qtyToReturn * Number(product.averageCost);
        }

        // 4. Create Return Line Item record
        await tx.returnLineItem.create({
          data: {
            returnId: createdReturn.id,
            invoiceLineItemId,
            productId: invLine.productId,
            quantity: qtyToReturn,
            refundPrice: refundRate,
          },
        });
      }

      // Calculate GST tax reversal if invoice was GST
      const invMeta = parseInvoiceMetadata(targetInvoice.notes, targetInvoice);
      const isGst = targetInvoice.isGst !== false && invMeta.isGst;
      const taxRate = invMeta.taxRate || 18;
      const totalReturnTax = isGst ? Math.round(totalReturnTaxable * (taxRate / 100)) : 0;
      const totalReturnAmount = totalReturnTaxable + totalReturnTax;

      // 5. General Ledger Reversing Journal entries
      // Debit Sales Revenue / Credit Accounts Receivable (Trade Debtors)
      await recordLedgerEntry(tx, {
        description: `Sales revenue reversal for return ${returnNumber} against Invoice ${targetInvoice.invoiceNumber}`,
        debitAccount: "Sales Revenue",
        creditAccount: "Accounts Receivable (Trade Debtors)",
        amount: totalReturnTaxable,
        referenceType: "RETURN",
        referenceId: createdReturn.id,
        partyType: "CUSTOMER",
        partyId: targetInvoice.customerId,
        partyName: targetInvoice.clientName,
        voucherType: "CN",
        voucherNumber: returnNumber,
      });

      if (totalReturnTax > 0) {
        // Debit Sales Tax Payable / Credit Accounts Receivable (Trade Debtors)
        await recordLedgerEntry(tx, {
          description: `Sales tax reversal for return ${returnNumber} against Invoice ${targetInvoice.invoiceNumber}`,
          debitAccount: "Sales Tax Payable",
          creditAccount: "Accounts Receivable (Trade Debtors)",
          amount: totalReturnTax,
          referenceType: "RETURN",
          referenceId: createdReturn.id,
          partyType: "CUSTOMER",
          partyId: targetInvoice.customerId,
          partyName: targetInvoice.clientName,
          voucherType: "CN",
          voucherNumber: returnNumber,
        });
      }

      // Native Double-Entry Journal: Revenue & Tax Reversal
      await postJournalEntry(tx, {
        entryDate: new Date(),
        narration: `Sales return ${returnNumber} reversal against Invoice ${targetInvoice.invoiceNumber}`,
        sourceType: "RETURN",
        sourceId: createdReturn.id,
        idempotencyKey: `RETURN:${createdReturn.id}:revenue-reversal`,
        lines: [
          {
            accountName: "Sales Revenue",
            partyId: null,
            debit: totalReturnTaxable,
            credit: 0,
          },
          ...(totalReturnTax > 0
            ? [
                {
                  accountName: "Sales Tax Payable",
                  partyId: null,
                  debit: totalReturnTax,
                  credit: 0,
                },
              ]
            : []),
          {
            accountName: "Accounts Receivable (Trade Debtors)",
            partyId: targetInvoice.customerId,
            debit: 0,
            credit: totalReturnAmount,
          },
        ],
      });

      // Debit Inventory Asset / Credit COGS (reversing COGS for catalog items)
      if (totalCogsToReverse > 0) {
        await recordLedgerEntry(tx, {
          description: `COGS reversal for customer return ${returnNumber}`,
          debitAccount: "Inventory Asset",
          creditAccount: "Cost of Goods Sold",
          amount: totalCogsToReverse,
          referenceType: "RETURN",
          referenceId: createdReturn.id,
          partyType: "GENERAL",
          partyId: null,
          partyName: null,
          voucherType: "CN",
          voucherNumber: returnNumber,
        });

        // Native Double-Entry Journal: COGS Reversal
        await postJournalEntry(tx, {
          entryDate: new Date(),
          narration: `COGS reversal for customer return ${returnNumber}`,
          sourceType: "RETURN",
          sourceId: createdReturn.id,
          idempotencyKey: `RETURN:${createdReturn.id}:cogs-reversal`,
          lines: [
            {
              accountName: "Inventory Asset",
              partyId: null,
              debit: totalCogsToReverse,
              credit: 0,
            },
            {
              accountName: "Cost of Goods Sold",
              partyId: null,
              debit: 0,
              credit: totalCogsToReverse,
            },
          ],
        });
      }

      // 6. Update return totals and mark completed
      return await tx.return.update({
        where: { id: createdReturn.id },
        data: {
          totalAmount: totalReturnAmount,
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
      entityName: "Return",
      entityId: customerReturn.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: customerReturn,
    });

    return NextResponse.json({ customerReturn });
  } catch (error: any) {
    console.error("[Customer Return POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
