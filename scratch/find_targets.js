const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- 1. Search for 10004 in LedgerEntry ---');
  const l10004 = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { voucherNumber: { contains: '10004' } },
        { referenceId: { contains: '10004' } },
        { description: { contains: '10004' } }
      ]
    }
  });
  console.log('Found in LedgerEntry:', l10004.length);
  for (const l of l10004) {
    console.log(`  ID: ${l.id} | Voucher: ${l.voucherNumber} | Type: ${l.voucherType} | Amount: ${l.amount} | Party: ${l.partyName} | Desc: ${l.description}`);
  }

  console.log('--- 2. Search for 10004 in JournalEntry ---');
  const j10004 = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { sourceId: { contains: '10004' } },
        { narration: { contains: '10004' } },
        { idempotencyKey: { contains: '10004' } }
      ]
    },
    include: { lines: { include: { account: true } } }
  });
  console.log('Found in JournalEntry:', j10004.length);
  for (const j of j10004) {
    console.log(`  ID: ${j.id} | SourceId: ${j.sourceId} | Key: ${j.idempotencyKey} | Narration: ${j.narration}`);
    for (const line of j.lines) {
      console.log(`     Line: ${line.account.name} | Debit: ${line.debit} | Credit: ${line.credit} | PartyId: ${line.partyId}`);
    }
  }

  console.log('--- 3. Search for 1284000 in LedgerEntry & JournalLine ---');
  const lAmount = await prisma.ledgerEntry.findMany({
    where: {
      amount: 1284000
    }
  });
  console.log('Found amount 1284000 in LedgerEntry:', lAmount.length);
  for (const l of lAmount) {
    console.log(`  ID: ${l.id} | Voucher: ${l.voucherNumber} | Type: ${l.voucherType} | Amount: ${l.amount} | Party: ${l.partyName} | Desc: ${l.description}`);
  }

  const jLinesAmount = await prisma.journalLine.findMany({
    where: {
      OR: [
        { debit: 1284000 },
        { credit: 1284000 }
      ]
    },
    include: {
      journalEntry: true,
      account: true
    }
  });
  console.log('Found amount 1284000 in JournalLine:', jLinesAmount.length);
  for (const jl of jLinesAmount) {
    console.log(`  LineID: ${jl.id} | JournalID: ${jl.journalEntryId} | Narration: ${jl.journalEntry.narration} | SourceId: ${jl.journalEntry.sourceId} | Key: ${jl.journalEntry.idempotencyKey} | Account: ${jl.account.name} | D: ${jl.debit} | C: ${jl.credit}`);
  }

  console.log('--- 4. Search for Faisal Rehman in all LedgerEntries ---');
  const lFaisal = await prisma.ledgerEntry.findMany({
    where: {
      partyName: { contains: 'Faisal', mode: 'insensitive' }
    }
  });
  console.log('Found Faisal in LedgerEntry:', lFaisal.length);
  for (const l of lFaisal) {
    console.log(`  ID: ${l.id} | Voucher: ${l.voucherNumber} | Ref: ${l.referenceId} | Type: ${l.voucherType} | Amount: ${l.amount} | Party: ${l.partyName} | Desc: ${l.description}`);
  }

  console.log('--- 5. Search for CPV-10026 / 10026 ---');
  const l10026 = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { voucherNumber: { contains: '10026' } },
        { referenceId: { contains: '10026' } },
        { description: { contains: '10026' } }
      ]
    }
  });
  console.log('Found 10026 in LedgerEntry:', l10026.length);
  for (const l of l10026) {
    console.log(`  ID: ${l.id} | Voucher: ${l.voucherNumber} | Ref: ${l.referenceId} | Type: ${l.voucherType} | Amount: ${l.amount} | Party: ${l.partyName} | Desc: ${l.description}`);
  }

  const j10026 = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { sourceId: { contains: '10026' } },
        { narration: { contains: '10026' } },
        { idempotencyKey: { contains: '10026' } }
      ]
    }
  });
  console.log('Found 10026 in JournalEntry:', j10026.length);
  for (const j of j10026) {
    console.log(`  ID: ${j.id} | SourceId: ${j.sourceId} | Key: ${j.idempotencyKey} | Narration: ${j.narration}`);
  }

  console.log('--- 6. Search for CPV vouchers or any voucher for Sarfaraz / Mohsin ---');
  const mohsinVouchers = await prisma.ledgerEntry.findMany({
    where: {
      partyName: { contains: 'Mohsin', mode: 'insensitive' }
    }
  });
  for (const m of mohsinVouchers) {
    console.log(`  Mohsin Ledger -> ID: ${m.id} | Voucher: ${m.voucherNumber} | Ref: ${m.referenceId} | Type: ${m.voucherType} | Amount: ${m.amount} | Desc: ${m.description} | Date: ${m.entryDate}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
