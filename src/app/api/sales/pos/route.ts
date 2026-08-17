import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry, recordStockMovement } from "@/lib/ledger";
import { recordAuditSnapshot } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { clientName, clientPhone, lineItems, paymentMethod } = await req.json(); // lineItems = Array of { productId, quantity, salesPrice }

    if (!lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Cart line items are required" }, { status: 400 });
    }

    const customerName = clientName || "Walk-in Customer";
    const payMethod = paymentMethod || "CASH";

    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${10001 + count}`;

    const invoice = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      let totalCogs = 0;

      const lineItemsWithInfo = [];
      for (const item of lineItems) {
        const qty = parseInt(item.quantity);
        const price = Number(item.salesPrice);
        const productId = item.productId;

        if (isNaN(qty) || qty <= 0) throw new Error("Invalid checkout quantity");
        if (isNaN(price) || price < 0) throw new Error("Invalid checkout price");
        if (!productId) throw new Error("POS mode requires valid catalog products");

        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error("Product not found");

        if (product.onHandQty < qty) {
          throw new Error(`Insufficient stock for ${product.sku}. Available: ${product.onHandQty}, Requested: ${qty}`);
        }

        const lineTotal = qty * price;
        totalAmount += lineTotal;

        const lineCogs = qty * Number(product.averageCost);
        totalCogs += lineCogs;

        lineItemsWithInfo.push({
          productId,
          quantity: qty,
          salesPrice: price,
          cogs: lineCogs,
        });
      }

      // 1. Create Invoice with status PAID
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientName: customerName,
          clientPhone: clientPhone || null,
          status: "PAID",
          totalAmount,
          amountPaid: totalAmount,
          date: new Date(),
          lineItems: {
            create: lineItemsWithInfo.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              salesPrice: l.salesPrice,
            })),
          },
        },
        include: {
          lineItems: true,
        },
      });

      // 2. Decrement stock and create StockLedger log
      for (const line of lineItemsWithInfo) {
        await recordStockMovement(tx, {
          productId: line.productId,
          type: "SALE",
          quantity: -line.quantity,
          referenceDoc: invoiceNumber,
        });
      }

      // 3. Ledger Entries: Revenue
      // Debit Accounts Receivable / Credit Sales Revenue
      await recordLedgerEntry(tx, {
        description: `POS sale Revenue (${invoiceNumber})`,
        debitAccount: "Accounts Receivable",
        creditAccount: "Sales Revenue",
        amount: totalAmount,
        referenceType: "INVOICE",
        referenceId: createdInvoice.id,
      });

      // 4. Ledger Entries: COGS
      // Debit COGS / Credit Inventory Asset
      if (totalCogs > 0) {
        await recordLedgerEntry(tx, {
          description: `POS sale COGS release (${invoiceNumber})`,
          debitAccount: "Cost of Goods Sold",
          creditAccount: "Inventory Asset",
          amount: totalCogs,
          referenceType: "INVOICE",
          referenceId: createdInvoice.id,
        });
      }

      // 5. Create Payment record (fully paid)
      await tx.payment.create({
        data: {
          invoiceId: createdInvoice.id,
          amountPaid: totalAmount,
          method: payMethod,
        },
      });

      // 6. Ledger Entries: Payment collection
      // Debit Cash/Bank / Credit Accounts Receivable
      await recordLedgerEntry(tx, {
        description: `POS payment received against Invoice ${invoiceNumber} via ${payMethod}`,
        debitAccount: "Cash/Bank",
        creditAccount: "Accounts Receivable",
        amount: totalAmount,
        referenceType: "INVOICE",
        referenceId: createdInvoice.id,
      });

      return createdInvoice;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Invoice",
      entityId: invoice.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: invoice,
    });

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error("[POS Checkout API] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
