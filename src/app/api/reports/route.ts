import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_REPORTS") && !hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "pnl"; 
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // =========================================================================
    // 1. GENERAL LEDGER (AUDIT JOURNAL)
    // =========================================================================
    if (type === "ledger") {
      const entries = await prisma.ledgerEntry.findMany({
        where: {
          entryDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { entryDate: "desc" },
      });
      return NextResponse.json({ report: entries });
    }

    // =========================================================================
    // 2. TRIAL BALANCE (DOUBLE-ENTRY ACCOUNTING)
    // =========================================================================
    if (type === "trial_balance") {
      const allEntries = await prisma.ledgerEntry.findMany({
        where: {
          entryDate: { lte: endDate },
        },
      });

      const accountsMaster = [
        { code: "1000", name: "Cash in Hand", type: "ASSET", normal: "DEBIT" },
        { code: "1010", name: "Bank Account (Meezan Bank)", type: "ASSET", normal: "DEBIT" },
        { code: "1020", name: "Bank Account (HBL)", type: "ASSET", normal: "DEBIT" },
        { code: "1100", name: "Accounts Receivable (Trade Debtors)", type: "ASSET", normal: "DEBIT" },
        { code: "1200", name: "Inventory Asset", type: "ASSET", normal: "DEBIT" },
        { code: "1300", name: "Prepaid Expenses & Advances", type: "ASSET", normal: "DEBIT" },
        { code: "1400", name: "Employee Advances & Staff Loans", type: "ASSET", normal: "DEBIT" },
        { code: "2000", name: "Accounts Payable (Trade Creditors)", type: "LIABILITY", normal: "CREDIT" },
        { code: "2100", name: "Customer Advance Deposits", type: "LIABILITY", normal: "CREDIT" },
        { code: "2200", name: "Accrued Expenses & Salaries Payable", type: "LIABILITY", normal: "CREDIT" },
        { code: "3000", name: "Owner Equity / Capital", type: "EQUITY", normal: "CREDIT" },
        { code: "3100", name: "Retained Earnings", type: "EQUITY", normal: "CREDIT" },
        { code: "4000", name: "Sales Revenue", type: "REVENUE", normal: "CREDIT" },
        { code: "4100", name: "Service & Maintenance Income", type: "REVENUE", normal: "CREDIT" },
        { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", normal: "DEBIT" },
        { code: "5100", name: "Salary Expense", type: "EXPENSE", normal: "DEBIT" },
        { code: "5200", name: "Office Rent & Utilities", type: "EXPENSE", normal: "DEBIT" },
        { code: "5300", name: "Transportation & Freight", type: "EXPENSE", normal: "DEBIT" },
        { code: "5400", name: "Inventory Adjustment Expense", type: "EXPENSE", normal: "DEBIT" },
        { code: "5900", name: "Miscellaneous Expense", type: "EXPENSE", normal: "DEBIT" },
      ];

      const accountBalances: Record<string, { openingDebit: number; openingCredit: number; periodDebit: number; periodCredit: number }> = {};
      accountsMaster.forEach((acc) => {
        accountBalances[acc.name] = { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };
      });

      allEntries.forEach((e) => {
        const amt = Number(e.amount);
        const eDate = new Date(e.entryDate);
        const isPeriod = eDate >= startDate && eDate <= endDate;
        const isOpening = eDate < startDate;

        if (e.debitAccount) {
          if (!accountBalances[e.debitAccount]) {
            accountBalances[e.debitAccount] = { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };
          }
          if (isPeriod) accountBalances[e.debitAccount].periodDebit += amt;
          else if (isOpening) accountBalances[e.debitAccount].openingDebit += amt;
        }

        if (e.creditAccount) {
          if (!accountBalances[e.creditAccount]) {
            accountBalances[e.creditAccount] = { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };
          }
          if (isPeriod) accountBalances[e.creditAccount].periodCredit += amt;
          else if (isOpening) accountBalances[e.creditAccount].openingCredit += amt;
        }
      });

      let totalPeriodDebit = 0;
      let totalPeriodCredit = 0;
      let totalClosingDebit = 0;
      let totalClosingCredit = 0;

      const rows = accountsMaster.map((acc) => {
        const b = accountBalances[acc.name] || { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };
        const totalDebitAll = b.openingDebit + b.periodDebit;
        const totalCreditAll = b.openingCredit + b.periodCredit;
        const net = totalDebitAll - totalCreditAll;

        let closingDebit = 0;
        let closingCredit = 0;
        if (acc.normal === "DEBIT") {
          if (net >= 0) closingDebit = net;
          else closingCredit = Math.abs(net);
        } else {
          if (net <= 0) closingCredit = Math.abs(net);
          else closingDebit = net;
        }

        totalPeriodDebit += b.periodDebit;
        totalPeriodCredit += b.periodCredit;
        totalClosingDebit += closingDebit;
        totalClosingCredit += closingCredit;

        return {
          code: acc.code,
          name: acc.name,
          type: acc.type,
          normal: acc.normal,
          periodDebit: b.periodDebit,
          periodCredit: b.periodCredit,
          closingDebit,
          closingCredit,
          netBalance: net,
        };
      });

      return NextResponse.json({
        report: {
          rows,
          totals: {
            totalPeriodDebit,
            totalPeriodCredit,
            totalClosingDebit,
            totalClosingCredit,
            isBalanced: Math.round(totalClosingDebit) === Math.round(totalClosingCredit),
          },
        },
      });
    }

    // =========================================================================
    // 3. PROFIT & LOSS (INCOME STATEMENT)
    // =========================================================================
    if (type === "pnl") {
      const [entries, invoices, pos, payrolls] = await Promise.all([
        prisma.ledgerEntry.findMany({
          where: { entryDate: { gte: startDate, lte: endDate } },
        }),
        prisma.invoice.findMany({
          where: { date: { gte: startDate, lte: endDate } },
        }),
        prisma.purchaseOrder.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.payrollRun.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
      ]);

      let salesRevenue = 0;
      let serviceIncome = 0;
      let salesReturns = 0;
      let cogs = 0;
      let salaryExpense = 0;
      let rentUtilitiesExpense = 0;
      let freightExpense = 0;
      let inventoryAdjustments = 0;
      let miscExpenses = 0;

      // Calculate from direct invoices
      invoices.forEach((inv) => {
        salesRevenue += Number(inv.totalAmount || 0);
      });

      // Calculate from ledger entries
      entries.forEach((e) => {
        const amt = Number(e.amount);
        if (e.creditAccount === "Sales Revenue" && !invoices.length) salesRevenue += amt;
        if (e.creditAccount === "Service & Maintenance Income") serviceIncome += amt;
        if (e.debitAccount === "Sales Revenue") salesReturns += amt;

        if (e.debitAccount === "Cost of Goods Sold") cogs += amt;
        if (e.creditAccount === "Cost of Goods Sold") cogs -= amt;

        if (e.debitAccount === "Salary Expense") salaryExpense += amt;
        if (e.debitAccount === "Office Rent & Utilities") rentUtilitiesExpense += amt;
        if (e.debitAccount === "Transportation & Freight") freightExpense += amt;
        if (e.debitAccount === "Inventory Adjustment Expense") inventoryAdjustments += amt;
        if (e.debitAccount === "Miscellaneous Expense") miscExpenses += amt;
      });

      // Add payroll runs to salary if not already in ledger
      if (salaryExpense === 0 && payrolls.length > 0) {
        payrolls.forEach((p) => { salaryExpense += Number(p.netPay || 0); });
      }

      // Add purchases to COGS estimation if ledger COGS is zero
      if (cogs === 0 && pos.length > 0) {
        pos.forEach((po) => { cogs += Number(po.totalAmount || 0) * 0.7; });
      }

      const totalRevenue = salesRevenue + serviceIncome - salesReturns;
      const grossProfit = totalRevenue - cogs;
      const totalExpenses = salaryExpense + rentUtilitiesExpense + freightExpense + inventoryAdjustments + miscExpenses;
      const netProfit = grossProfit - totalExpenses;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return NextResponse.json({
        report: {
          salesRevenue,
          serviceIncome,
          salesReturns,
          totalRevenue,
          cogs,
          grossProfit,
          grossMargin,
          expenses: {
            salaryExpense,
            rentUtilitiesExpense,
            freightExpense,
            inventoryAdjustments,
            miscExpenses,
          },
          totalExpenses,
          netProfit,
          netMargin,
        },
      });
    }

    // =========================================================================
    // 4. CASH FLOW & BANK BOOK
    // =========================================================================
    if (type === "cash_flow") {
      const entries = await prisma.ledgerEntry.findMany({
        where: { entryDate: { gte: startDate, lte: endDate } },
        orderBy: { entryDate: "desc" },
      });

      let totalInflow = 0;
      let totalOutflow = 0;
      const byAccount: Record<string, { in: number; out: number; balance: number }> = {
        "Cash in Hand": { in: 0, out: 0, balance: 0 },
        "Bank Account (Meezan Bank)": { in: 0, out: 0, balance: 0 },
        "Bank Account (HBL)": { in: 0, out: 0, balance: 0 },
      };

      const transactions: any[] = [];

      entries.forEach((e) => {
        const amt = Number(e.amount);
        const isDebitLiquid = e.debitAccount && (e.debitAccount.includes("Cash") || e.debitAccount.includes("Bank"));
        const isCreditLiquid = e.creditAccount && (e.creditAccount.includes("Cash") || e.creditAccount.includes("Bank"));

        if (isDebitLiquid && !isCreditLiquid) {
          totalInflow += amt;
          const accName = e.debitAccount.includes("Meezan") ? "Bank Account (Meezan Bank)" : e.debitAccount.includes("HBL") ? "Bank Account (HBL)" : "Cash in Hand";
          if (byAccount[accName]) byAccount[accName].in += amt;
          transactions.push({
            id: e.id,
            date: e.entryDate,
            type: "INFLOW",
            account: e.debitAccount,
            party: e.partyName || "Customer Deposit",
            description: e.description,
            amount: amt,
          });
        } else if (isCreditLiquid && !isDebitLiquid) {
          totalOutflow += amt;
          const accName = e.creditAccount.includes("Meezan") ? "Bank Account (Meezan Bank)" : e.creditAccount.includes("HBL") ? "Bank Account (HBL)" : "Cash in Hand";
          if (byAccount[accName]) byAccount[accName].out += amt;
          transactions.push({
            id: e.id,
            date: e.entryDate,
            type: "OUTFLOW",
            account: e.creditAccount,
            party: e.partyName || "Vendor Disbursement / Expense",
            description: e.description,
            amount: amt,
          });
        } else if (isDebitLiquid && isCreditLiquid) {
          // Contra transfer
          const fromAcc = e.creditAccount.includes("Meezan") ? "Bank Account (Meezan Bank)" : e.creditAccount.includes("HBL") ? "Bank Account (HBL)" : "Cash in Hand";
          const toAcc = e.debitAccount.includes("Meezan") ? "Bank Account (Meezan Bank)" : e.debitAccount.includes("HBL") ? "Bank Account (HBL)" : "Cash in Hand";
          if (byAccount[fromAcc]) byAccount[fromAcc].out += amt;
          if (byAccount[toAcc]) byAccount[toAcc].in += amt;
          transactions.push({
            id: e.id,
            date: e.entryDate,
            type: "TRANSFER",
            account: `${e.creditAccount} ➔ ${e.debitAccount}`,
            party: "Internal Contra Transfer",
            description: e.description,
            amount: amt,
          });
        }
      });

      Object.keys(byAccount).forEach((acc) => {
        byAccount[acc].balance = byAccount[acc].in - byAccount[acc].out;
      });

      return NextResponse.json({
        report: {
          totalInflow,
          totalOutflow,
          netCashChange: totalInflow - totalOutflow,
          byAccount,
          transactions,
        },
      });
    }

    // =========================================================================
    // 5. CUSTOMER BALANCES (TRADE RECEIVABLES SUB-LEDGER)
    // =========================================================================
    if (type === "customer_balances") {
      const [invoices, ledgerReceipts] = await Promise.all([
        prisma.invoice.findMany({
          select: { clientName: true, clientPhone: true, clientAddress: true, totalAmount: true, amountPaid: true, status: true, date: true },
        }),
        prisma.ledgerEntry.findMany({
          where: { partyType: "CUSTOMER" },
          select: { partyName: true, debitAccount: true, creditAccount: true, amount: true },
        }),
      ]);

      const customerMap = new Map<string, {
        name: string;
        phone: string;
        address: string;
        totalBilled: number;
        totalPaid: number;
        balance: number;
        unpaidCount: number;
      }>();

      invoices.forEach((inv) => {
        const name = (inv.clientName || "").trim();
        if (!name) return;
        const cur = customerMap.get(name) || {
          name,
          phone: inv.clientPhone || "",
          address: inv.clientAddress || "",
          totalBilled: 0,
          totalPaid: 0,
          balance: 0,
          unpaidCount: 0,
        };
        cur.totalBilled += Number(inv.totalAmount || 0);
        cur.totalPaid += Number(inv.amountPaid || 0);
        if (inv.status !== "PAID") cur.unpaidCount += 1;
        customerMap.set(name, cur);
      });

      ledgerReceipts.forEach((l) => {
        const name = (l.partyName || "").trim();
        if (!name) return;
        const cur = customerMap.get(name) || {
          name,
          phone: "",
          address: "",
          totalBilled: 0,
          totalPaid: 0,
          balance: 0,
          unpaidCount: 0,
        };
        if (l.creditAccount === "Accounts Receivable (Trade Debtors)") {
          cur.totalPaid += Number(l.amount || 0);
        }
        if (l.debitAccount === "Accounts Receivable (Trade Debtors)") {
          cur.totalBilled += Number(l.amount || 0);
        }
        customerMap.set(name, cur);
      });

      let grandTotalBilled = 0;
      let grandTotalPaid = 0;
      let grandTotalReceivables = 0;

      const customers = Array.from(customerMap.values()).map((c) => {
        const bal = c.totalBilled - c.totalPaid;
        grandTotalBilled += c.totalBilled;
        grandTotalPaid += c.totalPaid;
        if (bal > 0) grandTotalReceivables += bal;
        return {
          ...c,
          balance: bal,
        };
      }).sort((a, b) => b.balance - a.balance);

      return NextResponse.json({
        report: {
          customers,
          totals: {
            grandTotalBilled,
            grandTotalPaid,
            grandTotalReceivables,
            customerCount: customers.length,
          },
        },
      });
    }

    // =========================================================================
    // 6. VENDOR BALANCES (TRADE PAYABLES SUB-LEDGER)
    // =========================================================================
    if (type === "vendor_balances") {
      const [vendors, pos, ledgerDisbursements] = await Promise.all([
        prisma.vendor.findMany({ orderBy: { name: "asc" } }),
        prisma.purchaseOrder.findMany({
          select: { vendorId: true, totalAmount: true, status: true, vendor: { select: { name: true } } },
        }),
        prisma.ledgerEntry.findMany({
          where: { partyType: "VENDOR" },
          select: { partyId: true, partyName: true, debitAccount: true, creditAccount: true, amount: true },
        }),
      ]);

      const vendorMap = new Map<string, {
        id: string;
        name: string;
        contactPerson: string;
        phone: string;
        totalPurchases: number;
        totalPaid: number;
        balance: number;
        openPOCount: number;
      }>();

      vendors.forEach((v) => {
        vendorMap.set(v.id, {
          id: v.id,
          name: v.name,
          contactPerson: v.contactPerson || "",
          phone: v.phone || "",
          totalPurchases: 0,
          totalPaid: 0,
          balance: 0,
          openPOCount: 0,
        });
      });

      pos.forEach((po) => {
        const vid = po.vendorId;
        if (!vid) return;
        const cur = vendorMap.get(vid) || {
          id: vid,
          name: po.vendor?.name || "Vendor",
          contactPerson: "",
          phone: "",
          totalPurchases: 0,
          totalPaid: 0,
          balance: 0,
          openPOCount: 0,
        };
        cur.totalPurchases += Number(po.totalAmount || 0);
        if (po.status !== "RECEIVED" && po.status !== "CANCELLED") cur.openPOCount += 1;
        vendorMap.set(vid, cur);
      });

      ledgerDisbursements.forEach((l) => {
        const vid = l.partyId || l.partyName;
        if (!vid) return;
        const cur = vendorMap.get(l.partyId || "") || vendorMap.get(l.partyName || "");
        if (cur) {
          if (l.debitAccount === "Accounts Payable (Trade Creditors)") {
            cur.totalPaid += Number(l.amount || 0);
          }
          if (l.creditAccount === "Accounts Payable (Trade Creditors)") {
            cur.totalPurchases += Number(l.amount || 0);
          }
        }
      });

      let grandTotalPurchases = 0;
      let grandTotalDisbursed = 0;
      let grandTotalPayables = 0;

      const vendorList = Array.from(vendorMap.values()).map((v) => {
        const bal = v.totalPurchases - v.totalPaid;
        grandTotalPurchases += v.totalPurchases;
        grandTotalDisbursed += v.totalPaid;
        if (bal > 0) grandTotalPayables += bal;
        return {
          ...v,
          balance: bal,
        };
      }).sort((a, b) => b.balance - a.balance);

      return NextResponse.json({
        report: {
          vendors: vendorList,
          totals: {
            grandTotalPurchases,
            grandTotalDisbursed,
            grandTotalPayables,
            vendorCount: vendorList.length,
          },
        },
      });
    }

    // =========================================================================
    // 7. STOCK VALUATION REPORT
    // =========================================================================
    if (type === "valuation") {
      const products = await prisma.product.findMany({
        where: {
          onHandQty: { gt: 0 },
        },
        orderBy: { sku: "asc" },
      });

      let totalValuation = 0;
      let totalItemsCount = 0;
      const categoryMap: Record<string, { count: number; value: number }> = {};

      const items = products.map((p) => {
        const qty = p.onHandQty;
        const avgCost = Number(p.averageCost);
        const totalValue = qty * avgCost;
        totalValuation += totalValue;
        totalItemsCount += qty;

        const cat = p.category || "Uncategorized";
        if (!categoryMap[cat]) categoryMap[cat] = { count: 0, value: 0 };
        categoryMap[cat].count += qty;
        categoryMap[cat].value += totalValue;

        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          onHandQty: qty,
          reorderLevel: p.reorderLevel,
          averageCost: avgCost,
          salesPrice: Number(p.salesPrice || 0),
          totalValue,
        };
      });

      return NextResponse.json({
        report: {
          totalValuation,
          totalItemsCount,
          categoryBreakdown: categoryMap,
          items,
        },
      });
    }

    // =========================================================================
    // 8. AR & AP AGING ANALYSIS
    // =========================================================================
    if (type === "aging") {
      const [unpaidInvoices, unpaidPOs] = await Promise.all([
        prisma.invoice.findMany({
          where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
          orderBy: { date: "asc" },
        }),
        prisma.purchaseOrder.findMany({
          where: { status: { in: ["SUBMITTED", "PARTIALLY_RECEIVED", "APPROVED"] } },
          include: { vendor: true },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      const now = new Date();
      const arAging = { current: 0, thirty: 0, sixty: 0, ninety: 0, total: 0 };
      const apAging = { current: 0, thirty: 0, sixty: 0, ninety: 0, total: 0 };

      const arList: any[] = [];
      const apList: any[] = [];

      unpaidInvoices.forEach((inv) => {
        const remaining = Number(inv.totalAmount) - Number(inv.amountPaid);
        const age = Math.floor((now.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
        arAging.total += remaining;

        let bracket = "0-30 Days";
        if (age <= 30) arAging.current += remaining;
        else if (age <= 60) { arAging.thirty += remaining; bracket = "31-60 Days"; }
        else if (age <= 90) { arAging.sixty += remaining; bracket = "61-90 Days"; }
        else { arAging.ninety += remaining; bracket = "90+ Days Critical"; }

        arList.push({
          id: inv.id,
          number: inv.invoiceNumber,
          party: inv.clientName,
          phone: inv.clientPhone,
          date: inv.date,
          ageDays: age,
          bracket,
          total: Number(inv.totalAmount),
          due: remaining,
        });
      });

      unpaidPOs.forEach((po) => {
        const remaining = Number(po.totalAmount);
        const age = Math.floor((now.getTime() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        apAging.total += remaining;

        let bracket = "0-30 Days";
        if (age <= 30) apAging.current += remaining;
        else if (age <= 60) { apAging.thirty += remaining; bracket = "31-60 Days"; }
        else if (age <= 90) { apAging.sixty += remaining; bracket = "61-90 Days"; }
        else { apAging.ninety += remaining; bracket = "90+ Days Critical"; }

        apList.push({
          id: po.id,
          number: po.poNumber,
          party: po.vendor?.name || "Vendor",
          date: po.createdAt,
          ageDays: age,
          bracket,
          due: remaining,
        });
      });

      return NextResponse.json({
        report: {
          accountsReceivableAging: arAging,
          accountsPayableAging: apAging,
          receivablesList: arList,
          payablesList: apList,
        },
      });
    }

    // =========================================================================
    // 9. SALES & PRODUCT PERFORMANCE
    // =========================================================================
    if (type === "sales") {
      const invoices = await prisma.invoice.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { lineItems: { include: { product: true } } },
        orderBy: { date: "desc" },
      });

      let totalSalesAmount = 0;
      let totalUnitsSold = 0;
      const salesByClient: Record<string, { count: number; amount: number }> = {};
      const salesByProduct: Record<string, { name: string; amount: number; quantity: number; category: string }> = {};

      invoices.forEach((inv) => {
        const amt = Number(inv.totalAmount || 0);
        totalSalesAmount += amt;

        if (!salesByClient[inv.clientName]) {
          salesByClient[inv.clientName] = { count: 0, amount: 0 };
        }
        salesByClient[inv.clientName].count += 1;
        salesByClient[inv.clientName].amount += amt;

        inv.lineItems.forEach((item) => {
          const key = item.productId || item.description || "Service Work";
          const name = item.product ? item.product.name : (item.description || "Service Work");
          const cat = item.product?.category || "Services";
          const lineTotal = item.quantity * Number(item.salesPrice || 0);
          totalUnitsSold += item.quantity;

          if (!salesByProduct[key]) {
            salesByProduct[key] = { name, amount: 0, quantity: 0, category: cat };
          }
          salesByProduct[key].amount += lineTotal;
          salesByProduct[key].quantity += item.quantity;
        });
      });

      return NextResponse.json({
        report: {
          totalSalesAmount,
          totalUnitsSold,
          invoiceCount: invoices.length,
          salesByClient,
          salesByProduct,
          recentInvoices: invoices.slice(0, 50),
        },
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error: any) {
    console.error("[Reports API] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
