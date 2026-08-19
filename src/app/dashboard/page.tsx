"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ClipboardList,
  Clock,
  Wallet,
  Activity,
  ArrowRight,
  ChevronRight,
  User,
  Wrench,
  CheckCircle2,
  Plus,
  Receipt,
  FileSpreadsheet,
  Truck,
  Store,
  Zap,
  Sparkles,
  Bot,
  Box,
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
  BookOpen,
  PackagePlus,
  Sliders,
  Mail,
  RefreshCw,
  TrendingDown,
  Bell,
  CreditCard,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import AnimatedCounter from "@/components/shared/AnimatedCounter";
import { SkeletonCard } from "@/components/shared/SkeletonTable";
import { useToast } from "@/components/shared/ToastProvider";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("7d");

  const fetchDashboardData = async (isManual = false) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      if (isManual) setRefreshing(true);
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) throw new Error("Me failed");
      const meData = await meRes.json();
      setSession(meData.user);

      const res = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Dashboard API failed");
      const stats = await res.json();
      setData(stats);

      if (isManual) {
        toast({
          title: "Dashboard Refreshed",
          message: "Real-time metrics and ledger balances synchronized.",
          type: "success",
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard data", err);
      if (isManual) {
        toast({
          title: "Refresh Failed",
          message: "Unable to contact server. Please verify your connection.",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const role = session?.role?.name || "";
  const summary = data?.summary || {};
  const charts = data?.charts || {};

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  // Comprehensive 8 Quick Action Items (Clean, Light, Fast)
  const QUICK_ACTIONS = [
    {
      label: "New Invoice",
      desc: "Client Billing",
      icon: FileSpreadsheet,
      color: "bg-blue-50/90 hover:bg-blue-100/90 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/60 shadow-xs",
      onClick: () => router.push("/sales?tab=invoices"),
    },
    {
      label: "Delivery Order",
      desc: "Dispatch Stock",
      icon: Receipt,
      color: "bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60 shadow-xs",
      onClick: () => router.push("/sales?tab=dos"),
    },
    {
      label: "Log Complaint",
      desc: "Service Request",
      icon: Wrench,
      color: "bg-rose-50/90 hover:bg-rose-100/90 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60 shadow-xs",
      onClick: () => router.push("/support"),
    },
    {
      label: "Purchase Order",
      desc: "Supplier PO",
      icon: Truck,
      color: "bg-indigo-50/90 hover:bg-indigo-100/90 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/60 shadow-xs",
      onClick: () => router.push("/procurement?tab=pos"),
    },
    {
      label: "Add Vendor",
      desc: "Parts Supplier",
      icon: Store,
      color: "bg-amber-50/90 hover:bg-amber-100/90 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60 shadow-xs",
      onClick: () => router.push("/procurement?tab=vendors"),
    },
    {
      label: "Catalog Item",
      desc: "Add Inventory",
      icon: Box,
      color: "bg-cyan-50/90 hover:bg-cyan-100/90 text-cyan-700 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 dark:text-cyan-300 border-cyan-200/70 dark:border-cyan-800/60 shadow-xs",
      onClick: () => router.push("/inventory"),
    },
    {
      label: "General Ledger",
      desc: "Financial Audit",
      icon: BookOpen,
      color: "bg-purple-50/90 hover:bg-purple-100/90 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 dark:text-purple-300 border-purple-200/70 dark:border-purple-800/60 shadow-xs",
      onClick: () => router.push("/reports?type=ledger"),
    },
    {
      label: "Record Dr / Cr",
      desc: "Post Debit / Credit",
      icon: CreditCard,
      color: "bg-violet-50/90 hover:bg-violet-100/90 text-violet-700 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 dark:text-violet-300 border-violet-200/70 dark:border-violet-800/60 shadow-xs",
      onClick: () => router.push("/financials?tab=record"),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ================= BENTO ROW 1: LIGHT HERO & QUICK ACTIONS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LIGHT ELEGANT EXECUTIVE HERO (Span 8) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between relative overflow-hidden space-y-4 hover:shadow-md transition-all duration-300">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>TCE Executive Command Center</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                title="Refresh Live Metrics"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
              </button>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1 rounded-full border border-slate-200/60 dark:border-slate-700/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Ledger Synced</span>
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {greeting}, {session?.name || "System Admin"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Technicool Engineering Enterprise Operations • Monitor real-time cash flow, inventory dispatches, and active service queues.
            </p>
          </div>

          {/* Quick status metrics pill strip */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                Today: <strong className="font-mono font-bold text-emerald-600 dark:text-emerald-400"><AnimatedCounter value={Number(summary.totalSalesToday ?? 0)} prefix="PKR " /></strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                Complaints: <strong className="font-mono font-bold text-rose-600 dark:text-rose-400"><AnimatedCounter value={summary.openComplaintsCount ?? 0} /> Open</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                Stock Alerts: <strong className="font-mono font-bold text-amber-500"><AnimatedCounter value={summary.lowStockCount ?? 0} /> SKUs</strong>
              </span>
            </div>

            <button
              onClick={() => router.push("/copilot")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>Ask AI Copilot</span>
            </button>
          </div>
        </div>

        {/* QUICK ACTIONS BENTO HUB (Span 4) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-3 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Quick Actions
              </h2>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fast Access</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all active:scale-95 text-left cursor-pointer ${action.color}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{action.label}</p>
                    <p className="truncate text-[10px] font-normal opacity-70">{action.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= BENTO ROW 2: 4 CORE LIVE KPI TILES ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Monthly Sales Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between space-y-3 hover:border-emerald-500/40 hover:shadow-md transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Sales Revenue</span>
              <span className="text-2xl font-black font-mono block mt-1.5 text-slate-900 dark:text-white">
                <AnimatedCounter value={Number(summary.totalSalesMonth ?? 0)} prefix="PKR " />
              </span>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs text-slate-500">
            <span>Today's Billing</span>
            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={Number(summary.totalSalesToday ?? 0)} prefix="PKR " />
            </span>
          </div>
        </div>

        {/* KPI 2: Accounts Receivable */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between space-y-3 hover:border-blue-500/40 hover:shadow-md transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accounts Receivable</span>
              <span className="text-2xl font-black font-mono block mt-1.5 text-slate-900 dark:text-white">
                <AnimatedCounter value={Number(summary.outstandingAR ?? 0)} prefix="PKR " />
              </span>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs text-slate-500">
            <span>Unpaid Collections</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">Active Invoices</span>
          </div>
        </div>

        {/* KPI 3: General Ledger Cash */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between space-y-3 hover:border-indigo-500/40 hover:shadow-md transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">General Ledger Liquid Cash</span>
              <span className={`text-2xl font-black font-mono block mt-1.5 ${Number(summary.cashBalance ?? 0) < 0 ? "text-rose-600" : "text-indigo-600 dark:text-indigo-400"}`}>
                <AnimatedCounter value={Number(summary.cashBalance ?? 0)} prefix="PKR " />
              </span>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs text-slate-500">
            <span>Bank & Cash Holdings</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Audited Balance</span>
          </div>
        </div>

        {/* KPI 4: Active Complaints & Operations */}
        <div
          onClick={() => router.push("/support")}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between space-y-3 hover:border-rose-500/40 hover:shadow-md transition-all duration-300 cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Service Tickets</span>
              <span className="text-2xl font-black font-mono block mt-1.5 text-rose-600 dark:text-rose-400">
                <AnimatedCounter value={summary.openComplaintsCount ?? 0} suffix=" Tickets" />
              </span>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl group-hover:scale-110 transition-transform">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs text-slate-500">
            <span>Pending PO Items</span>
            <span className="font-bold font-mono text-rose-500">
              <AnimatedCounter value={summary.pendingPOItemsCount ?? 0} /> Shortfall(s)
            </span>
          </div>
        </div>
      </div>

      {/* ================= BENTO ROW 3: REVENUE TREND & SUPPLIER SPEND ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sales Revenue Trend Chart (Span 8) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-3xl shadow-sm space-y-4 hover:shadow-md transition-all duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Commercial Revenue Trajectory</h2>
              <p className="text-xs text-slate-500">Weekly billing performance and customer invoice totals</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setTimeRange("7d")}
                className={`px-3 py-1 rounded-lg transition-all ${timeRange === "7d" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange("30d")}
                className={`px-3 py-1 rounded-lg transition-all ${timeRange === "30d" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
              >
                30 Days
              </button>
            </div>
          </div>

          <div className="h-72 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.salesTrend}>
                <defs>
                  <linearGradient id="bentoSalesGradientLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderRadius: "16px",
                    border: "1px solid #1e293b",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#bentoSalesGradientLight)"
                  isAnimationActive={true}
                  animationDuration={1400}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vendor Procurement Spend Distribution (Span 4) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Supplier Purchase Spend</h2>
            <p className="text-xs text-slate-500">Procurement spend distribution across parts suppliers</p>
          </div>

          <div className="h-64 flex flex-col justify-center items-center">
            {charts.vendorSpend && charts.vendorSpend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.vendorSpend}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={1400}
                    animationEasing="ease-out"
                  >
                    {charts.vendorSpend.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "12px",
                      border: "none",
                      color: "#ffffff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 py-12 text-xs">No vendor purchase bills recorded yet.</div>
            )}
          </div>

          <button
            onClick={() => router.push("/procurement?tab=vendors")}
            className="w-full text-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline pt-2 border-t border-slate-100 dark:border-slate-800"
          >
            Manage Suppliers & Vendors →
          </button>
        </div>
      </div>

      {/* ================= BENTO ROW 4: 3-COLUMN OPERATIONAL BENTO ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Top Selling Products (Span 1) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Top Selling Items</h2>
              <p className="text-[11px] text-slate-500">Highest volume HVAC parts dispatched</p>
            </div>
            <button
              onClick={() => router.push("/inventory")}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              Stock <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 flex flex-col justify-center">
            {charts.topProducts && charts.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis dataKey="sku" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="quantity"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1400}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 py-12 text-xs">No catalog product sales logged yet.</div>
            )}
          </div>
        </div>

        {/* Technician Active Workload (Span 1) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Technician Queue</h2>
              <p className="text-[11px] text-slate-500">Active tickets per HVAC technician</p>
            </div>
            <button
              onClick={() => router.push("/support?tab=technicians")}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              Technicians <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 flex flex-col justify-center">
            {charts.techWorkload && charts.techWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.techWorkload} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={75} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="complaints"
                    fill="#8b5cf6"
                    radius={[0, 6, 6, 0]}
                    isAnimationActive={true}
                    animationDuration={1400}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 py-12 text-xs">No active service dispatches.</div>
            )}
          </div>
        </div>

        {/* Quick Intelligence & Reports (Span 1) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Business Intelligence</h2>
            <p className="text-[11px] text-slate-500">Automated reports, audits, and custom analytics</p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => router.push("/reports/schedules")}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100/70 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 transition-all text-xs font-bold cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Scheduled PDF Reports</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => router.push("/reports/builder")}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 hover:bg-purple-100/70 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/50 transition-all text-xs font-bold cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>Custom Report Builder</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => router.push("/audit")}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-all text-xs font-bold cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>System Audit Trail</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          </div>

          <div className="pt-2 text-center">
            <span className="text-[10px] text-slate-400 font-semibold">TCE ERP v2.4 Enterprise System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
