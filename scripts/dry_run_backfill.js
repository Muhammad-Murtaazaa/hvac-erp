const path = require('path');
const { PrismaClient } = require(path.join(process.cwd(), 'node_modules', '@prisma/client'));
const prisma = new PrismaClient();

// Canonical Account Definitions
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

  // Fallback heuristics
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

async function dryRunBackfill() {
  console.log('=====================================================');
  console.log('1. GROUPING KEY ANALYSIS & VERIFICATION');
  console.log('=====================================================');

  const entries = await prisma.ledgerEntry.findMany({ orderBy: { createdAt: 'asc' } });
  const customers = await prisma.customer.findMany();
  const vendors = await prisma.vendor.findMany();
  const employees = await prisma.employee.findMany();
  const invoices = await prisma.invoice.findMany();
  const grns = await prisma.goodsReceivedNote.findMany({ include: { purchaseOrder: { include: { vendor: true } } } });

  console.log(`Found ${entries.length} LedgerEntry rows.`);

  // Inspect each row's reference and voucher keys
  const keyAnalysis = entries.map((e, idx) => {
    return {
      index: idx,
      id: e.id,
      refType: e.referenceType,
      refId: e.referenceId,
      vType: e.voucherType,
      vNum: e.voucherNumber,
      debit: e.debitAccount,
      credit: e.creditAccount,
      amount: e.amount.toString(),
      desc: e.description.substring(0, 45)
    };
  });
  console.table(keyAnalysis);

  console.log('\nGrouping observations:');
  console.log('- In LedgerEntry, each row ALREADY stores a balanced pair (debitAccount, creditAccount, amount).');
  console.log('- For INV-10001 (referenceId 9e68430b...), there are 3 distinct events recorded under the same referenceId:');
  console.log('    1. Revenue recognition (AR vs Sales Revenue: 2,750,000)');
  console.log('    2. COGS recognition (COGS vs Inventory Asset: 2,250,000)');
  console.log('    3. Invoice payment (Cash/Bank vs AR: 1,300,000)');
  console.log('  If grouped ONLY by referenceId, these 3 distinct events would be collapsed into 1 single JournalEntry with 6 lines.');
  console.log('  Grouping by (referenceType, referenceId, id) or (referenceType, referenceId, transactionRole/id) treats each financial transaction as its own distinct JournalEntry, each guaranteed to have balanced Debit = Credit lines.');

  console.log('\n=====================================================');
  console.log('2. DRY RUN: MAPPING & JOURNAL ENTRY RECONSTRUCTION');
  console.log('=====================================================');

  let journalEntriesPlanned = [];
  let totalDebits = 0;
  let totalCredits = 0;
  let unbalanceCount = 0;

  for (const entry of entries) {
    // Resolve canonical accounts
    const canonicalDebit = mapLegacyAccount(entry.debitAccount, entry);
    const canonicalCredit = mapLegacyAccount(entry.creditAccount, entry);

    // Resolve Party
    let resolvedPartyId = entry.partyId || null;
    let partyMatchSource = entry.partyId ? 'EXISTING_PARTY_ID' : 'NONE';

    if (!resolvedPartyId) {
      if (entry.partyName) {
        const pName = entry.partyName.trim().toLowerCase();
        const cMatch = customers.find(c => c.name.trim().toLowerCase() === pName);
        const vMatch = vendors.find(v => v.name.trim().toLowerCase() === pName);
        const eMatch = employees.find(e => e.name.trim().toLowerCase() === pName);

        if (cMatch) { resolvedPartyId = cMatch.id; partyMatchSource = `CUSTOMER_NAME (${cMatch.name})`; }
        else if (vMatch) { resolvedPartyId = vMatch.id; partyMatchSource = `VENDOR_NAME (${vMatch.name})`; }
        else if (eMatch) { resolvedPartyId = eMatch.id; partyMatchSource = `EMPLOYEE_NAME (${eMatch.name})`; }
      }

      if (!resolvedPartyId && entry.referenceType === 'PO_RECEIPT') {
        const grn = grns.find(g => g.id === entry.referenceId);
        if (grn?.purchaseOrder?.vendor) {
          resolvedPartyId = grn.purchaseOrder.vendor.id;
          partyMatchSource = `GRN_SOURCE_VENDOR (${grn.purchaseOrder.vendor.name})`;
        }
      }

      if (!resolvedPartyId && entry.referenceType === 'INVOICE') {
        const inv = invoices.find(i => i.id === entry.referenceId);
        if (inv?.customerId) {
          resolvedPartyId = inv.customerId;
          partyMatchSource = `INVOICE_SOURCE_CUSTOMER (${inv.clientName})`;
        }
      }
    }

    // Party assignment to lines:
    // Only assign partyId to lines where the account is a party-control account (AR, AP, Advance)
    const isDebitControl = ['Accounts Receivable (Trade Debtors)', 'Accounts Payable (Trade Creditors)', 'Customer Advance Deposits', 'Employee Advance'].includes(canonicalDebit);
    const isCreditControl = ['Accounts Receivable (Trade Debtors)', 'Accounts Payable (Trade Creditors)', 'Customer Advance Deposits', 'Employee Advance'].includes(canonicalCredit);

    const debitPartyId = isDebitControl ? resolvedPartyId : null;
    const creditPartyId = isCreditControl ? resolvedPartyId : null;

    const amountNum = Number(entry.amount);

    const lines = [
      {
        account: canonicalDebit,
        partyId: debitPartyId,
        debit: amountNum,
        credit: 0
      },
      {
        account: canonicalCredit,
        partyId: creditPartyId,
        debit: 0,
        credit: amountNum
      }
    ];

    const entryDebits = lines.reduce((s, l) => s + l.debit, 0);
    const entryCredits = lines.reduce((s, l) => s + l.credit, 0);
    const isBalanced = Math.abs(entryDebits - entryCredits) < 0.0001;

    if (!isBalanced) unbalanceCount++;
    totalDebits += entryDebits;
    totalCredits += entryCredits;

    journalEntriesPlanned.push({
      legacyId: entry.id,
      entryDate: entry.entryDate,
      narration: entry.description,
      sourceType: entry.referenceType,
      sourceId: entry.referenceId,
      idempotencyKey: `LEGACY_BACKFILL:${entry.id}`,
      partyMatchSource,
      resolvedPartyId,
      lines,
      isBalanced
    });
  }

  console.log(`\nReconstructed ${journalEntriesPlanned.length} Journal Entries.`);
  console.log(`Total Journal Lines planned: ${journalEntriesPlanned.length * 2}`);
  console.log(`Total Debits: PKR ${totalDebits.toLocaleString()}`);
  console.log(`Total Credits: PKR ${totalCredits.toLocaleString()}`);
  console.log(`Unbalanced Entries: ${unbalanceCount}`);

  console.log('\n=====================================================');
  console.log('3. DETAILED BREAKDOWN OF ALL 8 RECONSTRUCTED ENTRIES');
  console.log('=====================================================');

  journalEntriesPlanned.forEach((je, i) => {
    console.log(`\n[Entry #${i + 1}] Source: ${je.sourceType} | Date: ${new Date(je.entryDate).toISOString().slice(0,10)} | Balanced: ${je.isBalanced}`);
    console.log(`  Narration: "${je.narration}"`);
    console.log(`  Party Resolution: ${je.partyMatchSource} -> ${je.resolvedPartyId || '(None)'}`);
    console.log('  Lines:');
    je.lines.forEach(l => {
      console.log(`    - Account: [${l.account}] | Debit: ${l.debit.toLocaleString()} | Credit: ${l.credit.toLocaleString()} | PartyId: ${l.partyId || '(null)'}`);
    });
  });

  console.log('\n=====================================================');
  console.log('4. CANONICAL ACCOUNTS TO SEED/VERIFY');
  console.log('=====================================================');
  console.table(CANONICAL_ACCOUNTS.map(a => ({ name: a.name, type: a.type, isPartyControl: a.isPartyControl })));
}

dryRunBackfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
