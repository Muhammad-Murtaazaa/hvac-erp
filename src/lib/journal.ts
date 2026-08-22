import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

export type DbClient = Prisma.TransactionClient;

export const CANONICAL_ACCOUNTS = [
  { name: 'Accounts Receivable (Trade Debtors)', type: 'ASSET', isPartyControl: true, legacyAliases: ['Accounts Receivable', 'Accounts Receivable (Trade Debtors)', 'AR'] },
  { name: 'Accounts Payable (Trade Creditors)', type: 'LIABILITY', isPartyControl: true, legacyAliases: ['Accounts Payable', 'Accounts Payable (Trade Creditors)', 'AP'] },
  { name: 'Customer Advance Deposits', type: 'LIABILITY', isPartyControl: true, legacyAliases: ['Customer Advance Deposits', 'Advance Deposit'] },
  { name: 'Employee Advance', type: 'ASSET', isPartyControl: true, legacyAliases: ['Employee Advance', 'Staff Advance', 'Employee Loan'] },
  { name: 'Sales Revenue', type: 'INCOME', isPartyControl: false, legacyAliases: ['Sales Revenue'] },
  { name: 'Service & Maintenance Income', type: 'INCOME', isPartyControl: false, legacyAliases: ['Service & Maintenance Income'] },
  { name: 'Cost of Goods Sold', type: 'EXPENSE', isPartyControl: false, legacyAliases: ['Cost of Goods Sold', 'COGS'] },
  { name: 'Inventory Asset', type: 'ASSET', isPartyControl: false, legacyAliases: ['Inventory Asset', 'Inventory'] },
  { name: 'Salary Expense', type: 'EXPENSE', isPartyControl: false, legacyAliases: ['Salary Expense', 'Salary & Wage Expense', 'Salaries and Wages', 'Payroll Expense'] },
  { name: 'General & Administrative Expense', type: 'EXPENSE', isPartyControl: false, legacyAliases: ['General & Administrative Expense', 'Admin Expense', 'Operating Expense', 'Mess Expense'] },
  { name: 'Cash in Hand', type: 'ASSET', isPartyControl: false, legacyAliases: ['Cash in Hand', 'Cash'] },
  { name: 'Bank Account (Meezan Bank)', type: 'ASSET', isPartyControl: false, legacyAliases: ['Bank Account (Meezan Bank)', 'Bank Account', 'Bank', 'Meezan Bank'] },
  { name: 'Bank Account (HBL)', type: 'ASSET', isPartyControl: false, legacyAliases: ['Bank Account (HBL)', 'HBL Bank', 'HBL'] },
  { name: 'Sales Tax Payable', type: 'LIABILITY', isPartyControl: false, legacyAliases: ['Sales Tax Payable', 'GST Payable'] },
  { name: 'Purchase Price Variance', type: 'EXPENSE', isPartyControl: false, legacyAliases: ['Purchase Price Variance'] },
  { name: 'Inventory Adjustment Expense', type: 'EXPENSE', isPartyControl: false, legacyAliases: ['Inventory Adjustment Expense'] },
  { name: 'Owner Equity / Capital', type: 'EQUITY', isPartyControl: false, legacyAliases: ['Owner Equity / Capital', 'Capital'] }
] as const;

export type CanonicalAccountName = (typeof CANONICAL_ACCOUNTS)[number]['name'];

let accountCache: Map<string, string> = new Map(); // name -> id

export async function getAccountId(tx: DbClient, accountName: string): Promise<string> {
  const norm = accountName.trim();
  if (accountCache.has(norm)) {
    return accountCache.get(norm)!;
  }

  let acc = await tx.account.findUnique({
    where: { name: norm },
  });

  if (!acc) {
    // Check aliases
    for (const def of CANONICAL_ACCOUNTS) {
      if (def.name.toLowerCase() === norm.toLowerCase() || def.legacyAliases.some(a => a.toLowerCase() === norm.toLowerCase())) {
        acc = await tx.account.upsert({
          where: { name: def.name },
          update: {},
          create: {
            name: def.name,
            type: def.type as any,
            isPartyControl: def.isPartyControl,
            legacyAliases: [...def.legacyAliases],
          },
        });
        break;
      }
    }
  }

  if (!acc) {
    throw new Error(`Account not found in Chart of Accounts: ${accountName}`);
  }

  accountCache.set(norm, acc.id);
  accountCache.set(acc.name, acc.id);
  return acc.id;
}

export function mapPaymentMethodToAccount(method?: string | null, description?: string | null): CanonicalAccountName {
  const m = (method || "").toUpperCase();
  const d = (description || "").toUpperCase();
  if (m === "BANK" || m === "BANK_TRANSFER" || m === "ONLINE" || m === "CARD" || d.includes("BANK") || d.includes("ONLINE")) {
    return "Bank Account (Meezan Bank)";
  }
  return "Cash in Hand";
}

export interface JournalLineInput {
  accountName: CanonicalAccountName | string;
  partyId?: string | null;
  debit: number | string | Prisma.Decimal;
  credit: number | string | Prisma.Decimal;
}

export interface JournalEntryInput {
  entryDate?: Date;
  narration: string;
  sourceType: string;
  sourceId?: string | null;
  idempotencyKey?: string | null;
  lines: JournalLineInput[];
}

export async function postJournalEntry(
  tx: DbClient,
  entry: JournalEntryInput
) {
  // Validate debit == credit
  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);

  for (const line of entry.lines) {
    totalDebit = totalDebit.plus(new Prisma.Decimal(line.debit || 0));
    totalCredit = totalCredit.plus(new Prisma.Decimal(line.credit || 0));
  }

  if (!totalDebit.equals(totalCredit)) {
    throw new Error(
      `Journal entry is out of balance! Total Debit: ${totalDebit.toString()}, Total Credit: ${totalCredit.toString()} (Narration: ${entry.narration})`
    );
  }

  // Check idempotency if key provided
  if (entry.idempotencyKey) {
    const existing = await tx.journalEntry.findUnique({
      where: { idempotencyKey: entry.idempotencyKey },
    });
    if (existing) {
      // Duplicate request with same idempotency key - reject or return existing
      throw new Error(`Duplicate transaction rejected by idempotencyKey: ${entry.idempotencyKey}`);
    }
  }

  const lineCreates = [];
  for (const line of entry.lines) {
    const accountId = await getAccountId(tx, line.accountName);
    lineCreates.push({
      accountId,
      partyId: line.partyId || null,
      debit: new Prisma.Decimal(line.debit || 0),
      credit: new Prisma.Decimal(line.credit || 0),
    });
  }

  return await tx.journalEntry.create({
    data: {
      entryDate: entry.entryDate || new Date(),
      narration: entry.narration,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId || null,
      idempotencyKey: entry.idempotencyKey || null,
      lines: {
        create: lineCreates,
      },
    },
    include: {
      lines: {
        include: { account: true },
      },
    },
  });
}
