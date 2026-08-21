// env vars loaded from shell
const { PrismaClient } = require('../node_modules/@prisma/client');
const p = new PrismaClient();

async function run() {
  const jeCount = await p.journalEntry.count();
  const jlCount = await p.journalLine.count();
  const backfillJE = await p.journalEntry.count({ where: { sourceType: 'LEGACY_BACKFILL' } });
  const backfillJL = await p.journalLine.count({ where: { journalEntry: { sourceType: 'LEGACY_BACKFILL' } } });

  const lines = await p.journalLine.findMany({ where: { journalEntry: { sourceType: 'LEGACY_BACKFILL' } }, include: { account: true } });
  let totalDebit = 0; let totalCredit = 0;
  lines.forEach(function(l) { totalDebit += Number(l.debit); totalCredit += Number(l.credit); });

  const custCount = await p.customer.count();
  const vendCount = await p.vendor.count();
  const empCount = await p.employee.count();
  const leCount = await p.ledgerEntry.count();
  const accounts = await p.account.findMany({ orderBy: { name: 'asc' }, select: { name: true, type: true } });

  const allJE = await p.journalEntry.findMany({ orderBy: { entryDate: 'asc' }, select: { idempotencyKey: true, sourceType: true, narration: true, entryDate: true } });

  const legacyJL = await p.journalLine.findMany({
    where: { journalEntry: { sourceType: 'LEGACY_BACKFILL' } },
    include: { account: true, journalEntry: true },
    orderBy: { journalEntry: { entryDate: 'asc' } }
  });

  console.log('=== COUNTS ===');
  console.log('JournalEntry total:', jeCount);
  console.log('JournalLine total:', jlCount);
  console.log('Backfill JE:', backfillJE, '| Backfill JL:', backfillJL);
  console.log('Backfill total debit: PKR', totalDebit.toLocaleString(), '| total credit: PKR', totalCredit.toLocaleString());
  console.log('Customers:', custCount, '| Vendors:', vendCount, '| Employees:', empCount, '| LedgerEntries:', leCount);
  
  console.log('\n=== ALL JOURNAL ENTRIES (idempotencyKey, sourceType) ===');
  allJE.forEach(function(je) { console.log(je.idempotencyKey, '|', je.sourceType, '|', je.narration.slice(0,50)); });

  console.log('\n=== ACCOUNTS SEEDED ===');
  console.log('Count:', accounts.length);
  accounts.forEach(function(a) { console.log(' -', a.name, '(' + a.type + ')'); });

  console.log('\n=== BACKFILL JL WITH partyId ===');
  legacyJL.forEach(function(l) {
    console.log(l.journalEntry.idempotencyKey, '|', l.account.name, '| partyId:', l.partyId, '| debit:', Number(l.debit).toLocaleString(), '| credit:', Number(l.credit).toLocaleString());
  });
}

run().catch(console.error).finally(function() { p.$disconnect(); });
