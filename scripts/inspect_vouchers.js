const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('=== 1. SEARCH EXACT CPV-10004 ===');
  const cpvLedger = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { voucherNumber: { in: ['CPV-10004', 'CPV 10004', 'CPV10004'] } },
        { referenceId: { in: ['CPV-10004', 'CPV 10004', 'CPV10004'] } }
      ]
    }
  });
  console.log('CPV-10004 Ledger Entries:', cpvLedger);

  const cpvJournal = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { sourceId: { in: ['CPV-10004', 'CPV 10004', 'CPV10004'] } },
        { idempotencyKey: { contains: 'CPV-10004' } },
        { narration: { contains: 'CPV-10004' } }
      ]
    },
    include: { lines: { include: { account: true } } }
  });
  console.log('CPV-10004 Journal Entries:', JSON.stringify(cpvJournal, null, 2));

  console.log('\n=== 2. SEARCH FAISAL REHMAN 1284000 ===');
  const faisalLedger = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { amount: 1284000 },
        { partyName: { contains: 'faisal', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Faisal / 1284000 Ledger Entries:', faisalLedger);

  console.log('\n=== 3. SEARCH EXACT CRV-10026 ===');
  const crvLedger = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { voucherNumber: { in: ['CRV-10026', 'CRV 10026', 'CRV10026'] } },
        { referenceId: { in: ['CRV-10026', 'CRV 10026', 'CRV10026'] } }
      ]
    }
  });
  console.log('CRV-10026 Ledger Entries:', crvLedger);

  const crvJournal = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { sourceId: { in: ['CRV-10026', 'CRV 10026', 'CRV10026'] } },
        { idempotencyKey: { contains: 'CRV-10026' } },
        { narration: { contains: 'CRV-10026' } },
        { narration: { contains: 'slip#40483' } },
        { narration: { equals: 'test' } }
      ]
    },
    include: { lines: { include: { account: true } } }
  });
  console.log('CRV-10026 Journal Entries:', JSON.stringify(crvJournal, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
