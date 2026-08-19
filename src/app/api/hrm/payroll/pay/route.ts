import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry } from "@/lib/ledger";
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
