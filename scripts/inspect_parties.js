const path = require('path');
const { PrismaClient } = require(path.join(process.cwd(), 'node_modules', '@prisma/client'));
const prisma = new PrismaClient();

async function inspectParties() {
  const customers = await prisma.customer.findMany({ select: { id: true, name: true, phone: true } });
  const employees = await prisma.employee.findMany({ select: { id: true, name: true, employeeNo: true, cnic: true } });
  const vendors = await prisma.vendor.findMany({ select: { id: true, name: true } });

  console.log('--- ALL CUSTOMERS (16) ---');
  console.table(customers);

  console.log('--- ALL EMPLOYEES (6) ---');
  console.table(employees);

  console.log('--- ALL VENDORS (4) ---');
  console.table(vendors);
}

inspectParties()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
