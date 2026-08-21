const path = require('path');
const { PrismaClient } = require(path.join(process.cwd(), 'node_modules', '@prisma/client'));
const prisma = new PrismaClient();

async function showPhase4Summary() {
  const allEntries = await prisma.ledgerEntry.findMany();
  const debitAccounts = {};
  const creditAccounts = {};
  const distinct = new Set();

  allEntries.forEach(entry => {
    distinct.add(entry.debitAccount);
    distinct.add(entry.creditAccount);
    debitAccounts[entry.debitAccount] = (debitAccounts[entry.debitAccount] || 0) + 1;
    creditAccounts[entry.creditAccount] = (creditAccounts[entry.creditAccount] || 0) + 1;
  });

  console.log('Distinct strings:', Array.from(distinct));
  console.log('Debit breakdown:', debitAccounts);
  console.log('Credit breakdown:', creditAccounts);
}

showPhase4Summary()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
