import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_HRM")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const whereClause: any = {};
  if (month) whereClause.month = parseInt(month);
  if (year) whereClause.year = parseInt(year);

  const payrollRuns = await prisma.payrollRun.findMany({
    where: whereClause,
    include: {
      employee: true,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json({ payrollRuns });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_HRM")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { month, year } = await req.json();

    if (!month || !year || isNaN(parseInt(month)) || isNaN(parseInt(year))) {
      return NextResponse.json({ error: "Month (1-12) and Year are required" }, { status: 400 });
    }

    const m = parseInt(month);
    const y = parseInt(year);

    // Get all ACTIVE employees
    const employees = await prisma.employee.findMany({
      where: { status: "ACTIVE" },
    });

    const generatedRuns = [];

    // Calculate dates for attendance checking
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    for (const emp of employees) {
      // Check if payroll run already exists
      const existing = await prisma.payrollRun.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month: m,
            year: y,
          },
        },
      });

      if (existing) {
        generatedRuns.push(existing);
        continue;
      }

      // Calculate daily rate
      const baseVal = Number(emp.baseSalary);
      const dailyRate = baseVal / 30;

      // Query employee attendance for this month
      const attendance = await prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      let absentCount = 0;
      let halfDayCount = 0;

      attendance.forEach((att) => {
        if (att.status === "ABSENT") absentCount++;
        else if (att.status === "HALF_DAY") halfDayCount++;
      });

      const allowances = 0.00; // Can be manually adjusted later
      const deductions = Math.round((absentCount * dailyRate + halfDayCount * 0.5 * dailyRate) * 100) / 100;
      const netPay = Math.max(0, Math.round((baseVal + allowances - deductions) * 100) / 100);

      const run = await prisma.payrollRun.create({
        data: {
          employeeId: emp.id,
          month: m,
          year: y,
          baseSalary: baseVal,
          allowances,
          deductions,
          netPay,
          status: "PENDING",
        },
      });

      generatedRuns.push(run);
    }

    return NextResponse.json({ payrollRuns: generatedRuns });
  } catch (error: any) {
    console.error("[Payroll Run POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
