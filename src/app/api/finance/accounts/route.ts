import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "VIEW_FINANCIALS")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Chart of Accounts structure
    const standardAccounts = [
      { code: "1010", name: "Cash in Hand", type: "ASSET", category: "Current Assets" },
      { code: "1020", name: "Bank Account (HBL)", type: "ASSET", category: "Current Assets" },
      { code: "1030", name: "Bank Account (Meezan Bank)", type: "ASSET", category: "Current Assets" },
      { code: "1100", name: "Accounts Receivable (Trade Debtors)", type: "ASSET", category: "Current Assets" },
      { code: "1150", name: "Vendor Advance Payments", type: "ASSET", category: "Current Assets" },
      { code: "1160", name: "Employee Advances & Staff Loans", type: "ASSET", category: "Current Assets" },
      { code: "1200", name: "Inventory Asset (HVAC Units & Spares)", type: "ASSET", category: "Current Assets" },
      { code: "2010", name: "Accounts Payable (Trade Creditors)", type: "LIABILITY", category: "Current Liabilities" },
      { code: "2050", name: "Customer Advance Deposits", type: "LIABILITY", category: "Current Liabilities" },
      { code: "2060", name: "Sales Tax / GST Payable", type: "LIABILITY", category: "Current Liabilities" },
      { code: "2070", name: "Salaries Payable", type: "LIABILITY", category: "Current Liabilities" },
      { code: "3010", name: "Owner Equity / Capital", type: "EQUITY", category: "Equity" },
      { code: "4010", name: "Sales Revenue (Goods & AC Units)", type: "REVENUE", category: "Operating Revenue" },
      { code: "4020", name: "Service & Maintenance Revenue", type: "REVENUE", category: "Operating Revenue" },
      { code: "5010", name: "Cost of Goods Sold (COGS)", type: "EXPENSE", category: "Direct Costs" },
      { code: "6010", name: "Salary & Wage Expense", type: "EXPENSE", category: "Operating Expenses" },
      { code: "6020", name: "Office Rent & Utilities", type: "EXPENSE", category: "Operating Expenses" },
      { code: "6030", name: "Logistics & Carriage Outward", type: "EXPENSE", category: "Operating Expenses" },
      { code: "6040", name: "Repairs & Maintenance", type: "EXPENSE", category: "Operating Expenses" },
      { code: "6090", name: "General & Administrative Expense", type: "EXPENSE", category: "Operating Expenses" },
    ];

    // Query ledger aggregates
    const ledgerEntries = await prisma.ledgerEntry.findMany();

    const debitTotals: Record<string, number> = {};
    const creditTotals: Record<string, number> = {};

    ledgerEntries.forEach((entry) => {
      const amt = Number(entry.amount);
      const dr = entry.debitAccount;
      const cr = entry.creditAccount;

      debitTotals[dr] = (debitTotals[dr] || 0) + amt;
      creditTotals[cr] = (creditTotals[cr] || 0) + amt;
    });

    const accountsWithBalances = standardAccounts.map((acc) => {
      const dr = debitTotals[acc.name] || debitTotals[acc.code] || 0;
      const cr = creditTotals[acc.name] || creditTotals[acc.code] || 0;

      // Net Balance formula based on Account Type
      // Asset & Expense: Normal balance is Debit (Debit - Credit)
      // Liability, Equity, Revenue: Normal balance is Credit (Credit - Debit)
      let balance = 0;
      if (acc.type === "ASSET" || acc.type === "EXPENSE") {
        balance = dr - cr;
      } else {
        balance = cr - dr;
      }

      return {
        ...acc,
        totalDebit: Math.round(dr * 100) / 100,
        totalCredit: Math.round(cr * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      };
    });

    // Fetch all Customers, Vendors, Employees, plus JournalLines to calculate per-party balances
    const [allCustomers, allVendors, allEmployees, journalLines, recentInvoices, recentPOs, recentDOs, recentComplaints] = await Promise.all([
      prisma.customer.findMany({
        select: { id: true, name: true, phone: true, address: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.vendor.findMany({
        select: { id: true, name: true, contactPerson: true, phone: true, address: true, email: true, paymentTerms: true },
        orderBy: { name: "asc" },
      }),
      prisma.employee.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, employeeNo: true, name: true, phone: true, department: true, position: true },
        orderBy: { name: "asc" },
      }),
      prisma.journalLine.findMany({
        where: {
          partyId: { not: null },
        },
        include: {
          account: true,
        },
      }),
      prisma.invoice.findMany({
        select: {
          id: true,
          invoiceNumber: true,
          clientName: true,
          totalAmount: true,
          amountPaid: true,
          status: true,
          doId: true,
          deliveryOrder: { select: { doNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.purchaseOrder.findMany({
        select: {
          id: true,
          poNumber: true,
          vendorId: true,
          status: true,
          vendor: { select: { name: true } },
          lineItems: { select: { quantityOrdered: true, unitCost: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.deliveryOrder.findMany({
        select: {
          id: true,
          doNumber: true,
          clientName: true,
          status: true,
          poNumber: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.complaint.findMany({
        select: {
          id: true,
          complaintNumber: true,
          customerName: true,
          status: true,
          amount: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    // Compute balance maps per partyId from double-entry JournalLines
    const partyDebitTotals: Record<string, number> = {};
    const partyCreditTotals: Record<string, number> = {};

    journalLines.forEach((jl: any) => {
      if (jl.partyId) {
        partyDebitTotals[jl.partyId] = (partyDebitTotals[jl.partyId] || 0) + Number(jl.debit);
        partyCreditTotals[jl.partyId] = (partyCreditTotals[jl.partyId] || 0) + Number(jl.credit);
      }
    });

    // Structure party financial accounts
    const customerAccounts = allCustomers.map((c) => {
      const dr = partyDebitTotals[c.id] || 0;
      const cr = partyCreditTotals[c.id] || 0;
      const net = dr - cr; // Positive = Receivable from Customer, Negative = Advance Held
      return {
        id: c.id,
        name: c.name,
        partyType: "CUSTOMER" as const,
        phone: c.phone || "",
        email: c.email || "",
        address: c.address || "",
        totalDebit: Math.round(dr * 100) / 100,
        totalCredit: Math.round(cr * 100) / 100,
        balance: Math.round(net * 100) / 100,
        statusLabel: net > 0 ? "Receivable" : net < 0 ? "Advance Held" : "Settled",
      };
    });

    const vendorAccounts = allVendors.map((v) => {
      const dr = partyDebitTotals[v.id] || 0;
      const cr = partyCreditTotals[v.id] || 0;
      const net = cr - dr; // Positive = Payable to Vendor, Negative = Advance Paid
      return {
        id: v.id,
        name: v.name,
        partyType: "VENDOR" as const,
        contactPerson: v.contactPerson,
        phone: v.phone || "",
        email: v.email || "",
        address: v.address || "",
        paymentTerms: v.paymentTerms || "Net 30 Days",
        totalDebit: Math.round(dr * 100) / 100,
        totalCredit: Math.round(cr * 100) / 100,
        balance: Math.round(net * 100) / 100,
        statusLabel: net > 0 ? "Payable" : net < 0 ? "Advance Paid" : "Settled",
      };
    });

    const employeeAccounts = allEmployees.map((e) => {
      const dr = partyDebitTotals[e.id] || 0;
      const cr = partyCreditTotals[e.id] || 0;
      const net = dr - cr; // Positive = Advance/Loan Outstanding, Negative = Settled
      return {
        id: e.id,
        name: e.name,
        partyType: "EMPLOYEE" as const,
        employeeNo: e.employeeNo,
        phone: e.phone || "",
        department: e.department,
        position: e.position,
        totalDebit: Math.round(dr * 100) / 100,
        totalCredit: Math.round(cr * 100) / 100,
        balance: Math.round(net * 100) / 100,
        statusLabel: net > 0 ? "Loan Outstanding" : "Settled",
      };
    });

    return NextResponse.json({
      accounts: accountsWithBalances,
      partyAccounts: {
        customers: customerAccounts,
        vendors: vendorAccounts,
        employees: employeeAccounts,
        all: [...customerAccounts, ...vendorAccounts, ...employeeAccounts],
      },
      parties: {
        customers: allCustomers.map((c) => ({ id: c.id, name: c.name, phone: c.phone })),
        vendors: allVendors.map((v) => ({ id: v.id, name: v.name, phone: v.phone })),
        employees: allEmployees.map((e) => ({ id: e.id, name: e.name, phone: e.phone, role: `${e.department} - ${e.position}` })),
      },
      documents: {
        invoices: recentInvoices.map((inv) => ({
          id: inv.id,
          number: inv.invoiceNumber,
          clientName: inv.clientName,
          total: Number(inv.totalAmount),
          paid: Number(inv.amountPaid),
          due: Math.max(0, Number(inv.totalAmount) - Number(inv.amountPaid)),
          status: inv.status,
          doNumber: inv.deliveryOrder?.doNumber || null,
        })),
        purchaseOrders: recentPOs.map((po) => ({
          id: po.id,
          number: po.poNumber,
          vendorId: po.vendorId,
          vendorName: po.vendor?.name,
          status: po.status,
          total: po.lineItems.reduce((sum, item) => sum + item.quantityOrdered * Number(item.unitCost), 0),
        })),
        deliveryOrders: recentDOs.map((doRec) => ({
          id: doRec.id,
          number: doRec.doNumber,
          clientName: doRec.clientName,
          status: doRec.status,
          poNumber: doRec.poNumber,
        })),
        complaints: recentComplaints.map((c) => ({
          id: c.id,
          number: c.complaintNumber,
          customerName: c.customerName,
          status: c.status,
          amount: Number(c.amount),
        })),
      },
    });
  } catch (error: any) {
    console.error("[Accounts GET] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
