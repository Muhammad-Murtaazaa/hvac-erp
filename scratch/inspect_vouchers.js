const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Searching for CPV 10004 ---');
  const ledger10004 = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { voucherNumber: { contains: '10004', mode: 'insensitive' } },
        { referenceId: { contains: '10004', mode: 'insensitive' } },
        { description: { contains: '10004', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Ledger entries for 10004:', JSON.stringify(ledger10004, null, 2));

  const journal10004 = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { sourceId: { contains: '10004', mode: 'insensitive' } },
        { narration: { contains: '10004', mode: 'insensitive' } },
        { idempotencyKey: { contains: '10004', mode: 'insensitive' } }
      ]
    },
    include: { lines: { include: { account: true } } }
  });
  console.log('Journal entries for 10004:', JSON.stringify(journal10004, null, 2));

  console.log('\n--- Searching for Faisal Rehman ---');
  const faisalLedger = await prisma.ledgerEntry.findMany({
    where: {
      partyName: { contains: 'Faisal', mode: 'insensitive' }
    }
  });
  console.log('Faisal ledger entries:', JSON.stringify(faisalLedger, null, 2));

  console.log('\n--- Searching for CPV 10026 ---');
  const ledger10026 = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { voucherNumber: { contains: '10026', mode: 'insensitive' } },
        { referenceId: { contains: '10026', mode: 'insensitive' } },
        { description: { contains: '10026', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Ledger entries for 10026:', JSON.stringify(ledger10026, null, 2));

  const journal10026 = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { sourceId: { contains: '10026', mode: 'insensitive' } },
        { narration: { contains: '10026', mode: 'insensitive' } },
        { idempotencyKey: { contains: '10026', mode: 'insensitive' } }
      ]
    },
    include: { lines: { include: { account: true } } }
  });
  console.log('Journal entries for 10026:', JSON.stringify(journal10026, null, 2));

  console.log('\n--- Searching for Mohsin ---');
  const mohsinLedger = await prisma.ledgerEntry.findMany({
    where: {
      partyName: { contains: 'Mohsin', mode: 'insensitive' }
    }
  });
  console.log('Mohsin ledger entries:', JSON.stringify(mohsinLedger, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
