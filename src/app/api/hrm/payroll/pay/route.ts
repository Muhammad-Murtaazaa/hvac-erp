import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry } from "@/lib/ledger";
import { postJournalEntry } from "@/lib/journal";
import { recordAuditSnapshot } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_HRM")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { payrollRunId } = await req.json();

    if (!payrollRunId) {
      return NextResponse.json({ error: "Payroll Run ID is required" }, { status: 400 });
    }

    const run = await prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: {
        employee: true,
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
    }

    if (run.status === "PAID") {
      return NextResponse.json({ error: "Payroll is already paid" }, { status: 400 });
    }

    const netPayVal = Number(run.netPay);

    const updatedRun = await prisma.$transaction(async (tx) => {
      const record = await tx.payrollRun.update({
        where: { id: payrollRunId },
        data: {
          status: "PAID",
          paymentDate: new Date(),
        },
      });

      // Write ledger journal: Debit Salary Expense / Credit Cash/Bank
      await recordLedgerEntry(tx, {
        description: `Salary payout for employee ${run.employee.name} for period ${run.month}/${run.year}`,
        debitAccount: "Salary Expense",
        creditAccount: "Cash in Hand",
        amount: netPayVal,
        referenceType: "PAYROLL",
        referenceId: `PAY-${run.month}/${run.year}`,
        partyType: "EMPLOYEE",
        partyId: run.employeeId,
        partyName: run.employee.name,
        voucherType: "EAV",
        voucherNumber: `PAY-${run.month}/${run.year}`,
      });

      // Native Double-Entry Journal: Salary Payout
      await postJournalEntry(tx, {
        entryDate: new Date(),
        narration: `Salary payout for employee ${run.employee.name} for period ${run.month}/${run.year}`,
        sourceType: "PAYROLL",
        sourceId: run.id,
        idempotencyKey: `PAYROLL:${run.id}:salary`,
        lines: [
          {
            accountName: "Salary Expense",
            partyId: run.employeeId,
            debit: netPayVal,
            credit: 0,
          },
          {
            accountName: "Cash in Hand",
            partyId: run.employeeId,
            debit: 0,
            credit: netPayVal,
          },
        ],
      });

      // If deductions exist (advance recovery), post separate JournalEntry
      const deductionsVal = Number(run.deductions || 0);
      if (deductionsVal > 0) {
        await postJournalEntry(tx, {
          entryDate: new Date(),
          narration: `Advance deduction for employee ${run.employee.name} for period ${run.month}/${run.year}`,
          sourceType: "PAYROLL",
          sourceId: run.id,
          idempotencyKey: `PAYROLL:${run.id}:advance-deduction`,
          lines: [
            {
              accountName: "Salary Expense",
              partyId: run.employeeId,
              debit: deductionsVal,
              credit: 0,
            },
            {
              accountName: "Employee Advance",
              partyId: run.employeeId,
              debit: 0,
              credit: deductionsVal,
            },
          ],
        });
      }

      return record;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "PayrollRun",
      entityId: updatedRun.id,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      beforeState: run,
      afterState: updatedRun,
    });

    return NextResponse.json({ payrollRun: updatedRun });
  } catch (error: any) {
    console.error("[Payroll Pay POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
