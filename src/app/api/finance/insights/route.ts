import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { autoTagExpense, ExpenseCategory } from "@/lib/expense-tagger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "VIEW_REPORTS"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const now = new Date();
    // Default to last 30 days
    const end = endDateStr ? new Date(endDateStr) : new Date();
    end.setHours(23, 59, 59, 999);

    const start = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    // Calculate previous period for comparison
    const durationMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - durationMs);
    const prevEnd = new Date(start.getTime() - 1);

    // Query current period data in parallel
    const [
      invoices,
      prevInvoices,
      payments,
      prevPayments,
      pos,
      prevPos,
      payrolls,
      prevPayrolls,
      refunds,
      prevRefunds,
      returns,
      ledgerEntries,
      prevLedgerEntries,
      allUnpaidInvoices,
      topProductsRaw,
    ] = await Promise.all([
      // 1. Current Invoices
      prisma.invoice.findMany({
        where: { date: { gte: start, lte: end } },
        include: {
          lineItems: {
            include: { product: true },
          },
          payments: true,
        },
      }),
      // 2. Previous Invoices
      prisma.invoice.findMany({
        where: { date: { gte: prevStart, lte: prevEnd } },
        include: { lineItems: { include: { product: true } } },
      }),
      // 3. Current Payments (Cash Inflow)
      prisma.payment.findMany({
        where: { paymentDate: { gte: start, lte: end } },
      }),
      // 4. Previous Payments
      prisma.payment.findMany({
        where: { paymentDate: { gte: prevStart, lte: prevEnd } },
      }),
      // 5. Current Purchase Orders (Vendor Outflows)
      prisma.purchaseOrder.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { lineItems: true },
      }),
      // 6. Previous Purchase Orders
      prisma.purchaseOrder.findMany({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),
      // 7. Current Payroll Runs
      prisma.payrollRun.findMany({
        where: {
          status: "PAID",
          paymentDate: { gte: start, lte: end },
        },
      }),
      // 8. Previous Payroll Runs
      prisma.payrollRun.findMany({
        where: {
          status: "PAID",
          paymentDate: { gte: prevStart, lte: prevEnd },
        },
      }),
      // 9. Current Customer Refunds
      prisma.refund.findMany({
        where: { refundDate: { gte: start, lte: end } },
      }),
      // 10. Previous Customer Refunds
      prisma.refund.findMany({
        where: { refundDate: { gte: prevStart, lte: prevEnd } },
      }),
      // 11. Current Sales Returns
      prisma.return.findMany({
        where: { createdAt: { gte: start, lte: end } },
      }),
      // 12. Current Ledger Entries (General Expenses)
      prisma.ledgerEntry.findMany({
        where: { entryDate: { gte: start, lte: end } },
      }),
      // 13. Previous Ledger Entries
      prisma.ledgerEntry.findMany({
        where: { entryDate: { gte: prevStart, lte: prevEnd } },
      }),
      // 14. All Unpaid / Partially Paid Invoices for AR Aging
      prisma.invoice.findMany({
        where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
      }),
      // 15. All Products for Inventory Valuation & Margin
      prisma.product.findMany({
        include: { invoiceLineItems: { where: { invoice: { date: { gte: start, lte: end } } } } },
      }),
    ]);

    // --- REVENUE CALCULATIONS ---
    const grossRevenue = invoices.reduce((acc, inv) => acc + Number(inv.totalAmount), 0);
    const prevGrossRevenue = prevInvoices.reduce((acc, inv) => acc + Number(inv.totalAmount), 0);

    const returnsTotal = returns.reduce((acc, r) => acc + Number(r.totalAmount), 0);
    const netRevenue = Math.max(0, grossRevenue - returnsTotal);
    const prevNetRevenue = prevGrossRevenue; // approx

    // --- COGS CALCULATIONS ---
    let cogs = 0;
    for (const inv of invoices) {
      for (const line of inv.lineItems) {
        const qty = line.quantity || 0;
        const avgCost = line.product ? Number(line.product.averageCost) : 0;
        cogs += avgCost * qty;
      }
    }
    let prevCogs = 0;
    for (const inv of prevInvoices) {
      for (const line of inv.lineItems) {
        const qty = line.quantity || 0;
        const avgCost = line.product ? Number(line.product.averageCost) : 0;
        prevCogs += avgCost * qty;
      }
    }

    const grossProfit = netRevenue - cogs;
    const prevGrossProfit = prevNetRevenue - prevCogs;
    const grossMarginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const prevGrossMarginPct = prevNetRevenue > 0 ? (prevGrossProfit / prevNetRevenue) * 100 : 0;

    // --- EXPENSES & CATEGORIZATION ---
    const expenseCategories: Record<ExpenseCategory, { label: string; amount: number; count: number }> = {
      PARTS_INVENTORY: { label: "HVAC Parts & Inventory", amount: 0, count: 0 },
      SALARY_PAYROLL: { label: "Salaries & Technician Payroll", amount: 0, count: 0 },
      FUEL_TRANSPORT: { label: "Fuel & Fleet Logistics", amount: 0, count: 0 },
      OFFICE_UTILITIES: { label: "Office & Utilities", amount: 0, count: 0 },
      TOOLS_MAINTENANCE: { label: "Tools & Machinery", amount: 0, count: 0 },
      OTHER_OPERATING: { label: "General Operating Expenses", amount: 0, count: 0 },
    };

    // Add payroll runs to salary category
    for (const p of payrolls) {
      const net = Number(p.netPay);
      expenseCategories.SALARY_PAYROLL.amount += net;
      expenseCategories.SALARY_PAYROLL.count += 1;
    }

    // Add ledger entries to respective categories
    for (const e of ledgerEntries) {
      const amt = Number(e.amount);
      const isExpenseDebit = e.debitAccount.toLowerCase().includes("expense") ||
        e.debitAccount.toLowerCase().includes("payable") ||
        e.debitAccount.toLowerCase().includes("inventory") ||
        e.referenceType === "PO_RECEIPT" ||
        e.referenceType === "PAYROLL";

      if (isExpenseDebit) {
        const { category } = autoTagExpense(e.description, e.referenceType);
        // Avoid double counting payroll if already in payroll runs
        if (e.referenceType === "PAYROLL" && payrolls.length > 0) continue;
        expenseCategories[category].amount += amt;
        expenseCategories[category].count += 1;
      }
    }

    const totalOperatingExpenses = Object.values(expenseCategories).reduce((acc, cat) => acc + cat.amount, 0);

    // Prev period operating expenses approximation
    let prevOperatingExpenses = 0;
    for (const p of prevPayrolls) prevOperatingExpenses += Number(p.netPay);
    for (const e of prevLedgerEntries) {
      if (e.debitAccount.toLowerCase().includes("expense") || e.referenceType === "PO_RECEIPT") {
        prevOperatingExpenses += Number(e.amount);
      }
    }

    const netProfit = grossProfit - totalOperatingExpenses;
    const prevNetProfit = prevGrossProfit - prevOperatingExpenses;
    const netMarginPct = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
    const prevNetMarginPct = prevNetRevenue > 0 ? (prevNetProfit / prevNetRevenue) * 100 : 0;

    // --- CASH FLOW CALCULATIONS ---
    const cashInflow = payments.reduce((acc, p) => acc + Number(p.amountPaid), 0);
    const prevCashInflow = prevPayments.reduce((acc, p) => acc + Number(p.amountPaid), 0);

    const vendorPurchases = pos
      .filter((p) => p.status === "COMPLETED" || p.status === "PARTIALLY_RECEIVED" || p.status === "SUBMITTED")
      .reduce((acc, p) => acc + Number(p.totalAmount), 0);
    const payrollPaid = payrolls.reduce((acc, p) => acc + Number(p.netPay), 0);
    const refundsPaid = refunds.reduce((acc, r) => acc + Number(r.amountRefunded), 0);

    // Non-PO, non-payroll operating cash outflows
    const miscOpEx = (expenseCategories.FUEL_TRANSPORT.amount + expenseCategories.OFFICE_UTILITIES.amount + expenseCategories.TOOLS_MAINTENANCE.amount + expenseCategories.OTHER_OPERATING.amount);

    const cashOutflow = vendorPurchases + payrollPaid + refundsPaid + miscOpEx;
    const prevCashOutflow = prevPos.reduce((acc, p) => acc + Number(p.totalAmount), 0) +
      prevPayrolls.reduce((acc, p) => acc + Number(p.netPay), 0) +
      prevRefunds.reduce((acc, r) => acc + Number(r.amountRefunded), 0);

    const netCashFlow = cashInflow - cashOutflow;
    const prevNetCashFlow = prevCashInflow - prevCashOutflow;

    // --- AR AGING BRACKETS ---
    const arAging = {
      days0To30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
      totalOutstanding: 0,
      invoiceCount: allUnpaidInvoices.length,
    };

    for (const inv of allUnpaidInvoices) {
      const balance = Number(inv.totalAmount) - Number(inv.amountPaid);
      if (balance <= 0) continue;
      arAging.totalOutstanding += balance;

      const ageDays = Math.floor((now.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
      if (ageDays <= 30) {
        arAging.days0To30 += balance;
      } else if (ageDays <= 60) {
        arAging.days31To60 += balance;
      } else if (ageDays <= 90) {
        arAging.days61To90 += balance;
      } else {
        arAging.days90Plus += balance;
      }
    }

    // --- TIMELINE BUILDER (DAILY / WEEKLY / MONTHLY) ---
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const timeline: Array<{
      date: string;
      label: string;
      revenue: number;
      inflow: number;
      expenses: number;
      outflow: number;
      cogs: number;
      netProfit: number;
      netCashFlow: number;
    }> = [];

    if (diffDays <= 35) {
      // Daily timeline
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        if (d > end) break;
        const dStr = d.toISOString().split("T")[0];
        const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        const dayInvoices = invoices.filter((inv) => inv.date.toISOString().split("T")[0] === dStr);
        const dayPayments = payments.filter((p) => p.paymentDate.toISOString().split("T")[0] === dStr);
        const dayLedger = ledgerEntries.filter((l) => l.entryDate.toISOString().split("T")[0] === dStr);
        const dayPos = pos.filter((p) => p.createdAt.toISOString().split("T")[0] === dStr);
        const dayPayrolls = payrolls.filter((p) => p.paymentDate && p.paymentDate.toISOString().split("T")[0] === dStr);

        const rev = dayInvoices.reduce((acc, inv) => acc + Number(inv.totalAmount), 0);
        const inf = dayPayments.reduce((acc, p) => acc + Number(p.amountPaid), 0);

        let dayCogs = 0;
        for (const inv of dayInvoices) {
          for (const line of inv.lineItems) {
            dayCogs += (line.quantity || 0) * (line.product ? Number(line.product.averageCost) : 0);
          }
        }

        const exp = dayLedger.reduce((acc, l) => acc + (l.debitAccount.toLowerCase().includes("expense") ? Number(l.amount) : 0), 0) +
          dayPayrolls.reduce((acc, p) => acc + Number(p.netPay), 0);

        const outf = dayPos.reduce((acc, p) => acc + Number(p.totalAmount), 0) +
          dayPayrolls.reduce((acc, p) => acc + Number(p.netPay), 0) +
          (exp * 0.3); // estimated operational cash outflow

        const np = rev - dayCogs - exp;
        const ncf = inf - outf;

        timeline.push({
          date: dStr,
          label: dayLabel,
          revenue: rev,
          inflow: inf,
          expenses: exp,
          outflow: outf,
          cogs: dayCogs,
          netProfit: np,
          netCashFlow: ncf,
        });
      }
    } else {
      // Monthly / Weekly grouping
      const monthMap = new Map<string, {
        label: string;
        revenue: number;
        inflow: number;
        expenses: number;
        outflow: number;
        cogs: number;
        netProfit: number;
        netCashFlow: number;
      }>();

      for (const inv of invoices) {
        const key = inv.date.toISOString().slice(0, 7); // YYYY-MM
        const label = new Date(inv.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const cur = monthMap.get(key) || { label, revenue: 0, inflow: 0, expenses: 0, outflow: 0, cogs: 0, netProfit: 0, netCashFlow: 0 };
        cur.revenue += Number(inv.totalAmount);
        for (const line of inv.lineItems) {
          cur.cogs += (line.quantity || 0) * (line.product ? Number(line.product.averageCost) : 0);
        }
        monthMap.set(key, cur);
      }

      for (const p of payments) {
        const key = p.paymentDate.toISOString().slice(0, 7);
        const label = new Date(p.paymentDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const cur = monthMap.get(key) || { label, revenue: 0, inflow: 0, expenses: 0, outflow: 0, cogs: 0, netProfit: 0, netCashFlow: 0 };
        cur.inflow += Number(p.amountPaid);
        monthMap.set(key, cur);
      }

      for (const l of ledgerEntries) {
        const key = l.entryDate.toISOString().slice(0, 7);
        const label = new Date(l.entryDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const cur = monthMap.get(key) || { label, revenue: 0, inflow: 0, expenses: 0, outflow: 0, cogs: 0, netProfit: 0, netCashFlow: 0 };
        if (l.debitAccount.toLowerCase().includes("expense")) {
          cur.expenses += Number(l.amount);
        }
        monthMap.set(key, cur);
      }

      for (const po of pos) {
        const key = po.createdAt.toISOString().slice(0, 7);
        const label = new Date(po.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const cur = monthMap.get(key) || { label, revenue: 0, inflow: 0, expenses: 0, outflow: 0, cogs: 0, netProfit: 0, netCashFlow: 0 };
        cur.outflow += Number(po.totalAmount);
        monthMap.set(key, cur);
      }

      // Sort chronological
      const sortedKeys = Array.from(monthMap.keys()).sort();
      for (const k of sortedKeys) {
        const item = monthMap.get(k)!;
        item.netProfit = item.revenue - item.cogs - item.expenses;
        item.netCashFlow = item.inflow - item.outflow;
        timeline.push({
          date: k,
          ...item,
        });
      }
    }

    // --- TOP PRODUCTS PROFITABILITY ---
    const topProducts = topProductsRaw
      .map((prod) => {
        let unitsSold = 0;
        let totalRevenue = 0;
        for (const line of prod.invoiceLineItems) {
          unitsSold += line.quantity;
          totalRevenue += Number(line.salesPrice) * line.quantity;
        }
        const totalCost = unitsSold * Number(prod.averageCost);
        const profit = totalRevenue - totalCost;
        const marginPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        return {
          id: prod.id,
          sku: prod.sku,
          name: prod.name,
          category: prod.category,
          unitsSold,
          totalRevenue,
          totalCost,
          profit,
          marginPct,
        };
      })
      .filter((p) => p.unitsSold > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 6);

    // --- HELPER FOR PERCENTAGE VARIANCE ---
    const calcVariance = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / Math.abs(prev)) * 100).toFixed(1));
    };

    // --- P&L WATERFALL DATA ---
    const pnlWaterfall = [
      { name: "Gross Invoiced", amount: grossRevenue, fill: "#3b82f6" },
      { name: "Returns & Refunds", amount: -returnsTotal, fill: "#ef4444" },
      { name: "Net Sales", amount: netRevenue, isSubtotal: true, fill: "#6366f1" },
      { name: "COGS (Cost)", amount: -cogs, fill: "#f97316" },
      { name: "Gross Profit", amount: grossProfit, isSubtotal: true, fill: "#10b981" },
      { name: "Salaries/Payroll", amount: -expenseCategories.SALARY_PAYROLL.amount, fill: "#f59e0b" },
      { name: "Parts & Logistics", amount: -(expenseCategories.PARTS_INVENTORY.amount + expenseCategories.FUEL_TRANSPORT.amount), fill: "#ec4899" },
      { name: "Utilities & Tools", amount: -(expenseCategories.OFFICE_UTILITIES.amount + expenseCategories.TOOLS_MAINTENANCE.amount + expenseCategories.OTHER_OPERATING.amount), fill: "#8b5cf6" },
      { name: "Net Profit", amount: netProfit, isTotal: true, fill: netProfit >= 0 ? "#10b981" : "#ef4444" },
    ];

    return NextResponse.json({
      success: true,
      period: {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        prevStartDate: prevStart.toISOString().split("T")[0],
        prevEndDate: prevEnd.toISOString().split("T")[0],
      },
      kpis: {
        grossRevenue: { value: grossRevenue, prev: prevGrossRevenue, variance: calcVariance(grossRevenue, prevGrossRevenue) },
        netRevenue: { value: netRevenue, prev: prevNetRevenue, variance: calcVariance(netRevenue, prevNetRevenue) },
        cogs: { value: cogs, prev: prevCogs, variance: calcVariance(cogs, prevCogs) },
        grossProfit: { value: grossProfit, prev: prevGrossProfit, variance: calcVariance(grossProfit, prevGrossProfit) },
        grossMarginPct: { value: Number(grossMarginPct.toFixed(1)), prev: Number(prevGrossMarginPct.toFixed(1)), variance: Number((grossMarginPct - prevGrossMarginPct).toFixed(1)) },
        operatingExpenses: { value: totalOperatingExpenses, prev: prevOperatingExpenses, variance: calcVariance(totalOperatingExpenses, prevOperatingExpenses) },
        netProfit: { value: netProfit, prev: prevNetProfit, variance: calcVariance(netProfit, prevNetProfit) },
        netMarginPct: { value: Number(netMarginPct.toFixed(1)), prev: Number(prevNetMarginPct.toFixed(1)), variance: Number((netMarginPct - prevNetMarginPct).toFixed(1)) },
        cashInflow: { value: cashInflow, prev: prevCashInflow, variance: calcVariance(cashInflow, prevCashInflow) },
        cashOutflow: { value: cashOutflow, prev: prevCashOutflow, variance: calcVariance(cashOutflow, prevCashOutflow) },
        netCashFlow: { value: netCashFlow, prev: prevNetCashFlow, variance: calcVariance(netCashFlow, prevNetCashFlow) },
      },
      expenseCategories,
      arAging,
      pnlWaterfall,
      timeline,
      topProducts,
    });
  } catch (error: any) {
    console.error("Financial insights API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
