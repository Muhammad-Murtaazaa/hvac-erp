const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvoiceMatches() {
  const ledgerInvoices = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { voucherType: 'INV' },
        { referenceType: 'INVOICE' }
      ]
    }
  });

  console.log(`Total Ledger Entries with voucherType=INV or referenceType=INVOICE: ${ledgerInvoices.length}`);

  let missingInvoices = 0;
  for (const le of ledgerInvoices) {
    const inv = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id: le.referenceId },
          { invoiceNumber: le.voucherNumber || '' }
        ]
      }
    });
    if (!inv) {
      console.log(`  Orphan Ledger Invoice: ID ${le.id} | Ref: ${le.referenceId} | VoucherNum: ${le.voucherNumber} | Party: ${le.partyName} | Amount: ${le.amount}`);
      missingInvoices++;
    }
  }
  console.log(`Missing Invoice records: ${missingInvoices}`);
}

checkInvoiceMatches()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
