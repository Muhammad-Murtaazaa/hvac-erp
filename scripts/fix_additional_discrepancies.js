const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAdditionalDiscrepancies() {
  console.log('=== FIXING ADDITIONAL DISCREPANCIES IN LOCALHOST ===\n');

  // 1. Link orphan ledger entries to their verified party IDs
  console.log('1. Linking orphan ledger entries to verified parties...');

  // Safraz Dogar Sb
  const safraz = await prisma.customer.findFirst({ where: { name: { contains: 'Safraz Dogar', mode: 'insensitive' } } });
  if (safraz) {
    const updatedDogar = await prisma.ledgerEntry.updateMany({
      where: {
        voucherNumber: { in: ['CRV-10024', 'CRV-10025'] },
        partyId: null
      },
      data: {
        partyId: safraz.id,
        partyName: safraz.name,
        partyType: 'CUSTOMER'
      }
    });
    console.log(`  Linked ${updatedDogar.count} entries to ${safraz.name} (${safraz.id})`);
  }

  // Mr. Manawar
  const manawar = await prisma.customer.findFirst({ where: { name: { contains: 'Manawar', mode: 'insensitive' } } });
  if (manawar) {
    const updatedManawar = await prisma.ledgerEntry.updateMany({
      where: {
        voucherNumber: 'INV-10002',
        partyId: null
      },
      data: {
        partyId: manawar.id,
        partyName: manawar.name,
        partyType: 'CUSTOMER'
      }
    });
    console.log(`  Linked ${updatedManawar.count} entries to ${manawar.name} (${manawar.id})`);
  }

  // Ali Javeed
  const ali = await prisma.customer.findFirst({ where: { name: { contains: 'Ali Javeed', mode: 'insensitive' } } });
  if (ali) {
    const updatedAli = await prisma.ledgerEntry.updateMany({
      where: {
        voucherNumber: 'CRV-10001',
        partyId: null
      },
      data: {
        partyId: ali.id,
        partyName: ali.name,
        partyType: 'CUSTOMER'
      }
    });
    console.log(`  Linked ${updatedAli.count} entries to ${ali.name} (${ali.id})`);
  }

  // talha bhai
  const talha = await prisma.customer.findFirst({ where: { name: { contains: 'talha', mode: 'insensitive' } } });
  if (talha) {
    const updatedTalha = await prisma.ledgerEntry.updateMany({
      where: {
        voucherNumber: { in: ['INV-10003', 'INV-10004'] },
        partyId: null
      },
      data: {
        partyId: talha.id,
        partyName: talha.name,
        partyType: 'CUSTOMER'
      }
    });
    console.log(`  Linked ${updatedTalha.count} entries to ${talha.name} (${talha.id})`);
  }

  // Abdul Qayyum
  const abdul = await prisma.customer.findFirst({ where: { name: { contains: 'Abdul Qayyum', mode: 'insensitive' } } });
  if (abdul) {
    const updatedAbdul = await prisma.ledgerEntry.updateMany({
      where: {
        voucherNumber: 'INV-10009',
        partyId: null
      },
      data: {
        partyId: abdul.id,
        partyName: abdul.name,
        partyType: 'CUSTOMER'
      }
    });
    console.log(`  Linked ${updatedAbdul.count} entries to ${abdul.name} (${abdul.id})`);
  }

  // Green Leaves Pvt Ltd (BRV-10002)
  const green = await prisma.customer.findFirst({ where: { name: { contains: 'Green Leaves', mode: 'insensitive' } } });
  if (green) {
    const updatedGreen = await prisma.ledgerEntry.updateMany({
      where: {
        voucherNumber: 'BRV-10002',
        partyId: null
      },
      data: {
        partyId: green.id,
        partyName: green.name,
        partyType: 'CUSTOMER'
      }
    });
    console.log(`  Linked ${updatedGreen.count} entries to ${green.name} (${green.id})`);

    // Also update journal lines for BRV-10002 to attach partyId
    const brvJournal = await prisma.journalEntry.findFirst({
      where: { sourceId: 'BRV-10002' },
      include: { lines: true }
    });
    if (brvJournal) {
      for (const line of brvJournal.lines) {
        if (!line.partyId) {
          await prisma.journalLine.update({
            where: { id: line.id },
            data: { partyId: green.id }
          });
        }
      }
      console.log(`  Updated JournalLines for BRV-10002 with partyId: ${green.id}`);
    }
  }

  // 2. Fix duplicate payment for INV-10005 (ALTAF)
  console.log('\n2. Reconciling duplicate payment for INV-10005 (ALTAF)...');
  const dupBackfillJE = await prisma.journalEntry.findUnique({
    where: { idempotencyKey: 'LEGACY_BACKFILL:8a3caa23-3fea-4e4d-a740-acbf39d6e8c8' }
  });
  if (dupBackfillJE) {
    await prisma.journalLine.deleteMany({ where: { journalEntryId: dupBackfillJE.id } });
    await prisma.journalEntry.delete({ where: { id: dupBackfillJE.id } });
    console.log('  Deleted duplicate legacy backfill JournalEntry for INV-10005');
  }

  const dupLedgerEntry = await prisma.ledgerEntry.findUnique({
    where: { id: '8a3caa23-3fea-4e4d-a740-acbf39d6e8c8' }
  });
  if (dupLedgerEntry) {
    await prisma.ledgerEntry.delete({ where: { id: '8a3caa23-3fea-4e4d-a740-acbf39d6e8c8' } });
    console.log('  Deleted duplicate LedgerEntry 8a3caa23-3fea-4e4d-a740-acbf39d6e8c8 for INV-10005');
  }

  // Remove zero payment record if exists
  const zeroPayment = await prisma.payment.findUnique({
    where: { id: 'b44e331b-c237-4967-81a7-a49ea9838c73' }
  });
  if (zeroPayment && Number(zeroPayment.amountPaid) === 0) {
    await prisma.payment.delete({ where: { id: zeroPayment.id } });
    console.log('  Deleted redundant 0-amount payment record for INV-10005');
  }

  console.log('\n=== RECONCILIATION COMPLETED SUCCESSFULLY ===');
}

fixAdditionalDiscrepancies()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
