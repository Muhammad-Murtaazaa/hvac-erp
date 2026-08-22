import prisma from "@/lib/db";

async function main() {
  const runs = await prisma.payrollRun.findMany({
    where: { month: 8, year: 2026 },
    include: { employee: true },
  });
  console.log("Found runs:", JSON.stringify(runs, null, 2));
}

main().finally(() => prisma.$disconnect());
