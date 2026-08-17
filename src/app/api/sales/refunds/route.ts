import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry } from "@/lib/ledger";
import { recordAuditSnapshot } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { returnId, amountRefunded, method } = await req.json();

    if (!returnId || isNaN(Number(amountRefunded)) || Number(amountRefunded) <= 0) {
      return NextResponse.json({ error: "Return ID and refund amount are required" }, { status: 400 });
    }

    const ret = await prisma.return.findUnique({
      where: { id: returnId },
      include: {
        invoice: true,
      },
    });

    if (!ret) {
      return NextResponse.json({ error: "Return record not found" }, { status: 404 });
    }

    const refundAmt = Number(amountRefunded);

    const refund = await prisma.$transaction(async (tx) => {
      // 1. Calculate previous refunds
      const priorRefunds = await tx.refund.aggregate({
        where: { returnId },
        _sum: { amountRefunded: true },
      });

      const previouslyRefunded = Number(priorRefunds._sum.amountRefunded || 0);
      const remainingRefundable = Number(ret.totalAmount) - previouslyRefunded;

      // Allow a tiny margin for float rounding
      if (refundAmt > remainingRefundable + 0.01) {
        throw new Error(
          `Cannot refund ${refundAmt.toFixed(2)}. Only ${remainingRefundable.toFixed(2)} is remaining to be refunded on this return.`
        );
      }

      // 2. Create Refund record
      const createdRefund = await tx.refund.create({
        data: {
          returnId,
          amountRefunded: refundAmt,
          method: method || "CASH",
        },
      });

      // 3. Double-Entry ledger journal: Debit Accounts Receivable / Credit Cash/Bank
      await recordLedgerEntry(tx, {
        description: `Refund cash/bank payout for Return ${ret.returnNumber} against Invoice ${ret.invoice.invoiceNumber} via ${method}`,
        debitAccount: "Accounts Receivable",
        creditAccount: "Cash/Bank",
        amount: refundAmt,
        referenceType: "RETURN",
        referenceId: createdRefund.id,
      });

      return createdRefund;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Return",
      entityId: returnId,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      diff: JSON.stringify({ refundPaid: amountRefunded, method }),
      afterState: refund,
    });

    return NextResponse.json({ refund });
  } catch (error: any) {
    console.error("[Refund POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
