const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkParties() {
  const dogar = await prisma.customer.findMany({
    where: { name: { contains: 'Dogar', mode: 'insensitive' } }
  });
  console.log('Customer matching Dogar:', dogar);

  // Check all orphan ledger entries
  const orphanLedgers = await prisma.ledgerEntry.findMany({
    where: {
      partyId: null,
      partyType: { in: ['CUSTOMER', 'VENDOR', 'EMPLOYEE'] }
    }
  });

  console.log(`\nTotal orphan ledger entries: ${orphanLedgers.length}`);
  for (const ol of orphanLedgers) {
    let match = null;
    if (ol.partyType === 'CUSTOMER') {
      match = await prisma.customer.findFirst({
        where: { name: { equals: (ol.partyName || '').trim(), mode: 'insensitive' } }
      });
      if (!match) {
        match = await prisma.customer.findFirst({
          where: { name: { contains: (ol.partyName || '').trim(), mode: 'insensitive' } }
        });
      }
    } else if (ol.partyType === 'VENDOR') {
      match = await prisma.vendor.findFirst({
        where: { name: { equals: (ol.partyName || '').trim(), mode: 'insensitive' } }
      });
    } else if (ol.partyType === 'EMPLOYEE') {
      match = await prisma.employee.findFirst({
        where: { name: { equals: (ol.partyName || '').trim(), mode: 'insensitive' } }
      });
    }

    console.log(`- [${ol.voucherNumber || ol.referenceId}] partyName: "${ol.partyName}", matched ${ol.partyType}: ${match ? match.name + ' (' + match.id + ')' : 'NO MATCH'}`);
  }
}

checkParties()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
