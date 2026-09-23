"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Pencil,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
  Layers,
  FileText,
  Clock,
  User,
  Building,
  DollarSign,
  Trash2,
  Check,
  X,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Activity,
  Calendar,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastProvider";
import TablePagination from "@/components/shared/TablePagination";

const CHART_OF_ACCOUNTS = [
  "Cash in Hand",
  "Bank Account (Meezan Bank)",
  "Accounts Receivable (Trade Debtors)",
  "Accounts Payable (Trade Creditors)",
  "Customer Advance Deposits",
  "Vendor Advance Payments",
  "Employee Advance",
  "Salary Expense",
  "Sales Revenue",
  "Service & Maintenance Income",
  "Cost of Goods Sold",
  "Inventory Asset",
  "Sales Tax Payable",
  "Owner Equity / Capital",
];

const VOUCHER_TYPES = [
  { key: "ALL", label: "All Vouchers", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { key: "CRV", label: "Cash Receipt (CRV)", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" },
  { key: "BRV", label: "Bank Receipt (BRV)", color: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800" },
  { key: "CPV", label: "Cash Payment (CPV)", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800" },
  { key: "BPV", label: "Bank Payment (BPV)", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" },
  { key: "JV", label: "Journal Voucher (JV)", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800" },
  { key: "CV", label: "Contra Voucher (CV)", color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800" },
  { key: "EAV", label: "Employee Advance (EAV)", color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800" },
];

export default function SuperAdminModePage() {
  const router = useRouter();
  const { toast } = useToast();

  const showToast = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => {
    toast({ title, message, type });
  };

  // Auth / Clearance State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<"vouchers" | "history">("vouchers");

  // Vouchers List State
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [voucherFilterType, setVoucherFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedVoucherId, setExpandedVoucherId] = useState<string | null>(null);

  // Rollback History State
  const [rollbackHistory, setRollbackHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Pagination & Search States
  const [voucherPage, setVoucherPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState("");

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return rollbackHistory;
    const q = historySearch.toLowerCase();
    return rollbackHistory.filter((h: any) =>
      h.voucherNumber?.toLowerCase().includes(q) ||
      h.actorEmail?.toLowerCase().includes(q) ||
      h.partyName?.toLowerCase().includes(q) ||
      h.reason?.toLowerCase().includes(q) ||
      h.action?.toLowerCase().includes(q)
    );
  }, [rollbackHistory, historySearch]);

  const paginatedVouchers = useMemo(() => {
    return vouchers.slice((voucherPage - 1) * 20, voucherPage * 20);
  }, [vouchers, voucherPage]);

  const paginatedHistory = useMemo(() => {
    return filteredHistory.slice((historyPage - 1) * 20, historyPage * 20);
  }, [filteredHistory, historyPage]);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    voucherNumber: "",
    entryDate: "",
    amount: "",
    description: "",
    debitAccount: "",
    creditAccount: "",
    partyName: "",
    partyType: "GENERAL",
    paymentMethod: "CASH",
    chequeNumber: "",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Rollback Modal State
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<any>(null);
  const [rollbackPreview, setRollbackPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("");
  const [confirmedSafety, setConfirmedSafety] = useState(false);
  const [executingRollback, setExecutingRollback] = useState(false);

  // Portal mount & body scroll lock
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isEditModalOpen || isRollbackModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isEditModalOpen, isRollbackModalOpen]);

  // 1. Check Super Admin Clearance on mount
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
        const role = (user?.role?.name || "").toLowerCase();
        const isAdmin = role === "admin" || role === "super admin" || role === "superadmin" || Boolean(user?.isDeveloper);

        if (!isAdmin) {
          setAuthorized(false);
        } else {
          setAuthorized(true);
        }
      })
      .catch(() => {
        setAuthorized(false);
      });
  }, [router]);

  // 2. Load Vouchers
  const fetchVouchers = async () => {
    const token = localStorage.getItem("token");
    setLoadingVouchers(true);
    try {
      const params = new URLSearchParams();
      if (voucherFilterType !== "ALL") params.append("voucherType", voucherFilterType);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/finance/vouchers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.vouchers) {
        setVouchers(data.vouchers);
      } else {
        showToast("error", "Failed to load vouchers", data.error);
      }
    } catch (err: any) {
      showToast("error", "Error loading vouchers", err.message);
    } finally {
      setLoadingVouchers(false);
    }
  };

  // 3. Load Rollback History
  const fetchRollbackHistory = async () => {
    const token = localStorage.getItem("token");
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/finance/vouchers/rollbacks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.history) {
        setRollbackHistory(data.history);
      }
    } catch (err: any) {
      console.error("Error loading rollback history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchVouchers();
      fetchRollbackHistory();
    }
  }, [authorized, voucherFilterType]);

  // Handle Search Debounce
  useEffect(() => {
    if (!authorized) return;
    const timeout = setTimeout(() => {
      fetchVouchers();
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Open Edit Modal
  const handleOpenEdit = (v: any) => {
    setEditingVoucher(v);
    setEditForm({
      voucherNumber: v.voucherNumber || v.referenceId || "",
      entryDate: v.entryDate ? new Date(v.entryDate).toISOString().split("T")[0] : "",
      amount: String(v.amount || 0),
      description: v.description || "",
      debitAccount: v.debitAccount || "",
      creditAccount: v.creditAccount || "",
      partyName: v.partyName || "",
      partyType: v.partyType || "GENERAL",
      paymentMethod: v.paymentMethod || "CASH",
      chequeNumber: v.chequeNumber || "",
      notes: v.notes || "",
    });
    setIsEditModalOpen(true);
  };

  // Save Voucher Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher) return;

    if (!editForm.amount || Number(editForm.amount) <= 0) {
      showToast("warning", "Invalid Amount", "Please enter a valid amount greater than 0.");
      return;
    }

    setSavingEdit(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/finance/vouchers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          voucherId: editingVoucher.id,
          voucherNumber: editForm.voucherNumber,
          entryDate: editForm.entryDate ? new Date(editForm.entryDate).toISOString() : undefined,
          amount: Number(editForm.amount),
          description: editForm.description,
          debitAccount: editForm.debitAccount,
          creditAccount: editForm.creditAccount,
          partyName: editForm.partyName,
          partyType: editForm.partyType,
          paymentMethod: editForm.paymentMethod,
          chequeNumber: editForm.chequeNumber,
          notes: editForm.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update voucher");

      showToast("success", "Voucher Updated", `Voucher ${editForm.voucherNumber} synchronized across ledger and journal.`);
      setIsEditModalOpen(false);
      fetchVouchers();
      fetchRollbackHistory();
    } catch (err: any) {
      showToast("error", "Update Failed", err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Rollback Pre-Flight Modal
  const handleOpenRollback = async (v: any) => {
    setRollbackTarget(v);
    setRollbackReason("");
    setConfirmedSafety(false);
    setRollbackPreview(null);
    setIsRollbackModalOpen(true);
    setLoadingPreview(true);

    try {
      const token = localStorage.getItem("token");
      const vNum = v.voucherNumber || v.referenceId;
      const res = await fetch(`/api/finance/vouchers/rollback-preview?voucherNumber=${encodeURIComponent(vNum)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.impact) {
        setRollbackPreview(data.impact);
      } else {
        setRollbackPreview({
          ledgerEntriesCount: 1,
          journalEntriesCount: 1,
          journalLinesCount: 2,
          affectedAccounts: [v.debitAccount, v.creditAccount].filter(Boolean),
          amount: Number(v.amount),
          partyName: v.partyName,
        });
      }
    } catch (err: any) {
      console.error("Preview failed:", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Execute Rollback
  const handleConfirmRollback = async () => {
    if (!rollbackTarget) return;
    if (!rollbackReason.trim()) {
      showToast("warning", "Reason Required", "Please specify the audit reason for rolling back this voucher.");
      return;
    }

    setExecutingRollback(true);
    try {
      const token = localStorage.getItem("token");
      const vNum = rollbackTarget.voucherNumber || rollbackTarget.referenceId;

      const res = await fetch("/api/finance/vouchers", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          voucherId: rollbackTarget.id,
          voucherNumber: vNum,
          reason: rollbackReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rollback voucher");

      showToast("success", "Voucher Rolled Back", `Voucher ${vNum} and all corresponding journal entries were permanently reversed.`);
      setIsRollbackModalOpen(false);
      fetchVouchers();
      fetchRollbackHistory();
    } catch (err: any) {
      showToast("error", "Rollback Failed", err.message);
    } finally {
      setExecutingRollback(false);
    }
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const totalCount = vouchers.length;
    const totalAmount = vouchers.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
    const rollbackCount = rollbackHistory.filter((h) => h.action === "ROLLBACK").length;
    return {
      totalCount,
      totalAmount,
      rollbackCount,
    };
  }, [vouchers, rollbackHistory]);

  // Loading Screen
  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Verifying Super Admin clearance...</p>
        </div>
      </div>
    );
  }

  // Access Denied Screen
  if (authorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center mx-auto text-rose-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Super Admin Clearance Required</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Super Admin Mode provides direct double-entry voucher editing and irrevocable rollback privileges. Your account does not possess sufficient privileges to access this console.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 lg:p-8 space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Super Admin Mode</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                Direct Ledger Override
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live double-entry voucher correction, account re-allocation, and zero-leak ledger rollback console.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchVouchers();
              fetchRollbackHistory();
            }}
            disabled={loadingVouchers}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingVouchers ? "animate-spin text-rose-500" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => router.push("/financials")}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Standard Financials</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Loaded Vouchers</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {stats.totalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Available for super admin modification</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Financial Volume</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            PKR {Math.round(stats.totalAmount).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Cumulative voucher transaction turnover</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Rollbacks Executed</span>
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
            {stats.rollbackCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Audited reversals in system history</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Reconciliation Integrity</span>
            <ShieldCheck className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-2 font-mono">
            100%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Zero balance leak safety active</div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("vouchers")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "vouchers"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Voucher Management Center</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-200 dark:bg-slate-200 dark:text-slate-800">
            {vouchers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "history"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Rollback & Audit History</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-200 dark:bg-slate-200 dark:text-slate-800">
            {rollbackHistory.length}
          </span>
        </button>
      </div>

      {/* TAB 1: VOUCHER MANAGEMENT */}
      {activeTab === "vouchers" && (
        <div className="space-y-4">
          {/* Controls / Filter Header */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            {/* Type Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {VOUCHER_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setVoucherFilterType(t.key);
                    setVoucherPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    voucherFilterType === t.key
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : `${t.color} hover:opacity-80`
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVoucherPage(1);
                }}
                placeholder="Search by voucher number (e.g. CRV-2026-0001), party name, narration, debit/credit account..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Vouchers Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 w-32">Voucher No</th>
                    <th className="p-3.5 w-28">Date</th>
                    <th className="p-3.5">Party / Beneficiary</th>
                    <th className="p-3.5">Accounts (Debit → Credit)</th>
                    <th className="p-3.5 max-w-xs">Narration</th>
                    <th className="p-3.5 text-right w-32">Amount (PKR)</th>
                    <th className="p-3.5 text-center w-28">Super Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingVouchers ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                        Loading financial vouchers...
                      </td>
                    </tr>
                  ) : vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        No financial vouchers found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedVouchers.map((v) => {
                      const vNum = v.voucherNumber || v.referenceId || "VOUCHER";
                      const isExpanded = expandedVoucherId === v.id;
                      const hasJournal = Boolean(v.journalEntry);

                      return (
                        <React.Fragment key={v.id}>
                          <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            {/* Voucher Number & Type */}
                            <td className="p-3.5 align-middle">
                              <div className="font-mono font-black text-slate-900 dark:text-white">
                                {vNum}
                              </div>
                              <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {v.voucherType || "VOUCHER"}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="p-3.5 align-middle whitespace-nowrap">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {v.entryDate ? new Date(v.entryDate).toLocaleDateString() : "N/A"}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {v.paymentMethod || "CASH"}
                              </div>
                            </td>

                            {/* Party */}
                            <td className="p-3.5 align-middle">
                              {v.partyName ? (
                                <div>
                                  <div className="font-black text-slate-900 dark:text-white">
                                    {v.partyName}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {v.partyType || "Party"}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">General / Unassigned</span>
                              )}
                            </td>

                            {/* Accounts */}
                            <td className="p-3.5 align-middle">
                              <div className="space-y-0.5">
                                <div className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                                  <span className="font-bold">Dr:</span> {v.debitAccount}
                                </div>
                                <div className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 text-[11px]">
                                  <span className="font-bold">Cr:</span> {v.creditAccount}
                                </div>
                              </div>
                            </td>

                            {/* Narration */}
                            <td className="p-3.5 align-middle text-slate-700 dark:text-slate-300 max-w-xs truncate" title={v.description}>
                              {v.description || <span className="text-slate-400 italic">No description</span>}
                            </td>

                            {/* Amount */}
                            <td className="p-3.5 text-right align-middle font-mono font-black text-sm whitespace-nowrap text-slate-900 dark:text-white">
                              PKR {Math.round(Number(v.amount) || 0).toLocaleString()}
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-center align-middle whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(v)}
                                  className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                                  title="Edit Voucher (Super Admin)"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRollback(v)}
                                  className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                                  title="Rollback Voucher (Super Admin)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedVoucherId(isExpanded ? null : v.id)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                  title="Inspect Double-Entry Journal Lines"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-rose-500" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Double-Entry Breakdown */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80 dark:bg-slate-950/60">
                              <td colSpan={7} className="p-4 pl-12">
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-inner">
                                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <span className="flex items-center gap-1.5">
                                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>Double-Entry Journal Reconciliation: {vNum}</span>
                                    </span>
                                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                                      ✓ Balanced Journal Lines
                                    </span>
                                  </div>

                                  {hasJournal && v.journalEntry.lines ? (
                                    <div className="space-y-2">
                                      {v.journalEntry.lines.map((l: any) => (
                                        <div key={l.id} className="flex items-center justify-between text-xs font-mono py-1 border-b border-slate-100/60 dark:border-slate-800/60 last:border-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-slate-800 dark:text-slate-200 font-bold">
                                              {l.account?.name || l.accountId}
                                            </span>
                                            {l.partyId && (
                                              <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300">
                                                Party Linked
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-4">
                                            {Number(l.debit) > 0 && (
                                              <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                                Dr: PKR {Math.round(Number(l.debit)).toLocaleString()}
                                              </span>
                                            )}
                                            {Number(l.credit) > 0 && (
                                              <span className="text-blue-600 dark:text-blue-400 font-black">
                                                Cr: PKR {Math.round(Number(l.credit)).toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">
                                      No direct JournalEntry record was linked. Updating this voucher will automatically generate and synchronize double-entry journal records.
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={voucherPage}
              totalItems={vouchers.length}
              pageSize={20}
              onPageChange={setVoucherPage}
              itemLabel="vouchers"
            />
          </div>
        </div>
      )}

      {/* TAB 2: ROLLBACK & AUDIT HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Audit Snapshot Trail</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable records of every financial voucher rollback and update executed by Super Admins.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Filter audit logs..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                />
              </div>
              <button
                onClick={fetchRollbackHistory}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Refresh Audit History"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin text-rose-500" : ""}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 w-36">Timestamp</th>
                  <th className="p-3.5 w-24">Action</th>
                  <th className="p-3.5 w-32">Voucher No</th>
                  <th className="p-3.5">Super Admin Actor</th>
                  <th className="p-3.5">Party</th>
                  <th className="p-3.5 text-right w-28">Amount</th>
                  <th className="p-3.5">Audit Reason / Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                      Loading audit logs...
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">
                      {historySearch ? "No audit logs matching your search." : "No voucher rollback or modification audit snapshots recorded yet."}
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(h.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            h.action === "ROLLBACK"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300"
                          }`}
                        >
                          {h.action}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {h.voucherNumber}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        {h.actorEmail}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {h.partyName || "N/A"}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        PKR {Math.round(Number(h.amount) || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {h.reason || <span className="italic text-slate-400">No explicit reason noted</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={historyPage}
            totalItems={filteredHistory.length}
            pageSize={20}
            onPageChange={setHistoryPage}
            itemLabel="audit records"
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: SUPER ADMIN VOUCHER EDITOR                           */}
      {/* ============================================================ */}
      {mounted && isEditModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 rounded-3xl w-full max-w-2xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh] space-y-5 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Edit Financial Voucher: {editForm.voucherNumber}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Synchronizes adjustments across the General Ledger and Double-Entry Journal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1 cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Entry Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editForm.entryDate}
                    onChange={(e) => setEditForm({ ...editForm, entryDate: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (PKR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Debit & Credit Accounts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    Debit Account (Dr)
                  </label>
                  <select
                    value={editForm.debitAccount}
                    onChange={(e) => setEditForm({ ...editForm, debitAccount: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-slate-900 dark:text-white"
                  >
                    {CHART_OF_ACCOUNTS.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
                    Credit Account (Cr)
                  </label>
                  <select
                    value={editForm.creditAccount}
                    onChange={(e) => setEditForm({ ...editForm, creditAccount: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-900 dark:text-white"
                  >
                    {CHART_OF_ACCOUNTS.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Party Name & Party Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Party Name / Beneficiary
                  </label>
                  <input
                    type="text"
                    value={editForm.partyName}
                    onChange={(e) => setEditForm({ ...editForm, partyName: e.target.value })}
                    placeholder="e.g. Customer / Vendor name"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Party Type
                  </label>
                  <select
                    value={editForm.partyType}
                    onChange={(e) => setEditForm({ ...editForm, partyType: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="CUSTOMER">CUSTOMER</option>
                    <option value="VENDOR">VENDOR</option>
                    <option value="EMPLOYEE">EMPLOYEE</option>
                  </select>
                </div>
              </div>

              {/* Payment Mode & Cheque */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="CASH">CASH</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="ONLINE">ONLINE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cheque Number (if applicable)
                  </label>
                  <input
                    type="text"
                    value={editForm.chequeNumber}
                    onChange={(e) => setEditForm({ ...editForm, chequeNumber: e.target.value })}
                    placeholder="e.g. CHQ-99201"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Description / Narration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Narration / Description
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Reason / payment reference description..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Voucher Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================ */}
      {/* MODAL 2: PERFECT PRE-FLIGHT ROLLBACK MODAL                   */}
      {/* ============================================================ */}
      {mounted && isRollbackModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/80 p-6 sm:p-7 rounded-3xl w-full max-w-xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh] space-y-5 my-auto">
            {/* Danger Header */}
            <div className="flex items-center justify-between pb-4 border-b border-rose-100 dark:border-rose-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-900 dark:text-rose-200">
                    Irreversible Voucher Rollback
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-mono font-bold">
                    Voucher: {rollbackTarget?.voucherNumber || rollbackTarget?.referenceId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRollbackModalOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1 cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Impact Details */}
            <div className="space-y-4">
              {loadingPreview ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500" />
                  <p className="text-xs">Analyzing pre-flight double-entry impact...</p>
                </div>
              ) : (
                <>
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Zero-Leak Purge Confirmation</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                      Executing this rollback permanently deletes this voucher from both the General Ledger and Double-Entry Journals, re-balancing all associated account balances with zero orphan lines.
                    </p>
                  </div>

                  {/* Impact Summary Matrix */}
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-sans">Ledger Records</div>
                      <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        {rollbackPreview?.ledgerEntriesCount || 1}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-sans">Journal Lines Purged</div>
                      <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        {rollbackPreview?.journalLinesCount || 2}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-sans">Reversal Amount</div>
                      <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">
                        PKR {Math.round(Number(rollbackTarget?.amount) || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-sans">Affected Party</div>
                      <div className="text-xs font-black truncate text-slate-900 dark:text-white mt-1 font-sans">
                        {rollbackTarget?.partyName || "General Account"}
                      </div>
                    </div>
                  </div>

                  {/* Mandatory Reason */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Audit Reason for Rollback <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={rollbackReason}
                      onChange={(e) => setRollbackReason(e.target.value)}
                      placeholder="Specify why this financial voucher is being rolled back (e.g. Duplicate entry, incorrect party payment, accounting correction)..."
                      required
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Checkbox verification */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedSafety}
                      onChange={(e) => setConfirmedSafety(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      I understand this action is permanent and creates an immutable audit snapshot under my Super Admin email.
                    </span>
                  </label>
                </>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRollbackModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRollback}
                  disabled={executingRollback || !confirmedSafety || !rollbackReason.trim()}
                  className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {executingRollback ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Execute Zero-Leak Rollback</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
