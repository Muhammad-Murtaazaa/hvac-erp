const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== VOUCHERS WITH 10004 ===');
  const ledgers10004 = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { voucherNumber: { contains: '10004', mode: 'insensitive' } },
        { referenceId: { contains: '10004', mode: 'insensitive' } }
      ]
    }
  });
  console.log('ledger 10004:', ledgers10004);

  const journals10004 = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { sourceId: { contains: '10004', mode: 'insensitive' } },
        { narration: { contains: '10004', mode: 'insensitive' } },
        { idempotencyKey: { contains: '10004', mode: 'insensitive' } }
      ]
    },
    include: { lines: { include: { account: true } } }
  });
  console.log('journals 10004:', JSON.stringify(journals10004, null, 2));

  console.log('\n=== FAISAL REHMAN RECORDS ===');
  const faisal = await prisma.ledgerEntry.findMany({
    where: {
      partyName: { contains: 'Faisal', mode: 'insensitive' }
    }
  });
  console.log('faisal ledger:', faisal);

  const faisalJournals = await prisma.journalEntry.findMany({
    where: {
      narration: { contains: 'Faisal', mode: 'insensitive' }
    },
    include: { lines: { include: { account: true } } }
  });
  console.log('faisal journals:', JSON.stringify(faisalJournals, null, 2));

  console.log('\n=== VOUCHERS WITH 10026 / 10027 / 50000 ===');
  const amount50000 = await prisma.ledgerEntry.findMany({
    where: {
      amount: 50000
    }
  });
  console.log('amount 50000 ledgers:', amount50000);

  const v10026 = await prisma.ledgerEntry.findMany({
    where: {
      voucherNumber: { in: ['CPV-10026', 'CRV-10026', 'BPV-10026', 'BRV-10026', 'JV-10026', 'CPV 10026'] }
    }
  });
  console.log('v10026:', v10026);

  const j10026 = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { sourceId: { contains: '10026', mode: 'insensitive' } },
        { narration: { contains: '10026', mode: 'insensitive' } },
        { idempotencyKey: { contains: '10026', mode: 'insensitive' } }
      ]
    },
    include: { lines: { include: { account: true } } }
  });
  console.log('journals 10026:', JSON.stringify(j10026, null, 2));

  console.log('\n=== ALL LEDGER ENTRIES FOR MR MOHSIN ===');
  const mohsinEntries = await prisma.ledgerEntry.findMany({
    where: {
      partyName: { contains: 'Mohsin', mode: 'insensitive' }
    }
  });
  console.log('mohsin ledgers:', mohsinEntries);

  const mohsinJournals = await prisma.journalEntry.findMany({
    where: {
      narration: { contains: 'Mohsin', mode: 'insensitive' }
    },
    include: { lines: { include: { account: true } } }
  });
  console.log('mohsin journals:', JSON.stringify(mohsinJournals, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
