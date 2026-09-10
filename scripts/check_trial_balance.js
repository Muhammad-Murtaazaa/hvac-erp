const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTrialBalance() {
  console.log('--- Checking Trial Balance from Journal Lines ---');
  const lines = await prisma.journalLine.findMany({
    include: { account: true }
  });

  let totalDebit = 0;
  let totalCredit = 0;
  const accountBalances = {};

  for (const l of lines) {
    const dr = Number(l.debit || 0);
    const cr = Number(l.credit || 0);
    totalDebit += dr;
    totalCredit += cr;

    const accName = l.account.name;
    if (!accountBalances[accName]) {
      accountBalances[accName] = { dr: 0, cr: 0, type: l.account.type };
    }
    accountBalances[accName].dr += dr;
    accountBalances[accName].cr += cr;
  }

  console.log(`Total Debits:  PKR ${totalDebit.toLocaleString()}`);
  console.log(`Total Credits: PKR ${totalCredit.toLocaleString()}`);
  console.log(`Difference:    PKR ${(totalDebit - totalCredit).toFixed(2)}`);

  console.log('\nTop Accounts by Activity:');
  const sortedAccounts = Object.entries(accountBalances).sort((a, b) => (b[1].dr + b[1].cr) - (a[1].dr + a[1].cr));
  for (const [name, b] of sortedAccounts.slice(0, 15)) {
    console.log(`  - ${name} (${b.type}): Debit=${b.dr.toLocaleString()}, Credit=${b.cr.toLocaleString()}, Net=${(b.dr - b.cr).toLocaleString()}`);
  }
}

checkTrialBalance()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
