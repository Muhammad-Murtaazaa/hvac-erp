"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  ShoppingBag,
  Percent,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import AnimatedCounter from "@/components/shared/AnimatedCounter";
import { SkeletonCard } from "@/components/shared/SkeletonTable";

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

function FinancialsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Timeframe presets
  const [timeframe, setTimeframe] = useState<"30d" | "this_month" | "quarter" | "ytd" | "all" | "custom">("30d");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"cashflow" | "expenses" | "pnl" | "ar_aging">("cashflow");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const applyTimeframe = (preset: "30d" | "this_month" | "quarter" | "ytd" | "all" | "custom") => {
    setTimeframe(preset);
    const now = new Date();
    if (preset === "30d") {
      setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(first.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const qStart = new Date(now.getFullYear(), qMonth, 1);
      setStartDate(qStart.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "ytd") {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      setStartDate(yearStart.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "all") {
      setStartDate("2024-01-01");
      setEndDate(now.toISOString().split("T")[0]);
    }
  };

  const fetchFinancials = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const res = await fetch(`/api/finance/insights?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch financial data");
      }

      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || "Failed to load financials");
      }
    } catch (err: any) {
      console.error("Financials fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [startDate, endDate]);

  // Format currency in PKR
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format compact currency (e.g. 1.2M, 450K)
  const formatCompact = (amount: number) => {
    if (Math.abs(amount) >= 1_000_000) {
      return (amount / 1_000_000).toFixed(1) + "M";
    }
    if (Math.abs(amount) >= 1_000) {
      return (amount / 1_000).toFixed(0) + "K";
    }
    return String(Math.round(amount));
  };

  // CSV Exporter
  const exportFinancialsCSV = () => {
    if (!data) return;
    const { kpis, expenseCategories, timeline } = data;

    let csv = "HVAC ERP - Financial Insights & Analytics Report\n";
    csv += `Period: ${data.period.startDate} to ${data.period.endDate}\n\n`;

    csv += "KEY FINANCIAL METRICS (PKR)\n";
    csv += "Metric,Current Period,Previous Period,Variance %\n";
    csv += `Gross Revenue,${kpis.grossRevenue.value},${kpis.grossRevenue.prev},${kpis.grossRevenue.variance}%\n`;
    csv += `Net Revenue,${kpis.netRevenue.value},${kpis.netRevenue.prev},${kpis.netRevenue.variance}%\n`;
    csv += `Cost of Goods Sold (COGS),${kpis.cogs.value},${kpis.cogs.prev},${kpis.cogs.variance}%\n`;
    csv += `Gross Profit,${kpis.grossProfit.value},${kpis.grossProfit.prev},${kpis.grossProfit.variance}%\n`;
    csv += `Gross Margin,${kpis.grossMarginPct.value}%,${kpis.grossMarginPct.prev}%,${kpis.grossMarginPct.variance}%\n`;
    csv += `Operating Expenses,${kpis.operatingExpenses.value},${kpis.operatingExpenses.prev},${kpis.operatingExpenses.variance}%\n`;
    csv += `Net Profit,${kpis.netProfit.value},${kpis.netProfit.prev},${kpis.netProfit.variance}%\n`;
    csv += `Net Margin,${kpis.netMarginPct.value}%,${kpis.netMarginPct.prev}%,${kpis.netMarginPct.variance}%\n`;
    csv += `Cash Inflow,${kpis.cashInflow.value},${kpis.cashInflow.prev},${kpis.cashInflow.variance}%\n`;
    csv += `Cash Outflow,${kpis.cashOutflow.value},${kpis.cashOutflow.prev},${kpis.cashOutflow.variance}%\n`;
    csv += `Net Cash Flow,${kpis.netCashFlow.value},${kpis.netCashFlow.prev},${kpis.netCashFlow.variance}%\n\n`;

    csv += "OPERATING EXPENSE CATEGORIES\n";
    csv += "Category,Amount (PKR),Count\n";
    Object.entries(expenseCategories).forEach(([key, cat]: [string, any]) => {
      csv += `"${cat.label}",${cat.amount},${cat.count}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial_insights_${data.period.startDate}_to_${data.period.endDate}.csv`;
    link.click();
  };

  const kpis = data?.kpis;
  const expenseCategories = data?.expenseCategories || {};
  const timeline = data?.timeline || [];
  const arAging = data?.arAging || {};
  const pnlWaterfall = data?.pnlWaterfall || [];
  const topProducts = data?.topProducts || [];

  // Prepare expense pie chart data
  const expensePieData = Object.entries(expenseCategories)
    .map(([key, item]: [string, any]) => ({
      name: item.label,
      value: item.amount,
      count: item.count,
    }))
    .filter((i) => i.value > 0);

  // Prepare AR aging bar chart data
  const arAgingBarData = [
    { name: "0-30 Days (Current)", amount: arAging.days0To30 || 0, fill: "#10b981" },
    { name: "31-60 Days", amount: arAging.days31To60 || 0, fill: "#3b82f6" },
    { name: "61-90 Days", amount: arAging.days61To90 || 0, fill: "#f59e0b" },
    { name: "90+ Days (Overdue)", amount: arAging.days90Plus || 0, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ================= HEADER & FILTER CONTROLS ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Financial Insights & Analytics
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Executive cash flow, P&L dynamics, expense distributions, and period comparisons
              </p>
            </div>
          </div>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Preset Buttons */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
            <button
              onClick={() => applyTimeframe("30d")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === "30d"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => applyTimeframe("this_month")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === "this_month"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => applyTimeframe("quarter")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === "quarter"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Quarter
            </button>
            <button
              onClick={() => applyTimeframe("ytd")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === "ytd"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              YTD
            </button>
            <button
              onClick={() => applyTimeframe("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === "all"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Custom Date Inputs */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setTimeframe("custom");
                setStartDate(e.target.value);
              }}
              className="bg-transparent border-0 text-slate-800 dark:text-slate-200 focus:outline-none text-xs font-semibold cursor-pointer"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setTimeframe("custom");
                setEndDate(e.target.value);
              }}
              className="bg-transparent border-0 text-slate-800 dark:text-slate-200 focus:outline-none text-xs font-semibold cursor-pointer"
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchFinancials(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh Financial Insights"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
          </button>

          {/* Export CSV button */}
          <button
            onClick={exportFinancialsCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow-sm transition-all"
            title="Export CSV Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Print button */}
          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors hidden sm:flex"
            title="Print Summary"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= TOP METRIC COMPARISON CARDS ================= */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        kpis && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Net Revenue Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Net Revenue
                </span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  <AnimatedCounter value={kpis.netRevenue.value} prefix="PKR " />
                </h3>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-bold">
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] ${
                      kpis.netRevenue.variance >= 0
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {kpis.netRevenue.variance >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(kpis.netRevenue.variance)}%
                  </span>
                  <span className="text-slate-400 font-normal">vs prev period</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Gross: {formatCompact(kpis.grossRevenue.value)}</span>
                <span>COGS: {formatCompact(kpis.cogs.value)}</span>
              </div>
            </div>

            {/* 2. Gross Margin & Profit */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Gross Profit
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  <AnimatedCounter value={kpis.grossProfit.value} prefix="PKR " />
                </h3>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs">
                    {kpis.grossMarginPct.value}% Gross Margin
                  </span>
                  <span className="text-slate-400 font-normal">
                    ({kpis.grossMarginPct.variance >= 0 ? "+" : ""}
                    {kpis.grossMarginPct.variance}% pts)
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Prev Profit: {formatCompact(kpis.grossProfit.prev)}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Healthy</span>
              </div>
            </div>

            {/* 3. Operating Expenses (OPEX) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Operating Expenses
                </span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  <AnimatedCounter value={kpis.operatingExpenses.value} prefix="PKR " />
                </h3>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-bold">
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] ${
                      kpis.operatingExpenses.variance <= 0
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {kpis.operatingExpenses.variance >= 0 ? "+" : ""}
                    {kpis.operatingExpenses.variance}%
                  </span>
                  <span className="text-slate-400 font-normal">vs prev period</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Payroll: {formatCompact(expenseCategories.SALARY_PAYROLL?.amount || 0)}</span>
                <span>Fleet: {formatCompact(expenseCategories.FUEL_TRANSPORT?.amount || 0)}</span>
              </div>
            </div>

            {/* 4. Net Profit & Net Margin */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Net Profit (Bottom Line)
                </span>
                <div
                  className={`p-2 rounded-xl ${
                    kpis.netProfit.value >= 0
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                      : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3
                  className={`text-2xl font-black tracking-tight ${
                    kpis.netProfit.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                  }`}
                >
                  <AnimatedCounter value={kpis.netProfit.value} prefix="PKR " />
                </h3>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs">
                    {kpis.netMarginPct.value}% Net Margin
                  </span>
                  <span className="text-slate-400 font-normal">
                    ({kpis.netMarginPct.variance >= 0 ? "+" : ""}
                    {kpis.netMarginPct.variance}% pts)
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Net Cash: {formatCompact(kpis.netCashFlow.value)}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpis.netProfit.value >= 0 ? "Profitable" : "Deficit"}
                </span>
              </div>
            </div>
          </div>
        )
      )}

      {/* ================= SECONDARY LIQUIDITY & AR/AP STATUS STRIP ================= */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-violet-900/10 dark:from-slate-900 dark:to-slate-900 p-4 rounded-2xl border border-blue-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
              ↓
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Cash Collected (Inflow)</p>
              <p className="text-base font-black text-slate-800 dark:text-slate-100">{formatPKR(kpis.cashInflow.value)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-black">
              ↑
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Cash Disbursed (Outflow)</p>
              <p className="text-base font-black text-slate-800 dark:text-slate-100">{formatPKR(kpis.cashOutflow.value)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black">
              ⇄
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Total AR Outstanding</p>
              <p className="text-base font-black text-slate-800 dark:text-slate-100">
                {formatPKR(arAging.totalOutstanding || 0)} ({arAging.invoiceCount} invoices)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW NAVIGATION TABS ================= */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("cashflow")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "cashflow"
              ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Cash Flow & Trajectory</span>
        </button>

        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "expenses"
              ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <PieChartIcon className="w-4 h-4" />
          <span>Expense Categorization</span>
        </button>

        <button
          onClick={() => setActiveTab("pnl")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "pnl"
              ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>P&L Waterfall & Margins</span>
        </button>

        <button
          onClick={() => setActiveTab("ar_aging")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "ar_aging"
              ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>AR Aging & Liquidity</span>
        </button>
      </div>

      {/* ================= TAB 1: CASH FLOW & TRAJECTORY ================= */}
      {activeTab === "cashflow" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Chart: Cash Inflow vs Cash Outflow vs Net Cash */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Cash Inflow vs Outflow Dynamics</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-md font-mono">
                    Live Cash Positions
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tracks actual cash received from client invoice payments against vendor disbursements and salaries
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-300">Inflow (Payments)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-slate-600 dark:text-slate-300">Outflow (Costs)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-600 dark:text-slate-300">Net Flow</span>
                </div>
              </div>
            </div>

            <div className="h-80 w-full">
              {timeline.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                  No cash transaction logs recorded for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="netCashGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatCompact} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                      formatter={(val: any) => [formatPKR(Number(val)), ""]}
                    />
                    <Area
                      type="monotone"
                      dataKey="inflow"
                      name="Cash Inflow"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#inflowGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="outflow"
                      name="Cash Outflow"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#outflowGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="netCashFlow"
                      name="Net Cash Flow"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#netCashGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Secondary Chart: Revenue vs Incurred Expenses Trajectory */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Accrual Revenue vs Total Incurred Costs & Profit Margin
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Measures invoiced revenues against COGS and operating expenses
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatCompact} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                    formatter={(val: any) => [formatPKR(Number(val)), ""]}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Invoiced Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cogs" name="COGS (Materials Cost)" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Operating Expenses" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: EXPENSE CATEGORIZATION ================= */}
      {activeTab === "expenses" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut Chart */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-between">
              <div className="w-full text-left">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Operating Expense Share</h3>
                <p className="text-xs text-slate-400 mt-0.5">Automated expense classification</p>
              </div>

              <div className="w-full h-64 my-4 flex items-center justify-center">
                {expensePieData.length === 0 ? (
                  <div className="text-slate-400 text-xs">No expense entries found</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "12px",
                          fontSize: "12px",
                          color: "#fff",
                        }}
                        formatter={(val: any) => [formatPKR(Number(val)), ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="w-full text-center text-xs font-bold text-slate-500">
                Total Expenses: <span className="text-slate-900 dark:text-white">{formatPKR(kpis?.operatingExpenses?.value || 0)}</span>
              </div>
            </div>

            {/* Expense Breakdown List & Progress */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Expense Breakdown by Category</h3>
              <p className="text-xs text-slate-400 mb-5">Departmental and operational allocations</p>

              <div className="space-y-4">
                {Object.entries(expenseCategories).map(([key, cat]: [string, any], idx) => {
                  const totalExp = kpis?.operatingExpenses?.value || 1;
                  const pct = Math.round((cat.amount / (totalExp || 1)) * 100);
                  const color = PALETTE[idx % PALETTE.length];

                  return (
                    <div key={key} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{cat.label}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {cat.count} txns
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatPKR(cat.amount)}
                          </span>
                          <span className="font-bold text-slate-500 w-10 text-right">{pct}%</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: P&L WATERFALL & PRODUCT MARGINS ================= */}
      {activeTab === "pnl" && (
        <div className="space-y-6 animate-fadeIn">
          {/* P&L Waterfall Chart */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Income Statement (P&L) Waterfall
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual flow from gross sales through deductions, direct cost of goods, and operating expenses
                </p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlWaterfall} margin={{ top: 15, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatCompact} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                    formatter={(val: any) => [formatPKR(Math.abs(Number(val))), "Amount"]}
                  />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {pnlWaterfall.map((entry: any, index: number) => (
                      <Cell key={`pnl-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products Profitability Ranking */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Top Product Margins & Contribution
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Top selling HVAC units, parts, and accessories sorted by gross revenue and margin profitability
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Product / Equipment</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3 text-right">Units Sold</th>
                    <th className="pb-3 text-right">Total Revenue</th>
                    <th className="pb-3 text-right">Total Cost</th>
                    <th className="pb-3 text-right">Gross Profit</th>
                    <th className="pb-3 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                  {topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No product sales recorded in this timeframe
                      </td>
                    </tr>
                  ) : (
                    topProducts.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 font-bold text-slate-900 dark:text-white">
                          <div>{p.name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                        </td>
                        <td className="py-3 text-slate-500">{p.category}</td>
                        <td className="py-3 text-right font-mono">{p.unitsSold}</td>
                        <td className="py-3 text-right font-mono text-slate-900 dark:text-white">{formatPKR(p.totalRevenue)}</td>
                        <td className="py-3 text-right font-mono text-slate-500">{formatPKR(p.totalCost)}</td>
                        <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {formatPKR(p.profit)}
                        </td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            {p.marginPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: AR AGING & LIQUIDITY ================= */}
      {activeTab === "ar_aging" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AR Aging Bar Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Accounts Receivable (AR) Aging Brackets
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Outstanding client balances classified by age since invoice issue date
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={arAgingBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatCompact} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                      formatter={(val: any) => [formatPKR(Number(val)), "Balance"]}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {arAgingBarData.map((entry, index) => (
                        <Cell key={`ar-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AR Summary & Action Card */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">AR Health & Liquidity</h3>
                <p className="text-xs text-slate-400 mb-5">Credit exposure and collection velocity</p>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Unpaid Balance</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">
                      {formatPKR(arAging.totalOutstanding || 0)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/40">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                      Current (0-30 Days)
                    </span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                      {formatPKR(arAging.days0To30 || 0)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/40">
                    <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">
                      Overdue (&gt;90 Days)
                    </span>
                    <span className="text-sm font-black text-rose-700 dark:text-rose-300">
                      {formatPKR(arAging.days90Plus || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => router.push("/sales?tab=invoices")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  <span>Review Invoices & Send Reminders</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinancialsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 font-sans">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading Financial Analytics...
        </div>
      }
    >
      <FinancialsPageContent />
    </React.Suspense>
  );
}
