const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDoublePayments() {
  console.log('--- Checking for duplicate invoice payments across LedgerEntry and Invoice.payments ---');
  
  const invoices = await prisma.invoice.findMany({
    where: {
      payments: { some: {} }
    },
    include: {
      payments: true,
      customer: true
    }
  });

  console.log(`Invoices with payments: ${invoices.length}`);

  for (const inv of invoices) {
    const ledgerPayments = await prisma.ledgerEntry.findMany({
      where: {
        OR: [
          { referenceId: inv.id },
          { voucherNumber: inv.invoiceNumber, voucherType: { in: ['CRV', 'BRV', 'CPV', 'BPV'] } },
          { description: { contains: inv.invoiceNumber } }
        ],
        creditAccount: { contains: 'Receivable' }
      }
    });

    if (ledgerPayments.length > 0 && inv.payments.length > 0) {
      console.log(`\nInvoice ${inv.invoiceNumber} (${inv.clientName}):`);
      console.log(`  Total: ${inv.totalAmount}, Paid in inv: ${inv.amountPaid}`);
      console.log(`  Invoice.payments (${inv.payments.length}):`, inv.payments.map(p => ({ id: p.id, amount: p.amountPaid, date: p.paymentDate })));
      console.log(`  LedgerEntry payments (${ledgerPayments.length}):`, ledgerPayments.map(l => ({ id: l.id, voucher: l.voucherNumber, type: l.voucherType, amount: l.amount, date: l.entryDate })));
    }
  }

  // Also check party ledger output for ALTAF
  const { getPartyStatementOfAccount } = require('../src/lib/partyLedger');
  try {
    const altafCust = await prisma.customer.findFirst({ where: { name: { contains: 'ALTAF', mode: 'insensitive' } } });
    if (altafCust) {
      const soa = await getPartyStatementOfAccount({
        partyId: altafCust.id,
        partyType: 'CUSTOMER',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31')
      });
      console.log('\nParty Statement for ALTAF:', {
        party: soa.party.name,
        openingBalance: soa.openingBalance,
        closingBalance: soa.closingBalance,
        totalDebits: soa.totalDebits,
        totalCredits: soa.totalCredits,
        itemsCount: soa.items.length,
        items: soa.items.map(i => ({ date: i.date, ref: i.referenceNumber, desc: i.description, dr: i.debit, cr: i.credit, balance: i.runningBalance }))
      });
    }
  } catch (err) {
    console.error('Error getting party statement:', err);
  }
}

checkDoublePayments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
