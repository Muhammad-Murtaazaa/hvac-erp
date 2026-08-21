const path = require('path');
const { PrismaClient } = require(path.join(process.cwd(), 'node_modules', '@prisma/client'));
const prisma = new PrismaClient();

const CANONICAL_ACCOUNTS = [
  { name: 'Accounts Receivable (Trade Debtors)', type: 'ASSET', isPartyControl: true, legacyAliases: ['Accounts Receivable', 'Accounts Receivable (Trade Debtors)', 'AR'] },
  { name: 'Accounts Payable (Trade Creditors)', type: 'LIABILITY', isPartyControl: true, legacyAliases: ['Accounts Payable', 'Accounts Payable (Trade Creditors)', 'AP'] },
  { name: 'Customer Advance Deposits', type: 'LIABILITY', isPartyControl: true, legacyAliases: ['Customer Advance Deposits', 'Advance Deposit'] },
  { name: 'Employee Advance', type: 'ASSET', isPartyControl: true, legacyAliases: ['Employee Advance', 'Staff Advance'] },
  { name: 'Sales Revenue', type: 'INCOME', isPartyControl: false, legacyAliases: ['Sales Revenue'] },
  { name: 'Service & Maintenance Income', type: 'INCOME', isPartyControl: false, legacyAliases: ['Service & Maintenance Income'] },
  { name: 'Cost of Goods Sold', type: 'EXPENSE', isPartyControl: false, legacyAliases: ['Cost of Goods Sold', 'COGS'] },
  { name: 'Inventory Asset', type: 'ASSET', isPartyControl: false, legacyAliases: ['Inventory Asset', 'Inventory'] },
  { name: 'Salary Expense', type: 'EXPENSE', isPartyControl: false, legacyAliases: ['Salary Expense'] },
  { name: 'Cash in Hand', type: 'ASSET', isPartyControl: false, legacyAliases: ['Cash in Hand', 'Cash'] },
  { name: 'Bank Account (Meezan Bank)', type: 'ASSET', isPartyControl: false, legacyAliases: ['Bank Account (Meezan Bank)', 'Bank Account', 'Bank'] },
  { name: 'Sales Tax Payable', type: 'LIABILITY', isPartyControl: false, legacyAliases: ['Sales Tax Payable', 'GST Payable'] },
  { name: 'Purchase Price Variance', type: 'EXPENSE', isPartyControl: false, legacyAliases: ['Purchase Price Variance'] },
  { name: 'Inventory Adjustment Expense', type: 'EXPENSE', isPartyControl: false, legacyAliases: ['Inventory Adjustment Expense'] },
  { name: 'Owner Equity / Capital', type: 'EQUITY', isPartyControl: false, legacyAliases: ['Owner Equity / Capital', 'Capital'] }
];

function mapLegacyAccount(rawName, entry) {
  if (!rawName) return null;
  const name = rawName.trim();

  if (name === 'Cash/Bank') {
    const isBank = (entry.paymentMethod && entry.paymentMethod.toUpperCase() === 'BANK') ||
                   (entry.description && entry.description.toUpperCase().includes('BANK')) ||
                   (entry.voucherType && entry.voucherType.toUpperCase() === 'BRV');
    return isBank ? 'Bank Account (Meezan Bank)' : 'Cash in Hand';
  }

  for (const acc of CANONICAL_ACCOUNTS) {
    if (acc.name.toLowerCase() === name.toLowerCase()) return acc.name;
    if (acc.legacyAliases.some(alias => alias.toLowerCase() === name.toLowerCase())) {
      return acc.name;
    }
  }

  if (name.toLowerCase().includes('receivable')) return 'Accounts Receivable (Trade Debtors)';
  if (name.toLowerCase().includes('payable')) return 'Accounts Payable (Trade Creditors)';
  if (name.toLowerCase().includes('advance deposit')) return 'Customer Advance Deposits';
  if (name.toLowerCase().includes('meezan') || name.toLowerCase().includes('bank')) return 'Bank Account (Meezan Bank)';
  if (name.toLowerCase().includes('cash')) return 'Cash in Hand';
  if (name.toLowerCase().includes('revenue') || name.toLowerCase().includes('sales')) return 'Sales Revenue';
  if (name.toLowerCase().includes('service') || name.toLowerCase().includes('maintenance')) return 'Service & Maintenance Income';
  if (name.toLowerCase().includes('cogs') || name.toLowerCase().includes('goods sold')) return 'Cost of Goods Sold';
  if (name.toLowerCase().includes('inventory')) return 'Inventory Asset';
  if (name.toLowerCase().includes('salary')) return 'Salary Expense';

  return name;
}

async function runCommit() {
  console.log('--- 1. SEEDING / ENSURING CANONICAL ACCOUNTS ---');
  const accountMap = new Map(); // name -> Account record

  for (const acc of CANONICAL_ACCOUNTS) {
    const upserted = await prisma.account.upsert({
      where: { name: acc.name },
      update: {
        type: acc.type,
        isPartyControl: acc.isPartyControl,
        legacyAliases: acc.legacyAliases
      },
      create: {
        name: acc.name,
        type: acc.type,
        isPartyControl: acc.isPartyControl,
        legacyAliases: acc.legacyAliases
      }
    });
    accountMap.set(acc.name, upserted);
  }
  console.log(`Ensured ${accountMap.size} canonical accounts in DB.`);

  console.log('\n--- 2. FETCHING SOURCE DATA ---');
  const entries = await prisma.ledgerEntry.findMany({ orderBy: { createdAt: 'asc' } });
  const customers = await prisma.customer.findMany();
  const vendors = await prisma.vendor.findMany();
  const employees = await prisma.employee.findMany();
  const invoices = await prisma.invoice.findMany();
  const grns = await prisma.goodsReceivedNote.findMany({ include: { purchaseOrder: { include: { vendor: true } } } });

  console.log(`Processing ${entries.length} legacy LedgerEntry rows...`);

  await prisma.$transaction(async (tx) => {
    for (const entry of entries) {
      const idempotencyKey = `LEGACY_BACKFILL:${entry.id}`;
      const existing = await tx.journalEntry.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        console.log(`Skipping already backfilled entry: ${idempotencyKey}`);
        continue;
      }
      const canonicalDebit = mapLegacyAccount(entry.debitAccount, entry);
      const canonicalCredit = mapLegacyAccount(entry.creditAccount, entry);

      const debitAccObj = accountMap.get(canonicalDebit);
      const creditAccObj = accountMap.get(canonicalCredit);

      if (!debitAccObj || !creditAccObj) {
        throw new Error(`Unmapped account encountered: debit=${canonicalDebit}, credit=${canonicalCredit}`);
      }

      // Resolve Party ID
      let resolvedPartyId = entry.partyId || null;

      if (!resolvedPartyId) {
        if (entry.partyName) {
          const pName = entry.partyName.trim().toLowerCase();
          const cMatch = customers.find(c => c.name.trim().toLowerCase() === pName);
          const vMatch = vendors.find(v => v.name.trim().toLowerCase() === pName);
          const eMatch = employees.find(e => e.name.trim().toLowerCase() === pName);

          if (cMatch) resolvedPartyId = cMatch.id;
          else if (vMatch) resolvedPartyId = vMatch.id;
          else if (eMatch) resolvedPartyId = eMatch.id;
        }

        if (!resolvedPartyId && entry.referenceType === 'PO_RECEIPT') {
          const grn = grns.find(g => g.id === entry.referenceId);
          if (grn?.purchaseOrder?.vendor) {
            resolvedPartyId = grn.purchaseOrder.vendor.id;
          }
        }

        if (!resolvedPartyId && entry.referenceType === 'INVOICE') {
          const inv = invoices.find(i => i.id === entry.referenceId);
          if (inv?.customerId) {
            resolvedPartyId = inv.customerId;
          }
        }
      }

      // Determine partyId on lines:
      // 1. Party control accounts (AR, AP, Customer Advance, Employee Advance)
      // 2. Or Salary Expense for employees / party-specific operational movements
      let debitPartyId = null;
      let creditPartyId = null;

      if (debitAccObj.isPartyControl || canonicalDebit === 'Salary Expense') {
        debitPartyId = resolvedPartyId;
      }
      if (creditAccObj.isPartyControl || (entry.referenceType === 'PAYROLL' && resolvedPartyId)) {
        creditPartyId = resolvedPartyId;
      }

      const amountDecimal = entry.amount;

      // Create JournalEntry
      const je = await tx.journalEntry.create({
        data: {
          entryDate: entry.entryDate,
          narration: entry.description,
          sourceType: entry.referenceType,
          sourceId: entry.referenceId,
          idempotencyKey: `LEGACY_BACKFILL:${entry.id}`,
          lines: {
            create: [
              {
                accountId: debitAccObj.id,
                partyId: debitPartyId,
                debit: amountDecimal,
                credit: 0
              },
              {
                accountId: creditAccObj.id,
                partyId: creditPartyId,
                debit: 0,
                credit: amountDecimal
              }
            ]
          }
        }
      });
    }
  });

  console.log('\n--- 3. VERIFYING COMMITTED DATA ---');
  const committedEntries = await prisma.journalEntry.findMany({
    include: {
      lines: {
        include: { account: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  const committedLines = await prisma.journalLine.findMany();

  let totalDebits = 0;
  let totalCredits = 0;
  let unbalancedCount = 0;

  for (const je of committedEntries) {
    const dSum = je.lines.reduce((s, l) => s + Number(l.debit), 0);
    const cSum = je.lines.reduce((s, l) => s + Number(l.credit), 0);
    totalDebits += dSum;
    totalCredits += cSum;
    if (Math.abs(dSum - cSum) > 0.0001) {
      unbalancedCount++;
    }
  }

  console.log(`JournalEntry records committed: ${committedEntries.length}`);
  console.log(`JournalLine records committed: ${committedLines.length}`);
  console.log(`Total Debits: PKR ${totalDebits.toLocaleString()}`);
  console.log(`Total Credits: PKR ${totalCredits.toLocaleString()}`);
  console.log(`Unbalanced Entries: ${unbalancedCount}`);

  console.log('\n--- 4. PROOF OF PARTY-ID ON TARGET ROWS ---');
  
  // Find Mr. Waseem's payroll entry
  const payrollEntry = committedEntries.find(e => e.sourceType === 'PAYROLL');
  console.log('\n[Committed Payroll Entry - Mr. Waseem]:');
  console.log(JSON.stringify(payrollEntry, null, 2));

  // Find 'test' customer REG entry
  const regEntry = committedEntries.find(e => e.narration.includes('Customer account registered'));
  console.log('\n[Committed REG Entry - Customer "test"]');
  console.log(JSON.stringify(regEntry, null, 2));
}

runCommit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
