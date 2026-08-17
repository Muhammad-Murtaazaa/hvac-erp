import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry, recordStockMovement } from "@/lib/ledger";
import { recordAuditSnapshot } from "@/lib/audit";

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

    const count = await prisma.return.count();
    const returnNumber = `RET-${10001 + count}`;

    const customerReturn = await prisma.$transaction(async (tx) => {
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

      let totalReturnAmount = 0;
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
        totalReturnAmount += lineRefund;

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

      // 5. General Ledger Reversing Journal entries
      // Debit Sales Revenue / Credit Accounts Receivable
      await recordLedgerEntry(tx, {
        description: `Sales revenue reversal for return ${returnNumber} against Invoice ${targetInvoice.invoiceNumber}`,
        debitAccount: "Sales Revenue",
        creditAccount: "Accounts Receivable",
        amount: totalReturnAmount,
        referenceType: "RETURN",
        referenceId: createdReturn.id,
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
