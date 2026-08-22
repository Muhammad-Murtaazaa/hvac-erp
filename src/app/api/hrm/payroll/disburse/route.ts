import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { postJournalEntry } from "@/lib/journal";
import { getNextVoucherNumber, recordLedgerEntry } from "@/lib/ledger";
import { recordAuditSnapshot } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_HRM") && !hasPermission(session, "MANAGE_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { runIds, paymentAccount, paymentMethod, paymentDate, notes } = await req.json();

    if (!Array.isArray(runIds) || runIds.length === 0) {
      return NextResponse.json({ error: "At least one salary run ID is required" }, { status: 400 });
    }

    const payAccount = paymentAccount || "Bank Account (Meezan Bank)";
    const payMethod = paymentMethod || "BANK_TRANSFER";
    const pDate = paymentDate ? new Date(paymentDate) : new Date();

    const disbursementResults = await prisma.$transaction(async (tx) => {
      const processed = [];

      for (const runId of runIds) {
        const run: any = await tx.payrollRun.findUnique({
          where: { id: runId },
          include: { employee: true },
        });

        if (!run) continue;
        if (run.status === "PAID") {
          processed.push({ id: run.id, employeeName: run.employee.name, status: "ALREADY_PAID" });
          continue;
        }

        const baseSalary = Number(run.baseSalary);
        const totalDays = run.totalDays || 30;
        const presentDays = run.presentDays ?? 30;
        const dailyWage = baseSalary / totalDays;
        const earnedBase = Math.round(dailyWage * presentDays * 100) / 100;
        const overtimeAmount = Number(run.overtimeAmount || 0);
        const allowances = Number(run.allowances || 0);
        const messDeductions = Number(run.messDeductions || 0);
        const advanceDeductions = Number(run.advanceDeductions || 0);
        const otherDeductions = Number(run.otherDeductions || 0);

        const grossExpense = Math.round((earnedBase + overtimeAmount + allowances) * 100) / 100;
        const totalDeductions = Math.round((messDeductions + advanceDeductions + otherDeductions) * 100) / 100;
        const netPay = Math.max(0, Math.round((grossExpense - totalDeductions) * 100) / 100);

        const vNum = await getNextVoucherNumber(tx, "CPV");
        const monthName = new Date(run.year, run.month - 1, 1).toLocaleString("default", { month: "short" });
        const narration = `Salary Payout for ${run.employee.name} (${monthName} ${run.year}) - Duty: ${presentDays}/${totalDays}d, OT: PKR ${overtimeAmount}, Mess: -PKR ${messDeductions}, Adv: -PKR ${advanceDeductions}`;

        // Construct Balanced Double-Entry Lines
        const journalLines: { accountName: string; partyId: string | null; debit: number; credit: number }[] = [];

        // 1. Debit Salary & Wage Expense for Gross Expense
        if (grossExpense > 0) {
          journalLines.push({
            accountName: "Salary & Wage Expense",
            partyId: null,
            debit: grossExpense,
            credit: 0,
          });
        }

        // 2. Credit Liquid Bank / Cash Account for Net Amount Paid
        if (netPay > 0) {
          journalLines.push({
            accountName: payAccount,
            partyId: null,
            debit: 0,
            credit: netPay,
          });
        }

        // 3. Credit / Deduct Staff Advance if advance was recovered
        if (advanceDeductions > 0) {
          journalLines.push({
            accountName: "Employee Advance",
            partyId: run.employee.id,
            debit: 0,
            credit: advanceDeductions,
          });
        }

        // 4. Credit Mess / Recovery if food/mess deduction was made
        if (messDeductions > 0) {
          journalLines.push({
            accountName: "General & Administrative Expense",
            partyId: null,
            debit: 0,
            credit: messDeductions,
          });
        }

        // 5. Credit Other Deductions
        if (otherDeductions > 0) {
          journalLines.push({
            accountName: "General & Administrative Expense",
            partyId: null,
            debit: 0,
            credit: otherDeductions,
          });
        }

        // Post Journal Entry
        await postJournalEntry(tx, {
          entryDate: pDate,
          narration,
          sourceType: "PAYROLL",
          sourceId: run.id,
          idempotencyKey: `PAYROLL:${run.id}:payout`,
          lines: journalLines,
        });

        // Dual-write legacy LedgerEntry
        await recordLedgerEntry(tx, {
          entryDate: pDate,
          voucherType: payAccount.toLowerCase().includes("bank") ? "BPV" : "CPV",
          voucherNumber: vNum,
          referenceType: "PAYROLL",
          referenceId: run.id,
          partyType: "EMPLOYEE",
          partyId: run.employee.id,
          partyName: run.employee.name,
          debitAccount: "Salary & Wage Expense",
          creditAccount: payAccount,
          amount: netPay,
          description: narration,
          paymentMethod: payMethod,
          notes: notes || undefined,
        });

        // Update PayrollRun record status
        const updated = await tx.payrollRun.update({
          where: { id: run.id },
          data: {
            status: "PAID",
            paymentDate: pDate,
            paymentAccount: payAccount,
            paymentMethod: payMethod,
            notes: notes ? `${notes}` : run.notes,
          },
        });

        processed.push({
          id: updated.id,
          employeeName: run.employee.name,
          netPay,
          voucherNumber: vNum,
          status: "PAID",
        });
      }

      return processed;
    });

    await recordAuditSnapshot({
      entityName: "SalaryDisbursement",
      entityId: `BATCH-${Date.now()}`,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: { paymentAccount: payAccount, count: disbursementResults.length },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed salary disbursement for ${disbursementResults.length} employee(s).`,
      results: disbursementResults,
    });
  } catch (error: any) {
    console.error("[Salary Disburse POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
