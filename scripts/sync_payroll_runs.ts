import prisma from "@/lib/db";

async function syncPayroll() {
  console.log("Synchronizing and cleaning up PayrollRun records...");

  // Update existing runs for month 8, year 2026 to ensure proper totalDays = 30 and computed values
  const runs = await prisma.payrollRun.findMany({
    where: { month: 8, year: 2026 },
  });

  for (const r of runs) {
    const totalDays = 30;
    const presentDays = r.presentDays !== null && r.presentDays !== undefined ? r.presentDays : 30;
    const absentDays = Math.max(0, totalDays - presentDays);
    const baseSalary = Number(r.baseSalary);
    const dailyWage = baseSalary / 30;
    const earnedBase = Math.round(dailyWage * presentDays * 100) / 100;
    const overtimeAmount = Number(r.overtimeAmount || 0);
    const allowances = Number(r.allowances || 0);
    const messDeductions = Number(r.messDeductions || 0);
    const advanceDeductions = Number(r.advanceDeductions || 0);
    const otherDeductions = Number(r.otherDeductions || 0);
    const totalDeductions = messDeductions + advanceDeductions + otherDeductions;
    const netPay = Math.max(0, Math.round((earnedBase + overtimeAmount + allowances - totalDeductions) * 100) / 100);

    await prisma.payrollRun.update({
      where: { id: r.id },
      data: {
        totalDays,
        presentDays,
        absentDays,
        overtimeAmount,
        allowances,
        messDeductions,
        advanceDeductions,
        otherDeductions,
        deductions: totalDeductions,
        netPay,
      } as any,
    });
  }

  console.log("PayrollRun records synchronized successfully.");
}

syncPayroll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
