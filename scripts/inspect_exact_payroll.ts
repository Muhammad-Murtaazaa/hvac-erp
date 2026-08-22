import prisma from "@/lib/db";

async function main() {
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  const existingRuns = await prisma.payrollRun.findMany({
    where: { month: 8, year: 2026 },
    include: { employee: true },
  });
  const runMap = new Map(existingRuns.map((r: any) => [r.employeeId, r]));

  console.log(`Employees count: ${employees.length}`);
  console.log(`Runs count: ${existingRuns.length}`);

  for (const emp of employees) {
    const existing: any = runMap.get(emp.id);
    console.log(`[${emp.name}] - Has Run: ${!!existing}, Base: ${emp.baseSalary}, Run PresentDays: ${existing?.presentDays}, Run OT: ${existing?.overtimeAmount}, Run Mess: ${existing?.messDeductions}, Run Adv: ${existing?.advanceDeductions}, Run NetPay: ${existing?.netPay}, Run Status: ${existing?.status}`);
  }
}

main().finally(() => prisma.$disconnect());
