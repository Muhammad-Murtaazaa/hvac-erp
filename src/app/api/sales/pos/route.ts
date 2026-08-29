import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry, recordStockMovement } from "@/lib/ledger";
import { postJournalEntry, mapPaymentMethodToAccount } from "@/lib/journal";
import { recordAuditSnapshot } from "@/lib/audit";
import { parseDateForStorage } from "@/lib/dateUtils";

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { clientName, clientPhone, lineItems, paymentMethod, date } = await req.json(); // lineItems = Array of { productId, quantity, salesPrice }

    if (!lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Cart line items are required" }, { status: 400 });
    }

    const customerName = clientName || "Walk-in Customer";
    const payMethod = paymentMethod || "CASH";

    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Generate unique collision-proof invoice number
      const lastInv = await tx.invoice.findFirst({
        orderBy: { createdAt: "desc" },
        select: { invoiceNumber: true },
      });

      let nextNum = 10001;
      if (lastInv && lastInv.invoiceNumber) {
        const match = lastInv.invoiceNumber.match(/INV-(\d+)/);
        if (match && match[1]) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      let invoiceNumber = `INV-${nextNum}`;
      while (await tx.invoice.findUnique({ where: { invoiceNumber } })) {
        nextNum++;
        invoiceNumber = `INV-${nextNum}`;
      }

      // 2. Resolve customer account if not walk-in
      let resolvedCustomerId: string | null = null;
      if (clientName && clientName.trim() !== "Walk-in Customer") {
        const existingCust = await tx.customer.findFirst({
          where: { name: { equals: clientName.trim(), mode: "insensitive" } },
        });
        if (existingCust) {
          resolvedCustomerId = existingCust.id;
        }
      }

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

      // 3. Create Invoice with status PAID
      const invoiceDate = parseDateForStorage(date || new Date());

      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customer: resolvedCustomerId ? { connect: { id: resolvedCustomerId } } : undefined,
          clientName: customerName,
          clientPhone: clientPhone || null,
          status: "PAID",
          totalAmount,
          amountPaid: totalAmount,
          date: invoiceDate,
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

      // 4. Decrement stock and create StockLedger log
      for (const line of lineItemsWithInfo) {
        await recordStockMovement(tx, {
          productId: line.productId,
          type: "SALE",
          quantity: -line.quantity,
          referenceDoc: invoiceNumber,
        });
      }

      // 5. Ledger Entries: Revenue
      // Debit Accounts Receivable / Credit Sales Revenue
      const isPartyPosting = !!resolvedCustomerId;
      await recordLedgerEntry(tx, {
        entryDate: invoiceDate,
        description: `POS sale Revenue (${invoiceNumber})`,
        debitAccount: "Accounts Receivable (Trade Debtors)",
        creditAccount: "Sales Revenue",
        amount: totalAmount,
        referenceType: "INVOICE",
        referenceId: createdInvoice.id,
        partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
        partyId: resolvedCustomerId,
        partyName: isPartyPosting ? customerName : null,
        voucherType: "INV",
        voucherNumber: invoiceNumber,
      });

      // Native Double-Entry: POS Revenue
      await postJournalEntry(tx, {
        entryDate: invoiceDate,
        narration: `POS sale Revenue (${invoiceNumber})`,
        sourceType: "POS",
        sourceId: createdInvoice.id,
        idempotencyKey: `POS:${createdInvoice.id}:revenue`,
        lines: [
          {
            accountName: "Accounts Receivable (Trade Debtors)",
            partyId: resolvedCustomerId,
            debit: totalAmount,
            credit: 0,
          },
          {
            accountName: "Sales Revenue",
            partyId: null,
            debit: 0,
            credit: totalAmount,
          },
        ],
      });

      // 6. Ledger Entries: COGS
      if (totalCogs > 0) {
        await recordLedgerEntry(tx, {
          entryDate: invoiceDate,
          description: `POS sale COGS release (${invoiceNumber})`,
          debitAccount: "Cost of Goods Sold",
          creditAccount: "Inventory Asset",
          amount: totalCogs,
          referenceType: "INVOICE",
          referenceId: createdInvoice.id,
          partyType: "GENERAL",
          voucherType: "COGS",
          voucherNumber: invoiceNumber,
        });

        // Native Double-Entry: POS COGS
        await postJournalEntry(tx, {
          entryDate: invoiceDate,
          narration: `POS sale COGS release (${invoiceNumber})`,
          sourceType: "POS",
          sourceId: createdInvoice.id,
          idempotencyKey: `POS:${createdInvoice.id}:cogs`,
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

      // 7. Create Payment record (fully paid)
      await tx.payment.create({
        data: {
          invoiceId: createdInvoice.id,
          amountPaid: totalAmount,
          method: payMethod,
        },
      });

      // 8. Ledger Entries: Payment collection
      // Debit Cash/Bank / Credit Accounts Receivable
      const isBank = payMethod === "BANK_TRANSFER" || payMethod === "CHEQUE" || payMethod === "ONLINE" || payMethod === "CARD";
      const liquidAcc = isBank ? "Bank Account (Meezan Bank)" : "Cash in Hand";

      await recordLedgerEntry(tx, {
        entryDate: invoiceDate,
        description: `POS payment received against Invoice ${invoiceNumber} via ${payMethod}`,
        debitAccount: liquidAcc,
        creditAccount: "Accounts Receivable (Trade Debtors)",
        amount: totalAmount,
        referenceType: "INVOICE",
        referenceId: createdInvoice.id,
        partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
        partyId: resolvedCustomerId,
        partyName: isPartyPosting ? customerName : null,
        voucherType: isBank ? "BRV" : "CRV",
        voucherNumber: invoiceNumber,
        paymentMethod: payMethod,
      });

      // Native Double-Entry: POS Payment
      await postJournalEntry(tx, {
        entryDate: invoiceDate,
        narration: `POS payment received against Invoice ${invoiceNumber} via ${payMethod}`,
        sourceType: "POS",
        sourceId: createdInvoice.id,
        idempotencyKey: `POS:${createdInvoice.id}:payment`,
        lines: [
          {
            accountName: mapPaymentMethodToAccount(payMethod),
            partyId: null,
            debit: totalAmount,
            credit: 0,
          },
          {
            accountName: "Accounts Receivable (Trade Debtors)",
            partyId: resolvedCustomerId,
            debit: 0,
            credit: totalAmount,
          },
        ],
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
