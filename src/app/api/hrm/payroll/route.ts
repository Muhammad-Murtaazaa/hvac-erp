import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_HRM") && !hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const currentDate = new Date();
    const month = parseInt(searchParams.get("month") || String(currentDate.getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(currentDate.getFullYear()));

    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, month, 0).getDate();

    // 1. Fetch all ACTIVE employees
    const employees = await prisma.employee.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });

    // 2. Fetch existing saved PayrollRuns for this month & year
    const existingRuns = await prisma.payrollRun.findMany({
      where: { month, year },
      include: { employee: true },
    });
    const runMap = new Map(existingRuns.map((r) => [r.employeeId, r]));

    // 3. Fetch attendance for this month to pre-fill if run not yet created
    const attendanceLogs = await prisma.attendance.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    });
    const attMap = new Map<string, { present: number; absent: number; halfDay: number }>();
    attendanceLogs.forEach((att) => {
      const cur = attMap.get(att.employeeId) || { present: 0, absent: 0, halfDay: 0 };
      if (att.status === "PRESENT") cur.present++;
      else if (att.status === "ABSENT") cur.absent++;
      else if (att.status === "HALF_DAY") cur.halfDay++;
      attMap.set(att.employeeId, cur);
    });

    // 4. Fetch logged employee advances in this month (supporting all standard advance aliases & EAV vouchers)
    const advances = await prisma.ledgerEntry.findMany({
      where: {
        partyType: "EMPLOYEE",
        OR: [
          { debitAccount: { contains: "Employee Advance", mode: "insensitive" } },
          { debitAccount: { contains: "Staff Advance", mode: "insensitive" } },
          { debitAccount: { contains: "Employee Loan", mode: "insensitive" } },
          { voucherType: "EAV" },
        ],
        entryDate: { gte: startDate, lte: endDate },
      },
    });
    const advanceMap = new Map<string, number>();
    advances.forEach((adv) => {
      if (adv.partyId) {
        advanceMap.set(adv.partyId, (advanceMap.get(adv.partyId) || 0) + Number(adv.amount));
      }
    });

    const defaultTotalDays = 30;

    // 5. Build full salary sheet items
    const salarySheet = employees.map((emp) => {
      const existing: any = runMap.get(emp.id);
      const baseSalary = Number(emp.baseSalary || 0);

      if (existing) {
        const totalDays = Number(existing.totalDays || defaultTotalDays);
        const presentDays = existing.presentDays !== null && existing.presentDays !== undefined ? Number(existing.presentDays) : totalDays;
        const absentDays = existing.absentDays !== null && existing.absentDays !== undefined ? Number(existing.absentDays) : Math.max(0, totalDays - presentDays);
        const dailyWage = baseSalary / (totalDays || 30);
        const earnedBase = Math.round(dailyWage * presentDays * 100) / 100;
        const overtimeHours = Number(existing.overtimeHours || 0);
        const overtimeAmount = Number(existing.overtimeAmount || 0);
        const allowances = Number(existing.allowances || 0);
        const messDeductions = Number(existing.messDeductions || 0);
        const advanceDeductions = Number(existing.advanceDeductions || 0);
        const otherDeductions = Number(existing.otherDeductions || 0);
        const totalDeductions = messDeductions + advanceDeductions + otherDeductions;
        const computedNetPay = Math.max(0, Math.round((earnedBase + overtimeAmount + allowances - totalDeductions) * 100) / 100);

        return {
          id: existing.id,
          employeeId: emp.id,
          employeeNo: emp.employeeNo || "",
          employeeName: emp.name,
          department: emp.department,
          position: emp.position,
          phone: emp.phone,
          bankDetails: emp.bankDetails,
          month,
          year,
          totalDays,
          presentDays,
          absentDays,
          baseSalary,
          overtimeHours,
          overtimeAmount,
          allowances,
          messDeductions,
          advanceDeductions,
          otherDeductions,
          deductions: totalDeductions,
          netPay: computedNetPay,
          status: existing.status,
          paymentDate: existing.paymentDate ? existing.paymentDate.toISOString().split("T")[0] : null,
          paymentAccount: existing.paymentAccount,
          paymentMethod: existing.paymentMethod,
          notes: existing.notes || "",
        };
      }

      // Default prefill for unsaved employee
      const att = attMap.get(emp.id);
      const absentDays = att ? att.absent + att.halfDay * 0.5 : 0;
      const presentDays = Math.max(0, defaultTotalDays - absentDays);
      const dailyWage = baseSalary / (defaultTotalDays || 30);
      const earnedBase = Math.round(dailyWage * presentDays * 100) / 100;
      const advDeduction = advanceMap.get(emp.id) || 0;
      const messDeduction = 0;
      const overtimeHours = 0;
      const overtimeAmount = 0;
      const allowances = 0;
      const otherDeductions = 0;
      const totalDeductions = Math.round((advDeduction + messDeduction + otherDeductions) * 100) / 100;
      const netPay = Math.max(0, Math.round((earnedBase + overtimeAmount + allowances - totalDeductions) * 100) / 100);

      return {
        id: `draft-${emp.id}`,
        employeeId: emp.id,
        employeeNo: emp.employeeNo || "",
        employeeName: emp.name,
        department: emp.department,
        position: emp.position,
        phone: emp.phone,
        bankDetails: emp.bankDetails,
        month,
        year,
        totalDays: defaultTotalDays,
        presentDays,
        absentDays,
        baseSalary,
        overtimeHours,
        overtimeAmount,
        allowances,
        messDeductions: messDeduction,
        advanceDeductions: advDeduction,
        otherDeductions,
        deductions: totalDeductions,
        netPay,
        status: "PENDING" as const,
        paymentDate: null,
        paymentAccount: null,
        paymentMethod: null,
        notes: "",
      };
    });

    // 6. Aggregate Totals
    const summary = {
      totalEmployees: employees.length,
      totalBaseSalary: salarySheet.reduce((s, r) => s + r.baseSalary, 0),
      totalOvertime: salarySheet.reduce((s, r) => s + r.overtimeAmount, 0),
      totalAllowances: salarySheet.reduce((s, r) => s + r.allowances, 0),
      totalMessDeductions: salarySheet.reduce((s, r) => s + r.messDeductions, 0),
      totalAdvanceDeductions: salarySheet.reduce((s, r) => s + r.advanceDeductions, 0),
      totalDeductions: salarySheet.reduce((s, r) => s + r.deductions, 0),
      totalNetPay: salarySheet.reduce((s, r) => s + r.netPay, 0),
      paidCount: salarySheet.filter((r) => r.status === "PAID").length,
      pendingCount: salarySheet.filter((r) => r.status === "PENDING").length,
    };

    return NextResponse.json({
      month,
      year,
      monthName: new Date(year, month - 1, 1).toLocaleString("default", { month: "long" }),
      salarySheet,
      summary,
    });
  } catch (error: any) {
    console.error("[Salary Sheet GET] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_HRM") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { month, year, items } = await req.json();

    if (!month || !year || !Array.isArray(items)) {
      return NextResponse.json({ error: "Month, Year, and items array are required" }, { status: 400 });
    }

    const m = parseInt(month);
    const y = parseInt(year);

    const updatedRuns = await prisma.$transaction(async (tx) => {
      const runs = [];

      for (const item of items) {
        const empId = item.employeeId;
        if (!empId) continue;

        const baseSalary = Number(item.baseSalary || 0);
        const totalDays = Number(item.totalDays || 30);
        const presentDays = Number(item.presentDays || 30);
        const absentDays = Math.max(0, totalDays - presentDays);
        const overtimeHours = Number(item.overtimeHours || 0);
        const overtimeAmount = Number(item.overtimeAmount || 0);
        const allowances = Number(item.allowances || 0);
        const messDeductions = Number(item.messDeductions || 0);
        const advanceDeductions = Number(item.advanceDeductions || 0);
        const otherDeductions = Number(item.otherDeductions || 0);
        const totalDeductions = Math.round((messDeductions + advanceDeductions + otherDeductions) * 100) / 100;

        const dailyWage = baseSalary / (totalDays || 30);
        const earnedBase = Math.round(dailyWage * presentDays * 100) / 100;
        const computedNetPay = Math.max(0, Math.round((earnedBase + overtimeAmount + allowances - totalDeductions) * 100) / 100);
        const netPay = item.netPay !== undefined ? Number(item.netPay) : computedNetPay;

        const run = await tx.payrollRun.upsert({
          where: {
            employeeId_month_year: {
              employeeId: empId,
              month: m,
              year: y,
            },
          },
          update: {
            totalDays,
            presentDays,
            absentDays,
            baseSalary,
            overtimeHours,
            overtimeAmount,
            allowances,
            messDeductions,
            advanceDeductions,
            otherDeductions,
            deductions: totalDeductions,
            netPay,
            notes: item.notes || null,
          } as any,
          create: {
            employeeId: empId,
            month: m,
            year: y,
            totalDays,
            presentDays,
            absentDays,
            baseSalary,
            overtimeHours,
            overtimeAmount,
            allowances,
            messDeductions,
            advanceDeductions,
            otherDeductions,
            deductions: totalDeductions,
            netPay,
            status: "PENDING",
            notes: item.notes || null,
          } as any,
          include: { employee: true },
        });

        runs.push(run);
      }

      return runs;
    });

    await recordAuditSnapshot({
      entityName: "SalarySheet",
      entityId: `${y}-${m}`,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      afterState: { month: m, year: y, count: updatedRuns.length },
    });

    return NextResponse.json({ success: true, count: updatedRuns.length, runs: updatedRuns });
  } catch (error: any) {
    console.error("[Salary Sheet POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
