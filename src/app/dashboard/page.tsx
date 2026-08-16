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

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  // Load session and fetch stats
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        // Fetch current user details
        const meRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) throw new Error("Me failed");
        const meData = await meRes.json();
        setSession(meData.user);

        // Fetch dashboard statistics
        const res = await fetch("/api/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Dashboard API failed");
        const stats = await res.json();
        setData(stats);
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

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

  // ==================== 1. TECHNICIAN DASHBOARD ====================
  if (role === "Technician") {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="text-2xl font-bold">{greeting}, {session?.name}</h2>
          <p className="text-blue-100 mt-1">Role: Senior HVAC Technician</p>
          <p className="text-xs text-blue-200 mt-4">
            You are logged into the service dispatcher queue. Below is your active complaint schedule.
          </p>
        </div>

        {/* Quick Tech stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Pending Assigned</p>
              <h3 className="text-2xl font-black mt-0.5">
                <AnimatedCounter value={summary.techPendingComplaintsCount ?? 0} />
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Resolved by You</p>
              <h3 className="text-2xl font-black mt-0.5">
                <AnimatedCounter value={summary.techResolvedComplaintsCount ?? 0} />
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Open Dispatches</p>
              <button
                onClick={() => router.push("/support")}
                className="text-xs text-blue-500 hover:underline font-bold mt-1 flex items-center gap-1"
              >
                Go to Ticket Board <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Assigned list call to action */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base">Your Active Service Queue</h3>
            <button onClick={() => router.push("/support")} className="text-xs text-blue-500 hover:underline font-bold">
              View All Queue
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Open the Support Tickets tab to inspect work order scopes, customer addresses, remarks log, and change ticket statuses as you resolve issues.
          </p>
        </div>
      </div>
    );
  }

  // ==================== 2. INVESTOR DASHBOARD ====================
  if (role === "Investor") {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black tracking-tight">{greeting}, {session?.name}</h2>
          <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold capitalize">
            {role} (Read-Only)
          </span>
        </div>

        {/* Financial KPI metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Monthly Billing Sales</p>
              <h3 className="text-2xl font-black mt-0.5">
                <AnimatedCounter value={Number(summary.totalSalesMonth ?? 0)} prefix="PKR " />
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Accounts Receivable</p>
              <h3 className="text-2xl font-black mt-0.5">
                <AnimatedCounter value={Number(summary.outstandingAR ?? 0)} prefix="PKR " />
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Cash Balance</p>
              <h3 className="text-2xl font-black mt-0.5">
                <AnimatedCounter value={Number(summary.cashBalance ?? 0)} prefix="PKR " />
              </h3>
            </div>
          </div>
        </div>

        {/* Financial Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase">Weekly Billing Sales Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.salesTrend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spend by Vendor */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase">Spend Distribution by Vendor</h3>
            <div className="h-80 flex flex-col justify-center">
              {charts.vendorSpend && charts.vendorSpend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.vendorSpend}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {charts.vendorSpend.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400 py-20 text-xs">No vendor purchase spend logged yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 3. FULL ADMIN / STANDARD DASHBOARD ====================
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{greeting}, {session?.name || "Administrator"}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time HVAC operational pulse & general ledger overview
          </p>
        </div>
        <span className="self-start px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold capitalize">
          Role: {role}
        </span>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Month Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sales Revenue (Month)</span>
              <span className="text-xl font-extrabold font-mono block mt-2 text-slate-900 dark:text-slate-100">
                <AnimatedCounter value={Number(summary.totalSalesMonth ?? 0)} prefix="PKR " />
              </span>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
            <span>Today's sales:</span>
            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={Number(summary.totalSalesToday ?? 0)} prefix="PKR " />
            </span>
          </div>
        </div>

        {/* Outstanding AR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accounts Receivable (AR)</span>
              <span className="text-xl font-extrabold font-mono block mt-2 text-slate-900 dark:text-slate-100">
                <AnimatedCounter value={Number(summary.outstandingAR ?? 0)} prefix="PKR " />
              </span>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
            <span>Outstanding Collections</span>
            <span className="font-bold text-blue-500">Active invoices</span>
          </div>
        </div>

        {/* Treasury cash & low stock count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">General Ledger Cash</span>
              <span className={`text-xl font-extrabold font-mono block mt-2 ${Number(summary.cashBalance ?? 0) < 0 ? "text-rose-500" : "text-indigo-600 dark:text-indigo-400"}`}>
                <AnimatedCounter value={Number(summary.cashBalance ?? 0)} prefix="PKR " />
              </span>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
            <span>Bank Cash Balance</span>
            <span className={`font-bold font-mono ${Number(summary.cashBalance ?? 0) < 0 ? "text-rose-500" : "text-indigo-600 dark:text-indigo-400"}`}>Current Liquid</span>
          </div>
        </div>

        {/* Operations (Complaints & Shortages) */}
        <div
          onClick={() => router.push("/support")}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-500/30 transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operations & Tickets</span>
              <span className="text-xl font-extrabold font-mono block mt-2 text-rose-500">
                <AnimatedCounter value={summary.openComplaintsCount ?? 0} suffix=" open tickets" />
              </span>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-xl">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              Low Stock: <strong className="text-amber-500"><AnimatedCounter value={summary.lowStockCount ?? 0} /></strong>
            </span>
            <span className="flex items-center gap-1">
              Shortfalls: <strong className="text-rose-500"><AnimatedCounter value={summary.pendingPOItemsCount ?? 0} /></strong>
            </span>
          </div>
        </div>
      </div>

      {/* Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase">Weekly Billing Sales Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.salesTrend}>
                <defs>
                  <linearGradient id="colorSalesFull" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSalesFull)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase">Top Selling Products</h3>
          <div className="h-80 flex flex-col justify-center">
            {charts.topProducts && charts.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis dataKey="sku" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 py-20 text-xs">No catalog product sales logged yet.</div>
            )}
          </div>
        </div>

        {/* Spend by Vendor */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase">Supplier Purchase Spend</h3>
          <div className="h-80 flex flex-col justify-center">
            {charts.vendorSpend && charts.vendorSpend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.vendorSpend}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {charts.vendorSpend.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 py-20 text-xs">No vendor purchase bills recorded.</div>
            )}
          </div>
        </div>

        {/* Tech Workload */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase">Technician Workload (Complaints)</h3>
          <div className="h-80 flex flex-col justify-center">
            {charts.techWorkload && charts.techWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.techWorkload} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                  <Tooltip />
                  <Bar dataKey="complaints" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 py-20 text-xs">No active service dispatches.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
