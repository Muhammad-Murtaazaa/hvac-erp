const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function cleanupAndVerify() {
  console.log('=== BEFORE CLEANUP ===');
  const custBefore = await prisma.customer.count();
  const vendBefore = await prisma.vendor.count();
  const empBefore = await prisma.employee.count();
  const leBefore = await prisma.ledgerEntry.count();
  const jeBefore = await prisma.journalEntry.count();
  const jlBefore = await prisma.journalLine.count();
  console.log({ custBefore, vendBefore, empBefore, leBefore, jeBefore, jlBefore });

  // 1. Find all non-legacy JournalEntries
  const nonLegacyJEs = await prisma.journalEntry.findMany({
    where: {
      NOT: {
        idempotencyKey: {
          startsWith: 'LEGACY_BACKFILL',
        },
      },
    },
    select: { id: true, idempotencyKey: true },
  });
  console.log(`Found ${nonLegacyJEs.length} non-legacy JournalEntries to delete.`);

  // 2. Delete JournalLines for non-legacy JournalEntries
  const nonLegacyJEIds = nonLegacyJEs.map((j) => j.id);
  const deletedJL = await prisma.journalLine.deleteMany({
    where: {
      journalEntryId: { in: nonLegacyJEIds },
    },
  });
  console.log(`Deleted ${deletedJL.count} JournalLines.`);

  // 3. Delete non-legacy JournalEntries
  const deletedJE = await prisma.journalEntry.deleteMany({
    where: {
      id: { in: nonLegacyJEIds },
    },
  });
  console.log(`Deleted ${deletedJE.count} JournalEntries.`);

  // 4. Delete test invoices (like POS-INV-GAP) and invoiceLineItems
  const testInvoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { invoiceNumber: { contains: 'GAP' } },
        { invoiceNumber: { contains: 'TEST' } },
      ],
    },
    select: { id: true },
  });
  if (testInvoices.length > 0) {
    const invIds = testInvoices.map((i) => i.id);
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: invIds } } });
    await prisma.payment.deleteMany({ where: { invoiceId: { in: invIds } } });
    const delInv = await prisma.invoice.deleteMany({ where: { id: { in: invIds } } });
    console.log(`Deleted ${delInv.count} test invoices.`);
  }

  // 5. Delete test products (like SKU-POS-GAP)
  const delProd = await prisma.product.deleteMany({
    where: {
      OR: [
        { sku: { contains: 'GAP' } },
        { sku: { contains: 'TEST' } },
      ],
    },
  });
  console.log(`Deleted ${delProd.count} test products.`);

  // 6. Delete test payroll runs
  const testEmps = await prisma.employee.findMany({
    where: {
      OR: [
        { name: { contains: 'Test' } },
        { name: { contains: 'Scenario' } },
        { name: { contains: 'Gap' } },
      ],
    },
    select: { id: true },
  });
  const testEmpIds = testEmps.map((e) => e.id);
  const delPayroll = await prisma.payrollRun.deleteMany({
    where: {
      employeeId: { in: testEmpIds },
    },
  });
  console.log(`Deleted ${delPayroll.count} test payroll runs.`);

  // 7. Delete test employees
  const delEmp = await prisma.employee.deleteMany({
    where: {
      id: { in: testEmpIds },
    },
  });
  console.log(`Deleted ${delEmp.count} test employees.`);

  // 8. Delete test vendors
  const delVend = await prisma.vendor.deleteMany({
    where: {
      OR: [
        { name: { contains: 'Test' } },
        { name: { contains: 'Scenario' } },
        { name: { contains: 'Gap' } },
      ],
    },
  });
  console.log(`Deleted ${delVend.count} test vendors.`);

  // 9. Delete test customers
  const delCust = await prisma.customer.deleteMany({
    where: {
      OR: [
        { name: { contains: 'Test' } },
        { name: { contains: 'Scenario' } },
        { name: { contains: 'Gap' } },
      ],
    },
  });
  console.log(`Deleted ${delCust.count} test customers.`);

  console.log('\n=== AFTER CLEANUP ===');
  const custAfter = await prisma.customer.count();
  const vendAfter = await prisma.vendor.count();
  const empAfter = await prisma.employee.count();
  const leAfter = await prisma.ledgerEntry.count();
  const jeAfter = await prisma.journalEntry.count();
  const jlAfter = await prisma.journalLine.count();
  console.log({ custAfter, vendAfter, empAfter, leAfter, jeAfter, jlAfter });

  // Check cash balances
  const cashLines = await prisma.journalLine.findMany({
    where: {
      account: {
        name: { in: ['Cash in Hand', 'Bank Account (Meezan Bank)'] },
      },
    },
    include: { account: true },
  });

  let cashInHand = 0;
  let bankAccount = 0;
  cashLines.forEach((l) => {
    const diff = Number(l.debit) - Number(l.credit);
    if (l.account.name === 'Cash in Hand') cashInHand += diff;
    if (l.account.name === 'Bank Account (Meezan Bank)') bankAccount += diff;
  });

  console.log('\n=== RECONCILED CASH BALANCES ===');
  console.log({
    'Bank Account (Meezan Bank)': `PKR ${bankAccount.toLocaleString()}`,
    'Cash in Hand': `PKR ${cashInHand.toLocaleString()}`,
    'Total Liquid Cash': `PKR ${(bankAccount + cashInHand).toLocaleString()}`,
  });
}

cleanupAndVerify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
