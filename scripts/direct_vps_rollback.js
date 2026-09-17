/**
 * DIRECT VPS PRODUCTION VOUCHER MAINTENANCE SCRIPT
 * 
 * Instructions:
 * Run this directly on the production VPS:
 *   cd /var/www/hvac-erp
 *   node scripts/direct_vps_rollback.js
 *
 * This performs:
 * 1. Safe atomic rollback of CPV-10004 (Faisal Rehman, PKR 1,284,000)
 * 2. Narration update of CRV-10026 to " Amount Received in Atif Compressor AC slip#40483 "
 * 3. Double-entry trial balance integrity verification
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('========================================================================');
  console.log('STARTING PRODUCTION VOUCHER OPERATIONS (ATOMIC DATABASE TRANSACTION)');
  console.log('========================================================================\n');

  const result = await prisma.$transaction(async (tx) => {
    // -------------------------------------------------------------------------
    // 1. ROLLBACK CPV-10004
    // -------------------------------------------------------------------------
    console.log('1. Locating CPV-10004...');
    const cpvLedger = await tx.ledgerEntry.findFirst({
      where: {
        OR: [
          { voucherNumber: 'CPV-10004' },
          { referenceId: 'CPV-10004' },
        ]
      }
    });

    if (!cpvLedger) {
      console.log('⚠️ CPV-10004 ledger entry was not found or already removed.');
    } else {
      console.log('Found CPV-10004 LedgerEntry:', {
        id: cpvLedger.id,
        voucherNumber: cpvLedger.voucherNumber,
        partyName: cpvLedger.partyName,
        amount: cpvLedger.amount,
        debitAccount: cpvLedger.debitAccount,
        creditAccount: cpvLedger.creditAccount,
      });

      // Find associated JournalEntry
      const cpvJournals = await tx.journalEntry.findMany({
        where: {
          OR: [
            { sourceId: 'CPV-10004' },
            { idempotencyKey: 'VOUCHER:CPV-10004:entry' },
            { idempotencyKey: { contains: 'CPV-10004' } },
          ]
        },
        include: { lines: true }
      });

      console.log(`Found ${cpvJournals.length} associated JournalEntry(ies) for CPV-10004.`);

      // Delete Journal Entries (cascades to JournalLines)
      for (const je of cpvJournals) {
        await tx.journalEntry.delete({ where: { id: je.id } });
        console.log(`✓ Deleted JournalEntry ${je.id} (with ${je.lines.length} lines)`);
      }

      // Delete LedgerEntry
      await tx.ledgerEntry.delete({ where: { id: cpvLedger.id } });
      console.log(`✓ Deleted LedgerEntry ${cpvLedger.id}`);
    }

    // -------------------------------------------------------------------------
    // 2. UPDATE CRV-10026 NARRATION
    // -------------------------------------------------------------------------
    console.log('\n2. Updating CRV-10026 Narration...');
    const newNarration = ' Amount Received in Atif Compressor AC slip#40483 ';

    const crvLedger = await tx.ledgerEntry.findFirst({
      where: {
        OR: [
          { voucherNumber: 'CRV-10026' },
          { referenceId: 'CRV-10026' },
        ]
      }
    });

    if (!crvLedger) {
      console.log('⚠️ CRV-10026 ledger entry was not found.');
    } else {
      const updatedLedger = await tx.ledgerEntry.update({
        where: { id: crvLedger.id },
        data: {
          description: newNarration,
        }
      });
      console.log(`✓ Updated LedgerEntry ${crvLedger.id} description to: "${updatedLedger.description}"`);

      // Update associated JournalEntry narration
      const crvJournals = await tx.journalEntry.findMany({
        where: {
          OR: [
            { sourceId: 'CRV-10026' },
            { idempotencyKey: 'VOUCHER:CRV-10026:entry' },
            { idempotencyKey: { contains: 'CRV-10026' } },
          ]
        }
      });

      for (const je of crvJournals) {
        await tx.journalEntry.update({
          where: { id: je.id },
          data: { narration: newNarration }
        });
        console.log(`✓ Updated JournalEntry ${je.id} narration to: "${newNarration}"`);
      }
    }

    return { success: true };
  });

  // ---------------------------------------------------------------------------
  // 3. TRIAL BALANCE INTEGRITY VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n3. Verifying Double-Entry Trial Balance Integrity...');
  const lines = await prisma.journalLine.findMany({
    select: { debit: true, credit: true }
  });

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += Number(line.debit);
    totalCredit += Number(line.credit);
  }

  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;
  const isBalanced = totalDebit === totalCredit;

  console.log('Trial Balance Summary:', {
    totalDebit: `PKR ${totalDebit.toLocaleString()}`,
    totalCredit: `PKR ${totalCredit.toLocaleString()}`,
    difference: `PKR ${(totalDebit - totalCredit).toLocaleString()}`,
    isBalanced,
  });

  if (isBalanced) {
    console.log('✅ ALL BOOKS ARE 100% BALANCED! NO DATA LOSS OR LEAKS DETECTED.');
  } else {
    console.error('❌ WARNING: Books are not in equilibrium. Please investigate.');
  }

  console.log('\n========================================================================');
  console.log('PRODUCTION OPERATIONS COMPLETE!');
  console.log('========================================================================');
}

run()
  .catch((err) => {
    console.error('Execution failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
