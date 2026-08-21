const path = require('path');
const { PrismaClient } = require(path.join(process.cwd(), 'node_modules', '@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  const customerCount = await prisma.customer.count();
  const vendorCount = await prisma.vendor.count();
  const employeeCount = await prisma.employee.count();
  const ledgerCount = await prisma.ledgerEntry.count();
  const invoiceCount = await prisma.invoice.count();

  console.log({
    customerCount,
    vendorCount,
    employeeCount,
    ledgerCount,
    invoiceCount
  });
}

main()
  .catch(e => {
    console.error('Prisma test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
