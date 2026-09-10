const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
  console.log('=== DEEP DIVE INVESTIGATION ===\n');

  // A. Investigate ALTAF INV-10005 duplicate voucher
  console.log('--- A. INV-10005 Duplicate Payment / Voucher ---');
  const inv10005 = await prisma.invoice.findUnique({
    where: { invoiceNumber: 'INV-10005' },
    include: { payments: true }
  });
  console.log('Invoice INV-10005:', {
    id: inv10005?.id,
    invoiceNumber: inv10005?.invoiceNumber,
    clientName: inv10005?.clientName,
    totalAmount: inv10005?.totalAmount,
    amountPaid: inv10005?.amountPaid,
    payments: inv10005?.payments
  });

  const leInv10005 = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { voucherNumber: 'INV-10005' },
        { referenceId: inv10005?.id || '' }
      ]
    }
  });
  console.log('Ledger entries for INV-10005:', leInv10005.map(l => ({
    id: l.id,
    entryDate: l.entryDate,
    voucherNumber: l.voucherNumber,
    voucherType: l.voucherType,
    referenceType: l.referenceType,
    amount: l.amount,
    debit: l.debitAccount,
    credit: l.creditAccount,
    partyName: l.partyName,
    partyId: l.partyId
  })));

  const jeInv10005 = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { sourceId: inv10005?.id },
        { narration: { contains: 'INV-10005' } }
      ]
    },
    include: { lines: { include: { account: true } } }
  });
  console.log('Journal entries for INV-10005:', jeInv10005.map(j => ({
    id: j.id,
    narration: j.narration,
    sourceType: j.sourceType,
    idempotencyKey: j.idempotencyKey,
    lines: j.lines.map(l => ({ account: l.account.name, debit: l.debit, credit: l.credit }))
  })));

  // B. Investigate the 22 LedgerEntries with partyId null
  console.log('\n--- B. 22 LedgerEntries with partyType set but partyId null ---');
  const orphanLedgers = await prisma.ledgerEntry.findMany({
    where: {
      partyId: null,
      partyType: { not: null }
    }
  });
  for (const ol of orphanLedgers) {
    console.log(`- [${ol.voucherType || ol.referenceType}] ${ol.voucherNumber || ol.referenceId} | ${ol.entryDate.toISOString().slice(0,10)} | ${ol.partyType} | "${ol.partyName}" | Amt: ${ol.amount} | Dr: ${ol.debitAccount} Cr: ${ol.creditAccount}`);
  }

  // C. Investigate Invoices where total != line sum (Discount handling!)
  console.log('\n--- C. Invoices with discrepancy between lines and total ---');
  const sampleInvoices = await prisma.invoice.findMany({
    where: {
      invoiceNumber: { in: ['INV-10007', 'INV-10013', 'INV-10012', 'INV-10011', 'INV-10016'] }
    },
    include: { lineItems: true }
  });
  for (const inv of sampleInvoices) {
    console.log(`Invoice ${inv.invoiceNumber}:`);
    console.log(`  clientName: ${inv.clientName}, customerId: ${inv.customerId}`);
    console.log(`  totalAmount: ${inv.totalAmount}, notes: ${inv.notes}`);
    console.log(`  isAdvance: ${inv.isAdvance}, isGst: ${inv.isGst}`);
    console.log(`  lines:`, inv.lineItems.map(l => ({ desc: l.description, qty: l.quantity, price: l.salesPrice })));
  }

  // D. Check Quotations conversion discount bug
  console.log('\n--- D. Checking Quotations conversion logic and notes ---');
  const sampleQuotes = await prisma.quotation.findMany({
    where: {
      convertedInvoiceId: { not: null }
    }
  });
  for (const q of sampleQuotes) {
    console.log(`Quotation ${q.quotationNumber} -> Invoice ID ${q.convertedInvoiceId}: total=${q.totalAmount}, notes=${q.notes}`);
  }

  console.log('\n=== INVESTIGATION COMPLETE ===');
}

investigate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
