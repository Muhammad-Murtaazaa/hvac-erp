const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('=== 1. BPV-10001 JOURNAL ENTRIES COUNT ===');
  const bpvJes = await prisma.journalEntry.findMany({ where: { sourceId: 'BPV-10001' } });
  console.log('BPV-10001 count (expect 1):', bpvJes.length);
  console.log('Details:', bpvJes.map(j => ({ id: j.id, key: j.idempotencyKey, narration: j.narration })));

  console.log('\n=== 2. GRN-10005 AMOUNTS (PO-10002, expect 221,250) ===');
  const grn5 = await prisma.goodsReceivedNote.findUnique({ where: { grnNumber: 'GRN-10005' }, include: { lineItems: true } });
  const grn5Le = await prisma.ledgerEntry.findMany({ where: { voucherNumber: 'GRN-10005' } });
  const grn5Je = await prisma.journalEntry.findFirst({ where: { sourceId: grn5.id }, include: { lines: true } });
  console.log('GRNLineItem unitCost:', Number(grn5.lineItems[0].unitCost));
  console.log('LedgerEntry amount:', Number(grn5Le[0].amount));
  console.log('JournalLine debit:', Number(grn5Je.lines.find(l => l.debit > 0)?.debit));
  console.log('JournalLine credit:', Number(grn5Je.lines.find(l => l.credit > 0)?.credit));

  console.log('\n=== 3. GRN-10004 AMOUNTS (PO-10003, expect 128,000 total) ===');
  const grn4 = await prisma.goodsReceivedNote.findUnique({ where: { grnNumber: 'GRN-10004' }, include: { lineItems: true } });
  const grn4Le = await prisma.ledgerEntry.findMany({ where: { voucherNumber: 'GRN-10004' } });
  const grn4Je = await prisma.journalEntry.findFirst({ where: { sourceId: grn4.id }, include: { lines: true } });
  console.log('GRNLineItem unitCosts:', grn4.lineItems.map(l => Number(l.unitCost)));
  console.log('LedgerEntry amounts:', grn4Le.map(l => Number(l.amount)), 'Total:', grn4Le.reduce((s, l) => s + Number(l.amount), 0));
  console.log('JournalLine debit:', Number(grn4Je.lines.find(l => l.debit > 0)?.debit));
  console.log('JournalLine credit:', Number(grn4Je.lines.find(l => l.credit > 0)?.credit));

  console.log('\n=== 4. GRN-10006 AMOUNTS (PO-10004, expect 979,200) ===');
  const grn6 = await prisma.goodsReceivedNote.findUnique({ where: { grnNumber: 'GRN-10006' }, include: { lineItems: true } });
  const grn6Le = await prisma.ledgerEntry.findMany({ where: { voucherNumber: 'GRN-10006' } });
  const grn6Je = await prisma.journalEntry.findFirst({ where: { sourceId: grn6.id }, include: { lines: true } });
  console.log('GRNLineItem unitCost:', Number(grn6.lineItems[0].unitCost), 'x 6 =', Number(grn6.lineItems[0].unitCost) * 6);
  console.log('LedgerEntry amount:', Number(grn6Le[0].amount));
  console.log('JournalLine debit:', Number(grn6Je.lines.find(l => l.debit > 0)?.debit));

  console.log('\n=== 5. ALL TRANSACTIONS FOR MIA TECHNICAL SERVICES ===');
  const miaLes = await prisma.ledgerEntry.findMany({
    where: { partyName: { contains: 'MIA TECHNICAL', mode: 'insensitive' } },
    orderBy: { entryDate: 'asc' }
  });
  console.table(miaLes.map(l => ({
    date: l.entryDate?.toISOString().split('T')[0],
    voucher: l.voucherNumber,
    type: l.referenceType,
    amount: Number(l.amount),
    debitAcc: l.debitAccount,
    creditAcc: l.creditAccount
  })));
}

verify().catch(console.error).finally(() => prisma.$disconnect());
