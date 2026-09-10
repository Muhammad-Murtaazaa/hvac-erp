const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectBRV() {
  const entries = await prisma.ledgerEntry.findMany({
    where: { voucherNumber: 'BRV-10002' }
  });
  console.log('BRV-10002 Ledger Entries:', entries);

  const journals = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { sourceId: 'BRV-10002' },
        { narration: { contains: 'BRV-10002' } }
      ]
    },
    include: { lines: { include: { account: true } } }
  });
  console.log('BRV-10002 Journals:', journals);
}

inspectBRV()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
