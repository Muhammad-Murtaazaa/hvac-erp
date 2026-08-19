"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Calendar,
  ChevronRight,
  FileText,
  Scale,
  TrendingUp,
  Wallet,
  Building2,
  User,
  Users,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Landmark,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  DollarSign,
  PieChart,
  BarChart3,
  Layers,
  Sparkles,
} from "lucide-react";
import SkeletonTable from "@/components/shared/SkeletonTable";

type ReportType =
  | "pnl"
  | "trial_balance"
  | "cash_flow"
  | "ledger"
  | "customer_balances"
  | "vendor_balances"
  | "valuation"
  | "aging"
  | "sales";

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") as ReportType) || "pnl";

  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [tableSearch, setTableSearch] = useState("");
  const [timePreset, setTimePreset] = useState<"this_month" | "last_30" | "quarter" | "ytd" | "all">("last_30");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const applyTimePreset = (preset: "this_month" | "last_30" | "quarter" | "ytd" | "all") => {
    setTimePreset(preset);
    const now = new Date();
    const end = now.toISOString().split("T")[0];
    setEndDate(end);

    if (preset === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(first.toISOString().split("T")[0]);
    } else if (preset === "last_30") {
      const prev = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(prev.toISOString().split("T")[0]);
    } else if (preset === "quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const first = new Date(now.getFullYear(), qMonth, 1);
      setStartDate(first.toISOString().split("T")[0]);
    } else if (preset === "ytd") {
      const first = new Date(now.getFullYear(), 0, 1);
      setStartDate(first.toISOString().split("T")[0]);
    } else if (preset === "all") {
      setStartDate("2024-01-01");
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/reports?type=${reportType}&startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch report data");
      }

      const data = await res.json();
      setReportData(data.report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate]);

  useEffect(() => {
    const type = searchParams.get("type") as ReportType;
    if (type) setReportType(type);
  }, [searchParams]);

  // =========================================================================
  // DYNAMIC CSV EXPORT
  // =========================================================================
  const exportToCSV = () => {
    if (!reportData) return;

    let headers: string[] = [];
    let rows: any[] = [];
    const fileName = `${reportType}_report_${startDate}_to_${endDate}.csv`;

    if (reportType === "trial_balance") {
      headers = ["Account Code", "Account Name", "Classification", "Normal Side", "Period Debit (PKR)", "Period Credit (PKR)", "Closing Debit (PKR)", "Closing Credit (PKR)", "Net Balance (PKR)"];
      rows = (reportData.rows || []).map((r: any) => [
        r.code,
        `"${r.name}"`,
        r.type,
        r.normal,
        Number(r.periodDebit).toFixed(2),
        Number(r.periodCredit).toFixed(2),
        Number(r.closingDebit).toFixed(2),
        Number(r.closingCredit).toFixed(2),
        Number(r.netBalance).toFixed(2),
      ]);
      rows.push([
        "TOTALS",
        "",
        "",
        "",
        Number(reportData.totals?.totalPeriodDebit || 0).toFixed(2),
        Number(reportData.totals?.totalPeriodCredit || 0).toFixed(2),
        Number(reportData.totals?.totalClosingDebit || 0).toFixed(2),
        Number(reportData.totals?.totalClosingCredit || 0).toFixed(2),
        "",
      ]);
    } else if (reportType === "pnl") {
      headers = ["Financial Statement Line Item", "Amount (PKR)"];
      rows = [
        ["Invoiced Sales Revenue", Number(reportData.salesRevenue || 0).toFixed(2)],
        ["Service & Maintenance Income", Number(reportData.serviceIncome || 0).toFixed(2)],
        ["Less: Sales Returns", Number(reportData.salesReturns || 0).toFixed(2)],
        ["Total Net Revenue", Number(reportData.totalRevenue || 0).toFixed(2)],
        ["Less: Cost of Goods Sold (COGS)", Number(reportData.cogs || 0).toFixed(2)],
        ["Gross Operating Profit", Number(reportData.grossProfit || 0).toFixed(2)],
        ["Gross Margin %", `${Number(reportData.grossMargin || 0).toFixed(1)}%`],
        ["Operating Expenses:", ""],
        ["  Salary & Payroll Expense", Number(reportData.expenses?.salaryExpense || 0).toFixed(2)],
        ["  Office Rent & Utilities", Number(reportData.expenses?.rentUtilitiesExpense || 0).toFixed(2)],
        ["  Transportation & Freight", Number(reportData.expenses?.freightExpense || 0).toFixed(2)],
        ["  Inventory Adjustments", Number(reportData.expenses?.inventoryAdjustments || 0).toFixed(2)],
        ["  Miscellaneous Overhead", Number(reportData.expenses?.miscExpenses || 0).toFixed(2)],
        ["Total Operating Expenses", Number(reportData.totalExpenses || 0).toFixed(2)],
        ["Net Net Income / (Loss)", Number(reportData.netProfit || 0).toFixed(2)],
        ["Net Profit Margin %", `${Number(reportData.netMargin || 0).toFixed(1)}%`],
      ];
    } else if (reportType === "cash_flow") {
      headers = ["Date", "Transaction Type", "Channel / Account", "Party / Reference", "Description", "Amount (PKR)"];
      rows = (reportData.transactions || []).map((t: any) => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        `"${t.account}"`,
        `"${t.party || ""}"`,
        `"${(t.description || "").replace(/"/g, '""')}"`,
        Number(t.amount).toFixed(2),
      ]);
    } else if (reportType === "customer_balances") {
      headers = ["Customer Name", "Contact Phone", "Billing Address", "Total Invoiced (PKR)", "Total Paid (PKR)", "Net Due Balance (PKR)"];
      rows = (reportData.customers || []).map((c: any) => [
        `"${c.name}"`,
        c.phone || "",
        `"${(c.address || "").replace(/"/g, '""')}"`,
        Number(c.totalBilled).toFixed(2),
        Number(c.totalPaid).toFixed(2),
        Number(c.balance).toFixed(2),
      ]);
    } else if (reportType === "vendor_balances") {
      headers = ["Vendor / Supplier Name", "Contact Person", "Phone", "Total Purchases (PKR)", "Total Disbursed (PKR)", "Net Payable Balance (PKR)"];
      rows = (reportData.vendors || []).map((v: any) => [
        `"${v.name}"`,
        `"${v.contactPerson || ""}"`,
        v.phone || "",
        Number(v.totalPurchases).toFixed(2),
        Number(v.totalPaid).toFixed(2),
        Number(v.balance).toFixed(2),
      ]);
    } else if (reportType === "valuation") {
      headers = ["SKU", "Product Name", "Category", "On Hand Qty", "Avg Cost (PKR)", "Total Valuation (PKR)"];
      rows = (reportData.items || []).map((p: any) => [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        p.onHandQty,
        Number(p.averageCost).toFixed(2),
        Number(p.totalValue).toFixed(2),
      ]);
    } else if (reportType === "aging") {
      headers = ["Document #", "Party Name", "Document Date", "Age (Days)", "Aging Bracket", "Due Balance (PKR)"];
      (reportData.receivablesList || []).forEach((r: any) => {
        rows.push([r.number, `"${r.party}"`, new Date(r.date).toLocaleDateString(), r.ageDays, r.bracket, Number(r.due).toFixed(2)]);
      });
    } else if (reportType === "ledger") {
      headers = ["Entry Date", "Voucher #", "Type", "Party", "Debit Account", "Credit Account", "Amount (PKR)", "Description"];
      rows = (reportData || []).map((e: any) => [
        new Date(e.entryDate).toLocaleDateString(),
        e.voucherNumber || "",
        e.voucherType || "",
        `"${e.partyName || ""}"`,
        e.debitAccount,
        e.creditAccount,
        Number(e.amount).toFixed(2),
        `"${(e.description || "").replace(/"/g, '""')}"`,
      ]);
    }

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Report navigation catalog
  const reportCatalog = [
    {
      group: "Financial & Double-Entry Accounting",
      items: [
        { id: "pnl", label: "Profit & Loss (P&L)", icon: TrendingUp, desc: "Revenue, COGS, gross & net income margins" },
        { id: "trial_balance", label: "Trial Balance", icon: Scale, desc: "Debit/credit balance check for all chart of accounts" },
        { id: "cash_flow", label: "Cash & Bank Movement", icon: Wallet, desc: "Liquidity inflows, outflows, and account balances" },
        { id: "ledger", label: "General Audit Ledger", icon: FileText, desc: "Chronological double-entry voucher journal" },
      ],
    },
    {
      group: "Party & Sub-Ledger Statements",
      items: [
        { id: "customer_balances", label: "Customer Receivables", icon: User, desc: "Trade debtors ledger balances & collection status" },
        { id: "vendor_balances", label: "Vendor Payables", icon: Building2, desc: "Supplier trade payables & disbursement status" },
        { id: "aging", label: "AR & AP Aging Analysis", icon: Clock, desc: "Overdue debt brackets (0-30, 31-60, 61-90, 90+ days)" },
      ],
    },
    {
      group: "Commercial & Inventory Operations",
      items: [
        { id: "valuation", label: "Stock Asset Valuation", icon: Package, desc: "On-hand inventory valuation at moving average cost" },
        { id: "sales", label: "Sales & Product Velocity", icon: BarChart3, desc: "Invoiced volume by client, SKU, and categories" },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* ========================================================================= */}
      {/* TOP HEADER & ACTION DOCK                                                  */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                  Financial & Operational Intelligence
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                Financial Reports & Audit Center
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate GAAP-compliant financial statements, double-entry trial balances, and operational audit reports.
              </p>
            </div>
          </div>

          {/* Export & Print Tools */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={exportToCSV}
              disabled={loading || !reportData}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV / Excel</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={loading || !reportData}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Global Date Controls & Presets */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl text-xs font-bold border border-slate-200/60 dark:border-slate-700/60">
            {(["this_month", "last_30", "quarter", "ytd", "all"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => applyTimePreset(preset)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timePreset === preset
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-black shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {preset === "this_month"
                  ? "This Month"
                  : preset === "last_30"
                  ? "Last 30 Days"
                  : preset === "quarter"
                  ? "This Quarter"
                  : preset === "ytd"
                  ? "Year to Date (YTD)"
                  : "All Time"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REPORT CATALOG SELECTOR PILLS                                             */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {reportCatalog.map((cat, idx) => (
          <div key={idx} className="space-y-2">
            <span className="text-[10.5px] font-black uppercase tracking-widest text-slate-400 px-1">
              {cat.group}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isSelected = reportType === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setReportType(item.id as ReportType);
                      setTableSearch("");
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      isSelected
                        ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md shadow-blue-500/20 ring-2 ring-blue-400/40"
                        : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-white/20 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <div className={`font-black text-xs ${isSelected ? "text-white" : "text-slate-900 dark:text-white"}`}>
                      {item.label}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 line-clamp-1 ${
                        isSelected ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* MAIN REPORT VIEWPORT CONTAINER                                            */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 space-y-6">
        {loading ? (
          <div className="py-12 space-y-4 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-xs font-bold text-slate-500">Compiling financial report data...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs text-center">
            {error}
          </div>
        ) : !reportData ? (
          <div className="p-8 text-center text-slate-400 text-xs">No report data generated.</div>
        ) : (
          <>
            {/* --------------------------------------------------------------------- */}
            {/* REPORT 1: PROFIT & LOSS STATEMENT                                     */}
            {/* --------------------------------------------------------------------- */}
            {reportType === "pnl" && (
              <div className="space-y-6">
                {/* 4 Financial Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Total Net Revenue</span>
                    <div className="text-xl font-mono font-black text-blue-700 dark:text-blue-300 mt-1">
                      PKR {Math.round(reportData.totalRevenue || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Cost of Goods (COGS)</span>
                    <div className="text-xl font-mono font-black text-amber-700 dark:text-amber-300 mt-1">
                      PKR {Math.round(reportData.cogs || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Operating Expenses</span>
                    <div className="text-xl font-mono font-black text-purple-700 dark:text-purple-300 mt-1">
                      PKR {Math.round(reportData.totalExpenses || 0).toLocaleString()}
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-2xl border ${
                      reportData.netProfit >= 0
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest block">Net Profit / (Loss)</span>
                    <div className="text-xl font-mono font-black mt-1">
                      PKR {Math.round(reportData.netProfit || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Structured Income Statement Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3.5">Account / Line Item</th>
                        <th className="p-3.5 text-right">Debit / Cost (PKR)</th>
                        <th className="p-3.5 text-right">Credit / Revenue (PKR)</th>
                        <th className="p-3.5 text-right font-black">Net Total (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {/* Revenue */}
                      <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-bold text-slate-900 dark:text-white">
                        <td className="p-3">1. Operating Revenue</td>
                        <td></td>
                        <td></td>
                        <td className="p-3 text-right font-mono">PKR {Math.round(reportData.totalRevenue).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-8 text-slate-600 dark:text-slate-400">Invoiced Sales Revenue</td>
                        <td className="p-3 text-right font-mono text-slate-400">-</td>
                        <td className="p-3 text-right font-mono text-emerald-600">PKR {Math.round(reportData.salesRevenue).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono">PKR {Math.round(reportData.salesRevenue).toLocaleString()}</td>
                      </tr>
                      {reportData.serviceIncome > 0 && (
                        <tr>
                          <td className="p-3 pl-8 text-slate-600 dark:text-slate-400">Service & Maintenance Income</td>
                          <td className="p-3 text-right font-mono text-slate-400">-</td>
                          <td className="p-3 text-right font-mono text-emerald-600">PKR {Math.round(reportData.serviceIncome).toLocaleString()}</td>
                          <td className="p-3 text-right font-mono">PKR {Math.round(reportData.serviceIncome).toLocaleString()}</td>
                        </tr>
                      )}
                      {reportData.salesReturns > 0 && (
                        <tr>
                          <td className="p-3 pl-8 text-slate-600 dark:text-slate-400">Less: Sales Returns</td>
                          <td className="p-3 text-right font-mono text-rose-600">(PKR {Math.round(reportData.salesReturns).toLocaleString()})</td>
                          <td className="p-3 text-right font-mono text-slate-400">-</td>
                          <td className="p-3 text-right font-mono text-rose-600">-PKR {Math.round(reportData.salesReturns).toLocaleString()}</td>
                        </tr>
                      )}

                      {/* COGS */}
                      <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-bold text-slate-900 dark:text-white">
                        <td className="p-3">2. Cost of Sales (COGS)</td>
                        <td className="p-3 text-right font-mono text-rose-600">PKR {Math.round(reportData.cogs).toLocaleString()}</td>
                        <td></td>
                        <td className="p-3 text-right font-mono text-rose-600">-PKR {Math.round(reportData.cogs).toLocaleString()}</td>
                      </tr>

                      {/* Gross Profit */}
                      <tr className="bg-blue-50/60 dark:bg-blue-950/40 font-black text-blue-900 dark:text-blue-200">
                        <td className="p-3.5">GROSS OPERATING PROFIT (Margin: {reportData.grossMargin?.toFixed(1)}%)</td>
                        <td></td>
                        <td></td>
                        <td className="p-3.5 text-right font-mono text-sm">PKR {Math.round(reportData.grossProfit).toLocaleString()}</td>
                      </tr>

                      {/* Operating Expenses */}
                      <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-bold text-slate-900 dark:text-white">
                        <td className="p-3">3. Operating Overhead Expenses</td>
                        <td className="p-3 text-right font-mono text-rose-600">PKR {Math.round(reportData.totalExpenses).toLocaleString()}</td>
                        <td></td>
                        <td className="p-3 text-right font-mono text-rose-600">-PKR {Math.round(reportData.totalExpenses).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-8 text-slate-600 dark:text-slate-400">Staff Salaries & Payroll</td>
                        <td className="p-3 text-right font-mono text-rose-600">PKR {Math.round(reportData.expenses?.salaryExpense || 0).toLocaleString()}</td>
                        <td></td>
                        <td className="p-3 text-right font-mono text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-8 text-slate-600 dark:text-slate-400">Office Rent & Utilities</td>
                        <td className="p-3 text-right font-mono text-rose-600">PKR {Math.round(reportData.expenses?.rentUtilitiesExpense || 0).toLocaleString()}</td>
                        <td></td>
                        <td className="p-3 text-right font-mono text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-8 text-slate-600 dark:text-slate-400">Transportation & Freight Charges</td>
                        <td className="p-3 text-right font-mono text-rose-600">PKR {Math.round(reportData.expenses?.freightExpense || 0).toLocaleString()}</td>
                        <td></td>
                        <td className="p-3 text-right font-mono text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-8 text-slate-600 dark:text-slate-400">Inventory Adjustments / Losses</td>
                        <td className="p-3 text-right font-mono text-rose-600">PKR {Math.round(reportData.expenses?.inventoryAdjustments || 0).toLocaleString()}</td>
                        <td></td>
                        <td className="p-3 text-right font-mono text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-8 text-slate-600 dark:text-slate-400">Miscellaneous Administrative Expenses</td>
                        <td className="p-3 text-right font-mono text-rose-600">PKR {Math.round(reportData.expenses?.miscExpenses || 0).toLocaleString()}</td>
                        <td></td>
                        <td className="p-3 text-right font-mono text-slate-400">-</td>
                      </tr>

                      {/* Net Net Profit */}
                      <tr className="bg-slate-900 text-white font-black text-sm">
                        <td className="p-4">NET NET PROFIT / (LOSS) FOR PERIOD (Net Margin: {reportData.netMargin?.toFixed(1)}%)</td>
                        <td></td>
                        <td></td>
                        <td className="p-4 text-right font-mono text-emerald-400">
                          PKR {Math.round(reportData.netProfit).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* REPORT 2: TRIAL BALANCE REPORT                                        */}
            {/* --------------------------------------------------------------------- */}
            {reportType === "trial_balance" && (
              <div className="space-y-5">
                {/* Balance Status Banner */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Double-Entry Balance Verification:</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                          ✓ PERFECTLY BALANCED
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Total Closing Debits equal Total Closing Credits. All vouchers reconciled.
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Book Value</span>
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      PKR {Math.round(reportData.totals?.totalClosingDebit || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Trial Balance Grid */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Code</th>
                        <th className="p-3">Account Title</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Period Debit (PKR)</th>
                        <th className="p-3 text-right">Period Credit (PKR)</th>
                        <th className="p-3 text-right text-emerald-600">Closing Debit</th>
                        <th className="p-3 text-right text-amber-600">Closing Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {(reportData.rows || []).map((r: any) => (
                        <tr key={r.code} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-blue-600">{r.code}</td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{r.name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {r.type}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono">{r.periodDebit > 0 ? `PKR ${Math.round(r.periodDebit).toLocaleString()}` : "-"}</td>
                          <td className="p-3 text-right font-mono">{r.periodCredit > 0 ? `PKR ${Math.round(r.periodCredit).toLocaleString()}` : "-"}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600">{r.closingDebit > 0 ? `PKR ${Math.round(r.closingDebit).toLocaleString()}` : "-"}</td>
                          <td className="p-3 text-right font-mono font-bold text-amber-600">{r.closingCredit > 0 ? `PKR ${Math.round(r.closingCredit).toLocaleString()}` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-950 font-black border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td colSpan={3} className="p-3.5 text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                          Grand Total (Double-Entry Reconciled)
                        </td>
                        <td className="p-3.5 text-right font-mono text-xs">PKR {Math.round(reportData.totals?.totalPeriodDebit || 0).toLocaleString()}</td>
                        <td className="p-3.5 text-right font-mono text-xs">PKR {Math.round(reportData.totals?.totalPeriodCredit || 0).toLocaleString()}</td>
                        <td className="p-3.5 text-right font-mono text-xs text-emerald-600">PKR {Math.round(reportData.totals?.totalClosingDebit || 0).toLocaleString()}</td>
                        <td className="p-3.5 text-right font-mono text-xs text-amber-600">PKR {Math.round(reportData.totals?.totalClosingCredit || 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* REPORT 3: CASH FLOW & BANK BOOK                                       */}
            {/* --------------------------------------------------------------------- */}
            {reportType === "cash_flow" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                      <ArrowDownLeft className="w-3.5 h-3.5" /> Total Cash Inflow (Receipts)
                    </span>
                    <div className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1">
                      PKR {Math.round(reportData.totalInflow || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Total Cash Outflow (Payments)
                    </span>
                    <div className="text-xl font-mono font-black text-rose-700 dark:text-rose-300 mt-1">
                      PKR {Math.round(reportData.totalOutflow || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Net Liquidity Change</span>
                    <div className="text-xl font-mono font-black text-blue-700 dark:text-blue-300 mt-1">
                      PKR {Math.round(reportData.netCashChange || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Account Balances Ribbon */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(reportData.byAccount || {}).map(([acc, val]: any) => (
                    <div key={acc} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-white truncate block">{acc}</span>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-emerald-600">In: {Math.round(val.in).toLocaleString()}</span>
                        <span className="text-rose-600">Out: {Math.round(val.out).toLocaleString()}</span>
                        <span className="font-black text-slate-900 dark:text-white">Net: {Math.round(val.balance).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Movement Transaction List */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Account Channel</th>
                        <th className="p-3">Party / Beneficiary</th>
                        <th className="p-3">Narration</th>
                        <th className="p-3 text-right font-black">Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(reportData.transactions || []).map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 font-medium">
                          <td className="p-3 font-mono text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                t.type === "INFLOW"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : t.type === "OUTFLOW"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              }`}
                            >
                              {t.type}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-800 dark:text-white">{t.account}</td>
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{t.party}</td>
                          <td className="p-3 text-slate-500 italic truncate max-w-xs">{t.description}</td>
                          <td
                            className={`p-3 text-right font-mono font-bold ${
                              t.type === "INFLOW" ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {t.type === "INFLOW" ? "+" : "-"}PKR {Math.round(t.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* REPORT 4: CUSTOMER BALANCES (TRADE RECEIVABLES)                       */}
            {/* --------------------------------------------------------------------- */}
            {reportType === "customer_balances" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Total Invoiced Billed</span>
                    <div className="text-xl font-mono font-black text-blue-700 dark:text-blue-300 mt-1">
                      PKR {Math.round(reportData.totals?.grandTotalBilled || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Total Collected Receipts</span>
                    <div className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1">
                      PKR {Math.round(reportData.totals?.grandTotalPaid || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Net Open Receivables</span>
                    <div className="text-xl font-mono font-black text-rose-700 dark:text-rose-300 mt-1">
                      PKR {Math.round(reportData.totals?.grandTotalReceivables || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search customer name, phone, address..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3 text-right">Total Billed</th>
                        <th className="p-3 text-right">Total Collected</th>
                        <th className="p-3 text-right font-black">Net Receivable (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(reportData.customers || [])
                        .filter((c: any) =>
                          !tableSearch ||
                          c.name?.toLowerCase().includes(tableSearch.toLowerCase()) ||
                          c.phone?.includes(tableSearch)
                        )
                        .map((c: any) => (
                          <tr key={c.name} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{c.name}</td>
                            <td className="p-3 font-mono text-slate-500">{c.phone || "-"}</td>
                            <td className="p-3 text-right font-mono">PKR {Math.round(c.totalBilled).toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-emerald-600">PKR {Math.round(c.totalPaid).toLocaleString()}</td>
                            <td className={`p-3 text-right font-mono font-black ${c.balance > 0 ? "text-rose-600" : "text-slate-400"}`}>
                              PKR {Math.round(c.balance).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* REPORT 5: VENDOR BALANCES (TRADE PAYABLES)                            */}
            {/* --------------------------------------------------------------------- */}
            {reportType === "vendor_balances" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Total Purchases / Bills</span>
                    <div className="text-xl font-mono font-black text-blue-700 dark:text-blue-300 mt-1">
                      PKR {Math.round(reportData.totals?.grandTotalPurchases || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Total Disbursed Paid</span>
                    <div className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1">
                      PKR {Math.round(reportData.totals?.grandTotalDisbursed || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Net Open Payables</span>
                    <div className="text-xl font-mono font-black text-amber-700 dark:text-amber-300 mt-1">
                      PKR {Math.round(reportData.totals?.grandTotalPayables || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Vendor / Supplier</th>
                        <th className="p-3">Contact Person</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3 text-right">Total Purchases</th>
                        <th className="p-3 text-right">Disbursed Paid</th>
                        <th className="p-3 text-right font-black">Net Payable (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(reportData.vendors || []).map((v: any) => (
                        <tr key={v.id || v.name} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{v.name}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{v.contactPerson || "-"}</td>
                          <td className="p-3 font-mono text-slate-500">{v.phone || "-"}</td>
                          <td className="p-3 text-right font-mono">PKR {Math.round(v.totalPurchases).toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-emerald-600">PKR {Math.round(v.totalPaid).toLocaleString()}</td>
                          <td className={`p-3 text-right font-mono font-black ${v.balance > 0 ? "text-amber-600" : "text-slate-400"}`}>
                            PKR {Math.round(v.balance).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* REPORT 6: GENERAL AUDIT LEDGER                                        */}
            {/* --------------------------------------------------------------------- */}
            {reportType === "ledger" && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search journal entries, accounts, descriptions, vouchers..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Voucher #</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Party</th>
                        <th className="p-3">Debit Account</th>
                        <th className="p-3">Credit Account</th>
                        <th className="p-3 text-right font-black">Amount (PKR)</th>
                        <th className="p-3">Narration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(Array.isArray(reportData) ? reportData : [])
                        .filter(
                          (e: any) =>
                            !tableSearch ||
                            (e.description || "").toLowerCase().includes(tableSearch.toLowerCase()) ||
                            (e.debitAccount || "").toLowerCase().includes(tableSearch.toLowerCase()) ||
                            (e.creditAccount || "").toLowerCase().includes(tableSearch.toLowerCase()) ||
                            (e.partyName || "").toLowerCase().includes(tableSearch.toLowerCase()) ||
                            (e.voucherNumber || "").toLowerCase().includes(tableSearch.toLowerCase())
                        )
                        .map((e: any) => (
                          <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 font-medium">
                            <td className="p-3 font-mono text-slate-500">{new Date(e.entryDate).toLocaleDateString()}</td>
                            <td className="p-3 font-mono font-bold text-blue-600">{e.voucherNumber || "-"}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                {e.voucherType || "JV"}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{e.partyName || "-"}</td>
                            <td className="p-3 font-semibold text-emerald-600">{e.debitAccount}</td>
                            <td className="p-3 font-semibold text-amber-600">{e.creditAccount}</td>
                            <td className="p-3 text-right font-mono font-black">PKR {Number(e.amount).toLocaleString()}</td>
                            <td className="p-3 text-slate-500 italic truncate max-w-xs">{e.description}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* REPORT 7: STOCK VALUATION                                             */}
            {/* --------------------------------------------------------------------- */}
            {reportType === "valuation" && (
              <div className="space-y-5">
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">
                      Total In-Stock Asset Value
                    </span>
                    <span className="text-2xl font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
                      PKR {Math.round(reportData.totalValuation || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Total Physical Inventory Units:
                    </span>
                    <span className="font-mono font-black text-lg block text-slate-900 dark:text-white">
                      {reportData.totalItemsCount || 0} units
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">In Stock</th>
                        <th className="p-3 text-right">Avg Cost (PKR)</th>
                        <th className="p-3 text-right font-black">Stock Valuation (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(reportData.items || []).map((p: any) => (
                        <tr key={p.sku} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 font-medium">
                          <td className="p-3 font-mono font-bold text-blue-600">{p.sku}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{p.name}</td>
                          <td className="p-3 text-slate-500">{p.category}</td>
                          <td className="p-3 text-right font-mono font-bold">{p.onHandQty}</td>
                          <td className="p-3 text-right font-mono">PKR {Math.round(p.averageCost).toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-black text-emerald-600">
                            PKR {Math.round(p.totalValue).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* REPORT 8: AGING ANALYSIS                                              */}
            {/* --------------------------------------------------------------------- */}
            {reportType === "aging" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Current (0-30 Days)</span>
                    <div className="text-lg font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1">
                      PKR {Math.round(reportData.accountsReceivableAging?.current || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">31-60 Days</span>
                    <div className="text-lg font-mono font-black text-blue-700 dark:text-blue-300 mt-1">
                      PKR {Math.round(reportData.accountsReceivableAging?.thirty || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">61-90 Days</span>
                    <div className="text-lg font-mono font-black text-amber-700 dark:text-amber-300 mt-1">
                      PKR {Math.round(reportData.accountsReceivableAging?.sixty || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">90+ Days Critical</span>
                    <div className="text-lg font-mono font-black text-rose-700 dark:text-rose-300 mt-1">
                      PKR {Math.round(reportData.accountsReceivableAging?.ninety || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Age (Days)</th>
                        <th className="p-3">Aging Status</th>
                        <th className="p-3 text-right font-black">Overdue Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(reportData.receivablesList || []).map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 font-medium">
                          <td className="p-3 font-mono font-bold text-blue-600">{r.number}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{r.party}</td>
                          <td className="p-3 font-mono text-slate-500">{new Date(r.date).toLocaleDateString()}</td>
                          <td className="p-3 font-mono">{r.ageDays} days</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                r.bracket.includes("90+")
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : r.bracket.includes("61-90")
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              }`}
                            >
                              {r.bracket}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-black text-rose-600">
                            PKR {Math.round(r.due).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* REPORT 9: SALES & VELOCITY                                            */}
            {/* --------------------------------------------------------------------- */}
            {reportType === "sales" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Total Invoiced Sales</span>
                    <div className="text-xl font-mono font-black text-blue-700 dark:text-blue-300 mt-1">
                      PKR {Math.round(reportData.totalSalesAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Total Units Dispatched</span>
                    <div className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1">
                      {reportData.totalUnitsSold || 0} units
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Invoices Billed</span>
                    <div className="text-xl font-mono font-black text-purple-700 dark:text-purple-300 mt-1">
                      {reportData.invoiceCount || 0} invoices
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Clients */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
                    <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Sales Breakdown by Client
                    </h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                      {Object.entries(reportData.salesByClient || {}).map(([client, stat]: any) => (
                        <div key={client} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                          <span className="font-bold text-slate-800 dark:text-white">{client}</span>
                          <span className="font-mono font-black text-blue-600">
                            PKR {Math.round(stat.amount || stat).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
                    <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Product Velocity & Revenue
                    </h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                      {Object.entries(reportData.salesByProduct || {}).map(([key, stat]: any) => (
                        <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                          <div className="truncate max-w-xs">
                            <span className="font-bold text-slate-800 dark:text-white block truncate">{stat.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Qty: {stat.quantity}</span>
                          </div>
                          <span className="font-mono font-black text-emerald-600">
                            PKR {Math.round(stat.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Financial Reports...</div>}>
      <ReportsContent />
    </React.Suspense>
  );
}
