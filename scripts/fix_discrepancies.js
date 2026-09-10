const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runFixes() {
  console.log('================================================================');
  console.log('STARTING SAFE LOCALHOST DISCREPANCY RECONCILIATION & FIX SCRIPT');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // 1. DEDUPLICATE VOUCHER BPV-10001 IN JOURNAL ENTRIES
  // -------------------------------------------------------------
  console.log('--- 1. Deduplicating JournalEntry for BPV-10001 ---');
  const duplicateBpvBackfill = await prisma.journalEntry.findFirst({
    where: {
      OR: [
        { idempotencyKey: 'LEGACY_BACKFILL:a198b58a-4d4b-46eb-b88e-e431f9b8d076' },
        {
          idempotencyKey: { startsWith: 'LEGACY_BACKFILL:' },
          narration: { contains: 'BPV-10001' }
        },
        {
          idempotencyKey: { startsWith: 'LEGACY_BACKFILL:' },
          narration: { contains: 'MIA TECHNICAL SERVICE' }
        }
      ]
    },
    include: { lines: true }
  });

  if (duplicateBpvBackfill) {
    console.log(`Found duplicate backfill entry ${duplicateBpvBackfill.id} for BPV-10001. Deleting lines and entry...`);
    await prisma.journalLine.deleteMany({
      where: { journalEntryId: duplicateBpvBackfill.id }
    });
    await prisma.journalEntry.delete({
      where: { id: duplicateBpvBackfill.id }
    });
    console.log('Successfully removed duplicate BPV-10001 journal entry.');
  } else {
    console.log('Duplicate BPV-10001 journal entry already removed or not present.');
  }

  // -------------------------------------------------------------
  // 2. DEDUPLICATE ANY OTHER BACKFILL ENTRIES WITH LIVE COUNTERPARTS
  // -------------------------------------------------------------
  console.log('\n--- 2. Checking other duplicate live vs backfill journal entries ---');
  const liveEntries = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { idempotencyKey: { startsWith: 'INVOICE:' } },
        { idempotencyKey: { startsWith: 'VOUCHER:' } },
        { idempotencyKey: { startsWith: 'GRN:' } }
      ]
    }
  });

  const liveSourceMap = new Map();
  liveEntries.forEach(e => {
    if (e.sourceId) {
      if (!liveSourceMap.has(e.sourceId)) liveSourceMap.set(e.sourceId, []);
      liveSourceMap.get(e.sourceId).push(e);
    }
  });

  for (const [sourceId, liveList] of liveSourceMap.entries()) {
    const backfillEntries = await prisma.journalEntry.findMany({
      where: {
        sourceId,
        idempotencyKey: { startsWith: 'LEGACY_BACKFILL:' }
      }
    });

    for (const bf of backfillEntries) {
      const matchingLive = liveList.find(l => l.narration === bf.narration);
      if (matchingLive) {
        console.log(`Removing redundant backfill entry ${bf.id} (${bf.idempotencyKey}) matching live ${matchingLive.id}`);
        await prisma.journalLine.deleteMany({ where: { journalEntryId: bf.id } });
        await prisma.journalEntry.delete({ where: { id: bf.id } });
      }
    }
  }

  // -------------------------------------------------------------
  // 3. RECONCILE PO-10002 (GRN-10005) TO DISCOUNTED AMOUNT (221,250 PKR)
  // -------------------------------------------------------------
  console.log('\n--- 3. Reconciling PO-10002 / GRN-10005 to 221,250 PKR (25% Discount) ---');
  const grn5 = await prisma.goodsReceivedNote.findUnique({
    where: { grnNumber: 'GRN-10005' },
    include: { lineItems: true }
  });

  if (grn5) {
    for (const item of grn5.lineItems) {
      await prisma.gRNLineItem.update({
        where: { id: item.id },
        data: { unitCost: 221250 }
      });
      await prisma.product.update({
        where: { id: item.productId },
        data: { averageCost: 221250 }
      });
    }

    await prisma.ledgerEntry.updateMany({
      where: { voucherNumber: 'GRN-10005' },
      data: { amount: 221250 }
    });

    const grn5Je = await prisma.journalEntry.findFirst({
      where: { sourceId: grn5.id }
    });
    if (grn5Je) {
      await prisma.journalLine.updateMany({
        where: { journalEntryId: grn5Je.id, debit: { gt: 0 } },
        data: { debit: 221250 }
      });
      await prisma.journalLine.updateMany({
        where: { journalEntryId: grn5Je.id, credit: { gt: 0 } },
        data: { credit: 221250 }
      });
    }
    console.log('GRN-10005 successfully reconciled to 221,250 PKR.');
  }

  // -------------------------------------------------------------
  // 4. RECONCILE PO-10003 (GRN-10004) TO DISCOUNTED AMOUNT (128,000 PKR)
  // -------------------------------------------------------------
  console.log('\n--- 4. Reconciling PO-10003 / GRN-10004 to 128,000 PKR (20% Discount) ---');
  const grn4 = await prisma.goodsReceivedNote.findUnique({
    where: { grnNumber: 'GRN-10004' },
    include: { lineItems: { include: { product: true } } }
  });

  if (grn4) {
    for (const item of grn4.lineItems) {
      let discountedCost = 60000;
      if (item.product?.sku === 'ARC002' || item.unitCost == 85000) {
        discountedCost = 68000;
      }

      await prisma.gRNLineItem.update({
        where: { id: item.id },
        data: { unitCost: discountedCost }
      });

      await prisma.product.update({
        where: { id: item.productId },
        data: { averageCost: discountedCost }
      });
    }

    const grn4Les = await prisma.ledgerEntry.findMany({
      where: { voucherNumber: 'GRN-10004' }
    });
    for (const le of grn4Les) {
      let corrected = 60000;
      if (le.amount == 85000) corrected = 68000;
      await prisma.ledgerEntry.update({
        where: { id: le.id },
        data: { amount: corrected }
      });
    }

    const grn4Je = await prisma.journalEntry.findFirst({
      where: { sourceId: grn4.id }
    });
    if (grn4Je) {
      await prisma.journalLine.updateMany({
        where: { journalEntryId: grn4Je.id, debit: { gt: 0 } },
        data: { debit: 128000 }
      });
      await prisma.journalLine.updateMany({
        where: { journalEntryId: grn4Je.id, credit: { gt: 0 } },
        data: { credit: 128000 }
      });
    }
    console.log('GRN-10004 successfully reconciled to 128,000 PKR.');
  }

  // -------------------------------------------------------------
  // 5. RECONCILE PO-10004 (GRN-10006) TO DISCOUNTED AMOUNT (979,200 PKR)
  // -------------------------------------------------------------
  console.log('\n--- 5. Reconciling PO-10004 / GRN-10006 to 979,200 PKR (15% Discount) ---');
  const grn6 = await prisma.goodsReceivedNote.findUnique({
    where: { grnNumber: 'GRN-10006' },
    include: { lineItems: true }
  });

  if (grn6) {
    for (const item of grn6.lineItems) {
      await prisma.gRNLineItem.update({
        where: { id: item.id },
        data: { unitCost: 163200 }
      });
      await prisma.product.update({
        where: { id: item.productId },
        data: { averageCost: 163200 }
      });
    }

    await prisma.ledgerEntry.updateMany({
      where: { voucherNumber: 'GRN-10006' },
      data: { amount: 979200 }
    });

    const grn6Je = await prisma.journalEntry.findFirst({
      where: { sourceId: grn6.id }
    });
    if (grn6Je) {
      await prisma.journalLine.updateMany({
        where: { journalEntryId: grn6Je.id, debit: { gt: 0 } },
        data: { debit: 979200 }
      });
      await prisma.journalLine.updateMany({
        where: { journalEntryId: grn6Je.id, credit: { gt: 0 } },
        data: { credit: 979200 }
      });
    }
    console.log('GRN-10006 successfully reconciled to 979,200 PKR.');
  }

  console.log('\n================================================================');
  console.log('DISCREPANCY RECONCILIATION COMPLETED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runFixes()
  .catch(err => {
    console.error('Error running fix script:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
