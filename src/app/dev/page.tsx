"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Terminal,
  Activity,
  Cpu,
  Database,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Trash2,
  Send,
  Layers,
  Wrench,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Clock,
  HardDrive,
  FileCode,
  FileText,
  Mail,
  Zap,
  Lock,
  ArrowRight,
  Info,
  Server,
  Play,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastProvider";

export default function DeveloperConsolePage() {
  const router = useRouter();
  const { toast } = useToast();

  const showToast = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => {
    toast({ title, message, type });
  };

  // Auth / Clearance State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"telemetry" | "logs" | "diagnostics" | "maintenance" | "environment">("telemetry");

  // Telemetry State
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logSource, setLogSource] = useState<"RUNTIME" | "LOGIN" | "AUDIT">("RUNTIME");
  const [logLevel, setLogLevel] = useState("ALL");
  const [logModule, setLogModule] = useState("ALL");
  const [logSearch, setLogSearch] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<any | null>(null);
  const [copiedTrace, setCopiedTrace] = useState(false);

  // Diagnostics State
  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  // Maintenance State
  const [maintenanceRunning, setMaintenanceRunning] = useState(false);
  const [stockResult, setStockResult] = useState<any | null>(null);
  const [tbResult, setTbResult] = useState<any | null>(null);
  const [orphanResult, setOrphanResult] = useState<any | null>(null);
  const [voucherQuery, setVoucherQuery] = useState("");
  const [voucherResult, setVoucherResult] = useState<any | null>(null);

  // Email Dispatcher State
  const [testEmailTo, setTestEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ success?: boolean; text?: string } | null>(null);

  // 1. Check Developer Clearance on Mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject("Unauthorized")))
      .then((data) => {
        const user = data.user;
        setCurrentUser(user);
        const email = (user?.email || "").toLowerCase().trim();
        const isDev = Boolean(
          user?.isDeveloper ||
          email === "muhammad.murtaazaa@gmail.com"
        );

        if (!isDev) {
          setAuthorized(false);
        } else {
          setAuthorized(true);
        }
      })
      .catch(() => {
        setAuthorized(false);
      });
  }, [router]);

  // 2. Fetch Telemetry
  const fetchTelemetry = async () => {
    const token = localStorage.getItem("token");
    setLoadingTelemetry(true);
    try {
      const res = await fetch("/api/dev/health", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTelemetry(data);
      } else {
        showToast("error", "Telemetry Error", data.error || "Failed to load telemetry");
      }
    } catch (err: any) {
      showToast("error", "Connection Error", err.message || "Failed to connect to health API");
    } finally {
      setLoadingTelemetry(false);
    }
  };

  // 3. Fetch Logs
  const fetchLogs = async () => {
    const token = localStorage.getItem("token");
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        source: logSource,
        level: logLevel,
        module: logModule,
        search: logSearch,
        limit: "100",
      });
      const res = await fetch(`/api/dev/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setTotalLogs(data.total || 0);
      } else {
        showToast("error", "Logs Error", data.error || "Failed to query logs");
      }
    } catch (err: any) {
      showToast("error", "Query Error", err.message || "Logs query error");
    } finally {
      setLoadingLogs(false);
    }
  };

  // 4. Run Diagnostics
  const runDiagnostics = async () => {
    const token = localStorage.getItem("token");
    setRunningDiagnostics(true);
    try {
      const res = await fetch("/api/dev/diagnostics", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDiagnostics(data);
        if (data.overallStatus === "PASSED") {
          showToast("success", "Diagnostics Passed", "All 6 diagnostics passed successfully!");
        } else if (data.overallStatus === "WARNING") {
          showToast("info", "Diagnostics Warning", "Diagnostics completed with warnings.");
        } else {
          showToast("error", "Diagnostics Failed", "Diagnostics detected system anomalies!");
        }
      } else {
        showToast("error", "Execution Error", data.error || "Diagnostics failed to run");
      }
    } catch (err: any) {
      showToast("error", "Execution Failed", err.message || "Diagnostics execution failed");
    } finally {
      setRunningDiagnostics(false);
    }
  };

  // 5. Run Maintenance Task
  const executeMaintenance = async (task: string, payload: any = {}) => {
    const token = localStorage.getItem("token");
    setMaintenanceRunning(true);
    try {
      const res = await fetch("/api/dev/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ task, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        if (task === "stock_recalculate") setStockResult(data);
        if (task === "trial_balance_scan") setTbResult(data);
        if (task === "orphan_detect") setOrphanResult(data);
        if (task === "voucher_inspect") setVoucherResult(data);
        showToast("success", "Maintenance Task Complete", data.message || `Task ${task} completed successfully`);
      } else {
        showToast("error", "Task Failed", data.error || "Maintenance task failed");
      }
    } catch (err: any) {
      showToast("error", "Error", err.message || "Execution failed");
    } finally {
      setMaintenanceRunning(false);
    }
  };

  // 6. Test Email Dispatch
  const handleSendTestEmail = async () => {
    if (!testEmailTo.trim()) {
      showToast("error", "Validation Error", "Please provide a valid recipient email");
      return;
    }
    const token = localStorage.getItem("token");
    setSendingEmail(true);
    setEmailStatusMsg(null);
    try {
      const res = await fetch("/api/system/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: testEmailTo.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatusMsg({ success: true, text: data.message || "Test email dispatched successfully!" });
        showToast("success", "Email Dispatched", "Test email sent successfully!");
      } else {
        setEmailStatusMsg({ success: false, text: data.error || "Email delivery failed" });
        showToast("error", "Delivery Failed", data.error || "Failed to dispatch email");
      }
    } catch (err: any) {
      setEmailStatusMsg({ success: false, text: err.message || "SMTP error" });
    } finally {
      setSendingEmail(false);
    }
  };

  // Flush Logs
  const handleFlushLogs = async () => {
    if (!confirm("Flush all developer in-memory runtime logs?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/dev/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "clear" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Logs Flushed", "Developer runtime logs flushed successfully");
        fetchLogs();
      }
    } catch (err) {
      showToast("error", "Error", "Failed to flush logs");
    }
  };

  // Trigger Test Log
  const handleTriggerTestLog = async () => {
    const token = localStorage.getItem("token");
    try {
      await fetch("/api/dev/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "test_log",
          level: "INFO",
          module: "CORE",
          message: `Canary ping test generated at ${new Date().toLocaleTimeString()}`,
        }),
      });
      showToast("success", "Emitted", "Canary test log emitted");
      fetchLogs();
    } catch (err) {
      showToast("error", "Error", "Failed to trigger test log");
    }
  };

  // Load telemetry and logs on authorized
  useEffect(() => {
    if (authorized) {
      fetchTelemetry();
    }
  }, [authorized]);

  useEffect(() => {
    if (authorized && activeTab === "logs") {
      fetchLogs();
    }
  }, [authorized, activeTab, logSource, logLevel, logModule]);

  // Loading Screen while verifying developer clearance
  if (authorized === null) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400">
          Authenticating Developer Clearance...
        </p>
      </div>
    );
  }

  // Access Denied Screen (if unauthorized user tries to access /dev)
  if (authorized === false) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-8 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 rounded-2xl flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Developer Access Restricted</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              The Developer & Maintenance Control Panel (<code className="text-rose-500 font-mono">/dev</code>) is strictly reserved for the verified system engineering team. Your current account does not have developer privileges.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Developer & Maintenance Console
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  /dev
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Dev Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                System telemetry, automated diagnostic test suite, live logs, and database maintenance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              fetchTelemetry();
              if (activeTab === "logs") fetchLogs();
            }}
            disabled={loadingTelemetry}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTelemetry ? "animate-spin text-indigo-500" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={runDiagnostics}
            disabled={runningDiagnostics}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${runningDiagnostics ? "animate-spin" : ""}`} />
            <span>{runningDiagnostics ? "Running Suite..." : "Run Diagnostics"}</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200/60 dark:border-slate-800/60">
        {[
          { id: "telemetry", label: "Telemetry & Health", icon: Activity },
          { id: "logs", label: "Logs & Tracing", icon: FileCode },
          { id: "diagnostics", label: "Diagnostics & E2E Tests", icon: ShieldCheck },
          { id: "maintenance", label: "Maintenance & Quick-Fix", icon: Wrench },
          { id: "environment", label: "Settings & Email Dispatch", icon: Mail },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TELEMETRY & HEALTH                                                 */}
      {/* ========================================================================= */}
      {activeTab === "telemetry" && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Database Latency */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Database Latency</span>
                <Database className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {telemetry?.database?.latencyMs !== undefined ? `${telemetry.database.latencyMs} ms` : "--"}
                </span>
                <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  {telemetry?.database?.status || "OK"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                PostgreSQL • {telemetry?.database?.version || "ACID Compliant"}
              </p>
            </div>

            {/* Server Uptime */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Node.js Uptime</span>
                <Clock className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {telemetry?.runtime?.uptimeFormatted || "--"}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Node {telemetry?.runtime?.nodeVersion} • {telemetry?.runtime?.platform} ({telemetry?.runtime?.arch})
              </p>
            </div>

            {/* Memory RSS */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Process Memory (RSS)</span>
                <Cpu className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {telemetry?.runtime?.memory?.rssMb !== undefined ? `${telemetry.runtime.memory.rssMb} MB` : "--"}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Heap Used: {telemetry?.runtime?.memory?.heapUsedMb || 0} MB / {telemetry?.runtime?.memory?.heapTotalMb || 0} MB
              </p>
            </div>

            {/* Environment Mode */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Environment</span>
                <Server className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black uppercase text-slate-900 dark:text-white">
                {telemetry?.environment?.nodeEnv || "development"}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                DB URL: {telemetry?.environment?.hasDbUrl ? "Connected" : "Unset"} • JWT: {telemetry?.environment?.hasJwtSecret ? "Secured" : "Unset"}
              </p>
            </div>
          </div>

          {/* Database Live Row Counts Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-500" />
                  <span>Live Database Row Counter</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time record counts across core relational models
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Timestamp: {telemetry?.timestamp ? new Date(telemetry.timestamp).toLocaleTimeString() : "--"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: "Journal Lines", key: "journalLines", color: "indigo" },
                { label: "Journal Entries", key: "journalEntries", color: "indigo" },
                { label: "Ledger Entries", key: "ledgerEntries", color: "indigo" },
                { label: "Accounts", key: "accounts", color: "indigo" },
                { label: "Invoices", key: "invoices", color: "emerald" },
                { label: "Quotations", key: "quotations", color: "emerald" },
                { label: "Delivery Orders", key: "deliveryOrders", color: "emerald" },
                { label: "Purchase Orders", key: "purchaseOrders", color: "amber" },
                { label: "GRN Receipts", key: "grns", color: "amber" },
                { label: "Products", key: "products", color: "blue" },
                { label: "Customers", key: "customers", color: "blue" },
                { label: "Vendors", key: "vendors", color: "blue" },
                { label: "Employees", key: "employees", color: "purple" },
                { label: "Complaints", key: "complaints", color: "rose" },
                { label: "Audit Snapshots", key: "auditSnapshots", color: "slate" },
                { label: "Audit Logs", key: "auditLogs", color: "slate" },
                { label: "Users", key: "users", color: "slate" },
                { label: "Login Logs", key: "loginLogs", color: "slate" },
              ].map((item) => {
                const count = telemetry?.counts?.[item.key];
                return (
                  <div
                    key={item.key}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-1"
                  >
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                      {item.label}
                    </span>
                    <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                      {count !== undefined && count >= 0 ? count.toLocaleString() : "--"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LOGS & TRACING                                                     */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Source Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              {[
                { id: "RUNTIME", label: "Runtime Traces" },
                { id: "LOGIN", label: "Login Activity" },
                { id: "AUDIT", label: "Audit Snapshots" },
              ].map((src) => (
                <button
                  key={src.id}
                  onClick={() => setLogSource(src.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    logSource === src.id
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>

            {/* Level & Module Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold"
              >
                <option value="ALL">All Levels</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>

              <select
                value={logModule}
                onChange={(e) => setLogModule(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold"
              >
                <option value="ALL">All Modules</option>
                <option value="CORE">CORE</option>
                <option value="FINANCE">FINANCE</option>
                <option value="SALES">SALES</option>
                <option value="INVENTORY">INVENTORY</option>
                <option value="AUTH">AUTH</option>
                <option value="HRM">HRM</option>
                <option value="SUPPORT">SUPPORT</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                  className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 w-44"
                />
              </div>

              {logSource === "RUNTIME" && (
                <>
                  <button
                    onClick={handleTriggerTestLog}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                  >
                    + Test Log
                  </button>
                  <button
                    onClick={handleFlushLogs}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Flush runtime logs"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Showing {logs.length} of {totalLogs} events</span>
              <span>Buffer Limit: 500</span>
            </div>

            {loadingLogs ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-slate-400">Loading structured log stream...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No logs matching the current filter criteria.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
                {logs.map((log) => {
                  const isError = log.level === "ERROR" || log.level === "FATAL";
                  const isWarn = log.level === "WARN";

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 ${
                            isError
                              ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                              : isWarn
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                              : "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                          }`}
                        >
                          {log.level}
                        </span>

                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {log.module}
                        </span>

                        <span className="text-slate-800 dark:text-slate-200 font-sans text-xs truncate">
                          {log.message}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        {(log.stack || log.metadata) && (
                          <button
                            onClick={() => setSelectedTrace(log)}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-sans font-bold"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIAGNOSTICS & TESTS                                                */}
      {/* ========================================================================= */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          {/* Header Action Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                Automated Verification Suite
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Live End-to-End System Diagnostics
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                Executes 6 real-time health and integrity checks: Financial Double-Entry Equilibrium, Inventory Non-Negativity, Control Account Balances, RBAC Token Validation, ACID Rollback Isolation, and Audit Ledger Snapshots.
              </p>
            </div>

            <button
              onClick={runDiagnostics}
              disabled={runningDiagnostics}
              className="px-6 py-3 rounded-2xl bg-white text-indigo-900 hover:bg-slate-100 font-black text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 shadow-lg shadow-black/30 transition-all"
            >
              <Play className={`w-4 h-4 ${runningDiagnostics ? "animate-spin text-indigo-600" : ""}`} />
              <span>{runningDiagnostics ? "Evaluating Engine..." : "Run Full Suite"}</span>
            </button>
          </div>

          {/* Test Results Display */}
          {diagnostics && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Suite Verdict:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      diagnostics.overallStatus === "PASSED"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300"
                        : diagnostics.overallStatus === "WARNING"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-300"
                    }`}
                  >
                    {diagnostics.overallStatus}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Executed at {new Date(diagnostics.executedAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diagnostics.results.map((r: any) => {
                  const isPass = r.status === "PASSED";
                  const isWarn = r.status === "WARNING";

                  return (
                    <div
                      key={r.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                            {r.category}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                            {r.name}
                          </h4>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                            isPass
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                              : isWarn
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {r.summary}
                      </p>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Latency: {r.durationMs} ms</span>
                        {r.details && (
                          <span className="font-mono text-[10px]">
                            {JSON.stringify(r.details).slice(0, 45)}...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MAINTENANCE & QUICK-FIX                                            */}
      {/* ========================================================================= */}
      {activeTab === "maintenance" && (
        <div className="space-y-6">
          {/* Maintenance Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tool 1: Stock Recalculator */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Stock Balance Recalculator
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recomputes on-hand quantities against GRNs, dispatches & returns
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                Audits all products where actual physical ledger movements (GRNs received vs Delivery Orders dispatched) deviate from stored inventory on-hand balances.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => executeMaintenance("stock_recalculate", { mode: "dry_run" })}
                  disabled={maintenanceRunning}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all"
                >
                  Run Dry-Run Scan
                </button>
                <button
                  onClick={() => {
                    if (confirm("Apply stock rebalancing across all products with deviations?")) {
                      executeMaintenance("stock_recalculate", { mode: "apply" });
                    }
                  }}
                  disabled={maintenanceRunning}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                >
                  Apply Fix (Rebalance)
                </button>
              </div>

              {stockResult && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {stockResult.message}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Scanned {stockResult.totalProductsScanned} products • Found {stockResult.discrepanciesFound} deviations
                  </div>
                </div>
              )}
            </div>

            {/* Tool 2: Trial Balance Deep Scan */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Trial Balance Deep Inspector
                  </h3>
                  <p className="text-xs text-slate-500">
                    Discovers unbalanced journal vouchers or line imbalances
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                Iterates every recorded journal entry to confirm mathematical parity between line debits and credits.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => executeMaintenance("trial_balance_scan")}
                  disabled={maintenanceRunning}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                >
                  Scan All Journal Entries
                </button>
              </div>

              {tbResult && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className={`font-bold ${tbResult.isBalanced ? "text-emerald-600" : "text-rose-600"}`}>
                    {tbResult.isBalanced ? "✓ All Journal Entries Perfectly Balanced" : `⚠ ${tbResult.unbalancedCount} Unbalanced Entries Found!`}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Scanned {tbResult.totalEntriesScanned} entries ({tbResult.totalLinesScanned} lines) • Total: PKR {tbResult.totalDebit.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Tool 3: Orphan Records Detector */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Orphan Record Detector
                  </h3>
                  <p className="text-xs text-slate-500">
                    Identifies dangling records with broken foreign keys
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                Checks for dangling invoice line items, unlinked payments, orphan purchase order items, and complaint timeline events.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => executeMaintenance("orphan_detect")}
                  disabled={maintenanceRunning}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
                >
                  Check Broken References
                </button>
              </div>

              {orphanResult && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className={`font-bold ${orphanResult.totalOrphans === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                    {orphanResult.totalOrphans === 0 ? "✓ Zero Orphan Records Detected" : `Found ${orphanResult.totalOrphans} Orphan Records`}
                  </div>
                </div>
              )}
            </div>

            {/* Tool 4: Voucher Deep Search */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Voucher Deep Inspector
                  </h3>
                  <p className="text-xs text-slate-500">
                    Inspect linked ledger and journal lines for any voucher
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. CPV-2026-001 or JV-..."
                  value={voucherQuery}
                  onChange={(e) => setVoucherQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeMaintenance("voucher_inspect", { voucherNumber: voucherQuery })}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <button
                  onClick={() => executeMaintenance("voucher_inspect", { voucherNumber: voucherQuery })}
                  disabled={maintenanceRunning || !voucherQuery.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all"
                >
                  Inspect
                </button>
              </div>

              {voucherResult && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Voucher #{voucherResult.voucherNumber}: {voucherResult.ledgerCount} Ledger entries • {voucherResult.journalCount} Journal entries
                  </div>
                  {voucherResult.journalEntries?.map((je: any) => (
                    <div key={je.id} className="pt-1 text-[11px] font-mono border-t border-slate-200 dark:border-slate-700">
                      <div>Narration: {je.narration}</div>
                      <div className="text-slate-500">Lines: {je.lines?.length} lines recorded</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ENVIRONMENT & EMAIL DISPATCH                                       */}
      {/* ========================================================================= */}
      {activeTab === "environment" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Live SMTP Dispatcher */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Live Email Dispatcher
                  </h3>
                  <p className="text-xs text-slate-500">
                    Send test dispatch through Brevo / SMTP engine
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Recipient Address
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="e.g. dev@example.com"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={handleSendTestEmail}
                    disabled={sendingEmail || !testEmailTo.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2"
                  >
                    <Send className={`w-3.5 h-3.5 ${sendingEmail ? "animate-spin" : ""}`} />
                    <span>{sendingEmail ? "Sending..." : "Dispatch"}</span>
                  </button>
                </div>
              </div>

              {emailStatusMsg && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    emailStatusMsg.success
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {emailStatusMsg.text}
                </div>
              )}
            </div>

            {/* Environment Security Status */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Environment Configuration Status
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live credential presence without disclosing plaintext secrets
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {[
                  { label: "PostgreSQL Database URL", active: telemetry?.environment?.hasDbUrl },
                  { label: "JWT Token Secret", active: telemetry?.environment?.hasJwtSecret },
                  { label: "Brevo (Sendinblue) API", active: telemetry?.environment?.hasBrevoKey },
                  { label: "Fallback SMTP Transport", active: telemetry?.environment?.hasSmtpUser },
                  { label: "Firebase Push Credentials", active: telemetry?.environment?.hasFirebaseKey },
                  { label: "AI Copilot Gemini Key", active: telemetry?.environment?.hasGeminiKey },
                  { label: "WhatsApp Webhook Token", active: telemetry?.environment?.hasWhatsAppToken },
                ].map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{item.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.active
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.active ? "Configured" : "Unset"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STACK TRACE & LOG INSPECTOR MODAL                                         */}
      {/* ========================================================================= */}
      {selectedTrace && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-600 text-white uppercase">
                  {selectedTrace.level}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {selectedTrace.module} • {selectedTrace.timestamp}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = JSON.stringify(selectedTrace, null, 2);
                    navigator.clipboard.writeText(text);
                    setCopiedTrace(true);
                    setTimeout(() => setCopiedTrace(false), 2000);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                >
                  {copiedTrace ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTrace ? "Copied" : "Copy"}</span>
                </button>
                <button
                  onClick={() => setSelectedTrace(null)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs no-scrollbar">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Message:</span>
                <p className="text-slate-200 mt-1">{selectedTrace.message}</p>
              </div>

              {selectedTrace.metadata && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Metadata:</span>
                  <pre className="mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] overflow-x-auto text-indigo-300">
                    {JSON.stringify(selectedTrace.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedTrace.stack && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Stack / Diff:</span>
                  <pre className="mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] overflow-x-auto text-rose-300">
                    {selectedTrace.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
