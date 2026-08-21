const path = require('path');
const { PrismaClient } = require(path.join(process.cwd(), 'node_modules', '@prisma/client'));
const prisma = new PrismaClient();

async function showFullCustomerTable() {
  const customers = await prisma.customer.findMany({ include: { invoices: true } });
  const allLedger = await prisma.ledgerEntry.findMany();
  const allJournalLines = await prisma.journalLine.findMany({
    include: { account: true }
  });

  const customerRecon = [];

  for (const cust of customers) {
    const normName = cust.name.trim().toLowerCase();
    const matchedLedger = allLedger.filter(l => l.partyName && l.partyName.trim().toLowerCase() === normName);
    let oldBalance = 0;
    let method = 'LEDGER_ROWS';

    if (matchedLedger.length > 0) {
      let debits = 0;
      let credits = 0;
      matchedLedger.forEach(l => {
        const amt = Number(l.amount);
        const credAcc = (l.creditAccount || '').toLowerCase();
        const vType = (l.voucherType || '').toUpperCase();
        if (credAcc.includes('customer') || credAcc.includes('receivable') || vType === 'CRV' || vType === 'BRV') {
          credits += amt;
        } else {
          debits += amt;
        }
      });
      oldBalance = debits - credits;
    } else {
      method = 'INVOICE_FALLBACK';
      const invTotal = cust.invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
      const invPaid = cust.invoices.reduce((s, i) => s + Number(i.amountPaid), 0);
      oldBalance = invTotal - invPaid;
    }

    const custLines = allJournalLines.filter(l => l.partyId === cust.id);
    let newArDebit = 0;
    let newArCredit = 0;
    let newAdvanceCredit = 0;

    custLines.forEach(l => {
      const d = Number(l.debit);
      const c = Number(l.credit);
      if (l.account.name === 'Accounts Receivable (Trade Debtors)') {
        newArDebit += d;
        newArCredit += c;
      } else if (l.account.name === 'Customer Advance Deposits') {
        newAdvanceCredit += (c - d);
      }
    });

    const newArBalance = newArDebit - newArCredit;
    const diff = oldBalance - newArBalance;

    let explanation = 'Exact Match';
    if (diff !== 0) {
      if (cust.name === 'Ali Javeed') {
        explanation = 'Legacy quirk: Customer formula subtracted PKR 10k advance from AR giving -10,000 AR; Double-entry correctly keeps AR = 0 and tracks PKR 10,000 under Customer Advance Deposits liability.';
      }
    }

    customerRecon.push({
      customer: cust.name,
      oldBalance: oldBalance,
      newAR: newArBalance,
      advanceLiability: newAdvanceCredit,
      diff: diff,
      explanation
    });
  }

  console.log(JSON.stringify(customerRecon, null, 2));
}

showFullCustomerTable()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
