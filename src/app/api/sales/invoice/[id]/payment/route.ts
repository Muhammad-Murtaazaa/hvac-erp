import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry } from "@/lib/ledger";
import { postJournalEntry, mapPaymentMethodToAccount } from "@/lib/journal";
import { recordAuditSnapshot } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { amountPaid, method } = await req.json();

    if (amountPaid === undefined || isNaN(Number(amountPaid)) || Number(amountPaid) <= 0) {
      return NextResponse.json({ error: "Please enter a valid positive payment amount" }, { status: 400 });
    }

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: params.id },
      });

      if (!invoice) throw new Error("Invoice not found");

      const outstanding = Number(invoice.totalAmount) - Number(invoice.amountPaid);
      if (Number(amountPaid) > outstanding + 0.01) {
        throw new Error(`Cannot pay PKR ${amountPaid}. Outstanding balance is only PKR ${outstanding.toFixed(2)}.`);
      }

      // 1. Create the Payment log
      const createdPayment = await tx.payment.create({
        data: {
          invoiceId: params.id,
          amountPaid: Number(amountPaid),
          method: method || "CASH",
        },
      });

      // 2. Increment the amount paid on the invoice
      const newPaidTotal = Math.round(Number(invoice.amountPaid) + Number(amountPaid));
      let newStatus = "PARTIALLY_PAID";
      if (newPaidTotal >= Math.round(Number(invoice.totalAmount))) {
        newStatus = "PAID";
      }

      const inv = await tx.invoice.update({
        where: { id: params.id },
        data: {
          amountPaid: newPaidTotal,
          status: newStatus,
        },
      });

      // If invoice is linked to a complaint, sync complaint status
      if (invoice.complaintId) {
        await tx.complaint.update({
          where: { id: invoice.complaintId },
          data: {
            amount: Number(invoice.totalAmount),
            amountStatus: newStatus,
          },
        });
      }

      // 3. Write General Ledger entries (Debit Cash-Bank / Credit Accounts Receivable)
      const isBank = (method || "CASH") === "BANK_TRANSFER" || (method || "CASH") === "CHEQUE" || (method || "CASH") === "ONLINE";
      const liquidAcc = isBank ? "Bank Account (Meezan Bank)" : "Cash in Hand";

      await recordLedgerEntry(tx, {
        description: `Payment received against Invoice ${invoice.invoiceNumber} via ${method || "CASH"}`,
        debitAccount: liquidAcc,
        creditAccount: "Accounts Receivable (Trade Debtors)",
        amount: Number(amountPaid),
        referenceType: "INVOICE",
        referenceId: invoice.id,
        partyType: "CUSTOMER",
        partyId: invoice.customerId,
        partyName: invoice.clientName,
        voucherType: isBank ? "BRV" : "CRV",
        voucherNumber: invoice.invoiceNumber,
        paymentMethod: method || "CASH",
      });

      // Native Double-Entry Journal: Payment receipt
      await postJournalEntry(tx, {
        entryDate: new Date(),
        narration: `Payment received against Invoice ${invoice.invoiceNumber} via ${method || "CASH"}`,
        sourceType: "PAYMENT",
        sourceId: createdPayment.id,
        idempotencyKey: `PAYMENT:${createdPayment.id}:receipt`,
        lines: [
          {
            accountName: mapPaymentMethodToAccount(method),
            partyId: null,
            debit: Number(amountPaid),
            credit: 0,
          },
          {
            accountName: "Accounts Receivable (Trade Debtors)",
            partyId: invoice.customerId,
            debit: 0,
            credit: Number(amountPaid),
          },
        ],
      });

      return inv;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Invoice",
      entityId: params.id,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      diff: JSON.stringify({ paymentAdded: amountPaid, method: method || "CASH" }),
      afterState: updatedInvoice,
    });

    return NextResponse.json({ success: true, invoice: updatedInvoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
