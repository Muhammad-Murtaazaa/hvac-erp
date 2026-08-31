"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  RotateCcw,
  Download,
  Filter,
  Search,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Database,
  ArrowRight,
  RefreshCw,
  FileText,
  CreditCard,
  Building2,
  Users,
  Wrench,
  Package,
  Truck,
  ShoppingCart,
  Receipt,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Tag,
  Copy,
  Check,
  AlertTriangle,
  ChevronRight,
  ListOrdered,
  Sparkles,
  Info,
} from "lucide-react";

interface AuditLog {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  actorEmail: string;
  beforeState: string | null;
  afterState: string | null;
  diff: string | null;
  isRolledBack: boolean;
  timestamp: string;
}

// Entity configuration with icons, colors, and human-friendly labels
const ENTITY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  Invoice: { label: "Sales Invoice", icon: FileText, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/50", border: "border-blue-200 dark:border-blue-800" },
  Voucher: { label: "Financial Voucher", icon: CreditCard, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/50", border: "border-purple-200 dark:border-purple-800" },
  LedgerEntry: { label: "Financial Voucher", icon: CreditCard, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/50", border: "border-purple-200 dark:border-purple-800" },
  Vendor: { label: "Supplier / Vendor", icon: Building2, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-200 dark:border-amber-800" },
  Customer: { label: "Customer Profile", icon: Users, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200 dark:border-emerald-800" },
  Complaint: { label: "Support Ticket / Job", icon: Wrench, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/50", border: "border-orange-200 dark:border-orange-800" },
  Product: { label: "Catalog Product", icon: Package, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/50", border: "border-indigo-200 dark:border-indigo-800" },
  PurchaseOrder: { label: "Purchase Order", icon: ShoppingCart, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/50", border: "border-cyan-200 dark:border-cyan-800" },
  GoodsReceivedNote: { label: "GRN / Stock In", icon: Layers, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/50", border: "border-teal-200 dark:border-teal-800" },
  DeliveryOrder: { label: "Delivery Challan", icon: Truck, color: "text-lime-600 dark:text-lime-400", bg: "bg-lime-50 dark:bg-lime-950/50", border: "border-lime-200 dark:border-lime-800" },
  Employee: { label: "Employee / Staff", icon: User, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-950/50", border: "border-pink-200 dark:border-pink-800" },
  PayrollRun: { label: "Payroll Processing", icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200 dark:border-emerald-800" },
  Return: { label: "Sales Return", icon: RotateCcw, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200 dark:border-rose-800" },
  VendorReturn: { label: "Vendor Return", icon: RotateCcw, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200 dark:border-rose-800" },
  StockAdjustment: { label: "Stock Adjustment", icon: Layers, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/50", border: "border-violet-200 dark:border-violet-800" },
  Payment: { label: "Payment Transaction", icon: Receipt, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/50", border: "border-green-200 dark:border-green-800" },
};

// Helper function to extract human-readable entity details from snapshot data
function parseSnapshotDetails(log: AuditLog) {
  let state: any = null;
  try {
    if (log.afterState) state = JSON.parse(log.afterState);
    else if (log.beforeState) state = JSON.parse(log.beforeState);
  } catch (e) {
    state = null;
  }

  let title = `${log.entityName} (${log.entityId.slice(0, 8)}...)`;
  let subtitle = "";
  let amountStr = "";
  let party = "";
  let statusBadge = "";

  if (state) {
    // Invoice
    if (log.entityName === "Invoice") {
      title = `Invoice #${state.invoiceNumber || state.id?.slice(0, 8)}`;
      subtitle = state.clientName ? `Client: ${state.clientName}` : "";
      if (state.totalAmount !== undefined) amountStr = `PKR ${Number(state.totalAmount).toLocaleString()}`;
      statusBadge = state.status || "";
      party = state.clientName || "";
    }
    // Voucher / LedgerEntry
    else if (log.entityName === "Voucher" || log.entityName === "LedgerEntry") {
      const vNum = state.voucherNumber || state.referenceNumber || state.voucherType || "Voucher";
      const pName = state.partyName || state.debitAccount || "";
      title = `${vNum} ${pName ? `• ${pName}` : ""}`;
      subtitle = state.description || (state.debitAccount && state.creditAccount ? `${state.debitAccount} ➔ ${state.creditAccount}` : "");
      if (state.amount !== undefined) amountStr = `PKR ${Number(state.amount).toLocaleString()}`;
      party = state.partyName || "";
    }
    // Vendor
    else if (log.entityName === "Vendor") {
      title = `Vendor: ${state.name || "Vendor"}`;
      subtitle = [state.company, state.phone, state.city].filter(Boolean).join(" • ");
      party = state.name || "";
    }
    // Customer
    else if (log.entityName === "Customer") {
      title = `Customer: ${state.name || "Customer"}`;
      subtitle = [state.phone, state.address].filter(Boolean).join(" • ");
      party = state.name || "";
    }
    // Complaint / Support
    else if (log.entityName === "Complaint") {
      title = `Ticket #${state.complaintNumber || state.id?.slice(0, 8)} ${state.clientName ? `• ${state.clientName}` : ""}`;
      subtitle = state.description || state.equipmentModel || "";
      statusBadge = state.status || "";
      party = state.clientName || "";
    }
    // Purchase Order
    else if (log.entityName === "PurchaseOrder") {
      title = `PO #${state.poNumber || state.id?.slice(0, 8)}`;
      subtitle = state.vendor?.name ? `Vendor: ${state.vendor.name}` : "";
      if (state.totalAmount !== undefined) amountStr = `PKR ${Number(state.totalAmount).toLocaleString()}`;
      statusBadge = state.status || "";
    }
    // Goods Received Note
    else if (log.entityName === "GoodsReceivedNote") {
      title = `GRN #${state.grnNumber || state.id?.slice(0, 8)}`;
      subtitle = state.poNumber ? `PO Ref: ${state.poNumber}` : "";
    }
    // Product
    else if (log.entityName === "Product") {
      title = `Product: ${state.name || "Item"}`;
      subtitle = [state.sku ? `SKU: ${state.sku}` : "", state.category, state.unit ? `Unit: ${state.unit}` : ""].filter(Boolean).join(" • ");
      if (state.salesPrice !== undefined) amountStr = `PKR ${Number(state.salesPrice).toLocaleString()}`;
    }
    // Delivery Order
    else if (log.entityName === "DeliveryOrder") {
      title = `DO #${state.doNumber || state.id?.slice(0, 8)}`;
      subtitle = state.clientName ? `Client: ${state.clientName}` : state.deliveryAddress || "";
      statusBadge = state.status || "";
      party = state.clientName || "";
    }
    // Employee
    else if (log.entityName === "Employee") {
      title = `Staff: ${state.fullName || state.name || "Employee"}`;
      subtitle = [state.designation, state.department].filter(Boolean).join(" • ");
    }
    // Payroll
    else if (log.entityName === "PayrollRun") {
      title = `Payroll: ${state.month} ${state.year}`;
      if (state.netTotal !== undefined) amountStr = `PKR ${Number(state.netTotal).toLocaleString()}`;
      statusBadge = state.status || "";
    }
  }

  // Generate a plain English sentence summarizing the event
  let humanSummary = `${log.action} event on ${log.entityName}`;
  if (log.action === "CREATE") {
    humanSummary = `Created new ${log.entityName} "${title}" by ${log.actorEmail}${amountStr ? ` with value ${amountStr}` : ""}.`;
  } else if (log.action === "UPDATE") {
    humanSummary = `Updated ${log.entityName} "${title}" by ${log.actorEmail}.`;
  } else if (log.action === "DELETE") {
    humanSummary = `Deleted ${log.entityName} "${title}" by ${log.actorEmail}.`;
  } else if (log.action === "ROLLBACK") {
    humanSummary = `Reverted changes for ${log.entityName} "${title}" to restore original state.`;
  }

  return { title, subtitle, amountStr, party, statusBadge, humanSummary };
}

// Friendly field labels mapping
const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  fullName: "Full Name",
  clientName: "Client / Customer Name",
  clientPhone: "Phone Number",
  clientAddress: "Billing / Head Office Address",
  deliveryAddress: "Delivery / Site Address",
  site: "Project / Site Location",
  totalAmount: "Total Amount",
  amount: "Transaction Amount",
  amountPaid: "Amount Paid",
  salesPrice: "Sales Price",
  unitCost: "Unit Cost",
  averageCost: "Average Cost",
  onHandQty: "Physical Stock On Hand",
  quantity: "Quantity",
  status: "Status",
  dispatchStatus: "Dispatch Status",
  paymentMethod: "Payment Method",
  debitAccount: "Debit Account",
  creditAccount: "Credit Account",
  voucherNumber: "Voucher Number",
  invoiceNumber: "Invoice Number",
  poNumber: "PO Number",
  grnNumber: "GRN Number",
  doNumber: "Delivery Order Number",
  complaintNumber: "Ticket / Complaint Number",
  description: "Description / Reason",
  notes: "Remarks & Scope Notes",
  isGst: "Tax Type",
  taxRate: "Sales Tax Rate (%)",
  discountAmount: "Discount Amount",
  discountPercent: "Discount (%)",
  date: "Document Date",
  entryDate: "Entry Date",
  validUntil: "Validity Expiration Date",
  through: "Transport / Carrier",
  vehicle: "Vehicle Info",
  lineItems: "Line Items & Products",
};

// Currency-type fields that should be formatted with commas and PKR
const CURRENCY_FIELDS = new Set([
  "totalAmount",
  "amount",
  "amountPaid",
  "salesPrice",
  "unitCost",
  "averageCost",
  "subtotalAmount",
  "discountAmount",
  "taxAmount",
  "netTotal",
]);

// Ignored technical internal IDs
const IGNORED_DIFF_KEYS = new Set([
  "updatedAt",
  "createdAt",
  "id",
  "invoiceId",
  "customerId",
  "vendorId",
  "complaintId",
  "productId",
  "userId",
  "actorId",
  "rollbackFromSnapshotId",
]);

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [diffModalTab, setDiffModalTab] = useState<"visual" | "sideBySide" | "json">("visual");
  const [copiedJson, setCopiedJson] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (entityFilter) params.append("entityName", entityFilter);
      if (actionFilter) params.append("action", actionFilter);
      params.append("limit", "150");

      const res = await fetch(`/api/audit/logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
      }
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (snapshotId: string) => {
    if (
      !confirm(
        "Are you sure you want to rollback this change? This will accurately revert database records, restore stock levels, and reconcile ledger finances."
      )
    ) {
      return;
    }

    try {
      setRollbackLoading(true);
      setStatusMessage(null);
      const res = await fetch("/api/audit/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId }),
      });

      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: "success", text: json.message || "Rollback completed successfully." });
        setSelectedLog(null);
        fetchLogs();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Rollback failed." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Rollback network error." });
    } finally {
      setRollbackLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Stats summary for header
  const stats = useMemo(() => {
    const total = logs.length;
    const creates = logs.filter((l) => l.action === "CREATE").length;
    const updates = logs.filter((l) => l.action === "UPDATE").length;
    const rollbacks = logs.filter((l) => l.isRolledBack || l.action === "ROLLBACK").length;
    return { total, creates, updates, rollbacks };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter((log) => {
      const details = parseSnapshotDetails(log);
      return (
        log.entityName.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.actorEmail.toLowerCase().includes(q) ||
        details.title.toLowerCase().includes(q) ||
        details.subtitle.toLowerCase().includes(q) ||
        details.party.toLowerCase().includes(q) ||
        (log.diff && log.diff.toLowerCase().includes(q))
      );
    });
  }, [logs, searchQuery]);

  // Parse structured diff fields for the selected log
  const parsedDiffFields = useMemo(() => {
    if (!selectedLog) return [];
    const fields: { key: string; label: string; oldVal: any; newVal: any }[] = [];

    // 1. Try reading pre-computed diff
    if (selectedLog.diff) {
      try {
        const diffObj = JSON.parse(selectedLog.diff);
        for (const [k, v] of Object.entries(diffObj)) {
          if (IGNORED_DIFF_KEYS.has(k)) continue;
          if (typeof v === "object" && v !== null && ("old" in v || "new" in v)) {
            fields.push({
              key: k,
              label: FIELD_LABELS[k] || k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
              oldVal: (v as any).old,
              newVal: (v as any).new,
            });
          }
        }
      } catch (e) {}
    }

    // 2. If no precomputed diff, compare beforeState and afterState
    if (fields.length === 0 && (selectedLog.beforeState || selectedLog.afterState)) {
      let before: any = {};
      let after: any = {};
      try {
        if (selectedLog.beforeState) before = JSON.parse(selectedLog.beforeState);
        if (selectedLog.afterState) after = JSON.parse(selectedLog.afterState);
      } catch (e) {}

      const allKeys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
      for (const k of allKeys) {
        if (IGNORED_DIFF_KEYS.has(k)) continue;
        const o = before[k];
        const n = after[k];
        if (JSON.stringify(o) !== JSON.stringify(n)) {
          fields.push({
            key: k,
            label: FIELD_LABELS[k] || k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
            oldVal: o,
            newVal: n,
          });
        }
      }
    }

    return fields;
  }, [selectedLog]);

  // Helper to format any value cleanly without exposing raw JSON to layman users
  const renderHumanValue = (key: string, val: any) => {
    if (val === null || val === undefined || val === "") {
      return <span className="text-slate-400 italic">None / Blank</span>;
    }

    // 1. Currency fields
    if (CURRENCY_FIELDS.has(key) || (typeof val === "number" && !key.toLowerCase().includes("qty") && !key.toLowerCase().includes("rate") && !key.toLowerCase().includes("percent") && val > 100)) {
      return (
        <span className="font-mono font-black text-slate-900 dark:text-white">
          PKR {Number(val).toLocaleString()}
        </span>
      );
    }

    // 2. Numeric / Quantity fields
    if (typeof val === "number") {
      return <span className="font-mono font-bold text-slate-900 dark:text-white">{val.toLocaleString()}</span>;
    }

    // 3. Booleans
    if (typeof val === "boolean") {
      return (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${val ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800"}`}>
          {val ? "Yes" : "No"}
        </span>
      );
    }

    // 4. Line items array
    if (Array.isArray(val) || key === "lineItems") {
      const items = Array.isArray(val) ? val : [];
      if (items.length === 0) return <span className="text-slate-400 italic">0 Items</span>;

      return (
        <div className="space-y-1.5 mt-1">
          <div className="text-[11px] font-bold text-slate-500">{items.length} Item(s):</div>
          <div className="space-y-1">
            {items.map((item: any, idx: number) => {
              const name = item.product?.name || item.description || item.name || `Item ${idx + 1}`;
              const qty = item.quantity !== undefined ? item.quantity : item.qty;
              const price = item.salesPrice !== undefined ? item.salesPrice : item.price || item.unitPrice;
              const unit = item.product?.unit || item.unit || "Nos";

              return (
                <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs flex items-center justify-between gap-2 shadow-2xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {name}
                  </div>
                  <div className="shrink-0 text-right font-mono text-[11px]">
                    {qty !== undefined && <span className="font-bold text-slate-700 dark:text-slate-300">{qty} {unit}</span>}
                    {price !== undefined && (
                      <span className="ml-2 font-bold text-emerald-600 dark:text-emerald-400">
                        @ PKR {Number(price).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 5. Check if it's a JSON metadata string (e.g. In Notes)
    if (typeof val === "string" && val.startsWith("{") && val.endsWith("}")) {
      try {
        const parsed = JSON.parse(val);
        const entries = Object.entries(parsed).filter(([k, v]) => v !== "" && v !== null && v !== undefined && k !== "discountType");
        if (entries.length > 0) {
          return (
            <div className="grid grid-cols-2 gap-1.5 text-xs bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 mt-1">
              {entries.map(([k, v]) => (
                <div key={k} className="text-[11px]">
                  <span className="text-slate-400 font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}: </span>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">
                    {typeof v === "number" && k.toLowerCase().includes("amount") ? `PKR ${Number(v).toLocaleString()}` : String(v)}
                  </strong>
                </div>
              ))}
            </div>
          );
        }
      } catch (e) {}
    }

    // 6. Status badges
    if (typeof val === "string" && ["ACTIVE", "PENDING", "PAID", "UNPAID", "PARTIAL", "DISPATCHED", "RESOLVED", "CANCELLED", "CONFIRMED"].includes(val.toUpperCase())) {
      return (
        <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] tracking-wider uppercase bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
          {val}
        </span>
      );
    }

    return <span className="font-semibold text-slate-800 dark:text-slate-200 break-words">{String(val)}</span>;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header & Overview Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Audit Trail & Rollback</h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                Live Ledger Auditing
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Complete chronological record of all invoices, vouchers, and updates. Inspect any field change and safely revert unauthorized modifications.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchLogs()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Trail
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Total Logged Events</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.total}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Created Records</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats.creates}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Modifications / Edits</span>
            <RefreshCw className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">{stats.updates}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Reverted / Rolled Back</span>
            <RotateCcw className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">{stats.rollbacks}</div>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm shadow-sm transition-all animate-fadeIn ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex-1 min-w-[260px]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by party name, invoice #, voucher #, user email, or ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
          <Filter className="w-3.5 h-3.5" />
          Filter:
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Document Types</option>
          <option value="Invoice">Invoices (Sales)</option>
          <option value="Voucher">Vouchers (Financials)</option>
          <option value="LedgerEntry">Ledger Entries</option>
          <option value="Vendor">Vendors (Suppliers)</option>
          <option value="Customer">Customers</option>
          <option value="Complaint">Complaints / Service Tickets</option>
          <option value="PurchaseOrder">Purchase Orders (PO)</option>
          <option value="GoodsReceivedNote">Goods Received Notes (GRN)</option>
          <option value="DeliveryOrder">Delivery Orders (DO)</option>
          <option value="Product">Products / Stock Catalog</option>
          <option value="Employee">Employees / Staff</option>
          <option value="PayrollRun">Payroll Runs</option>
          <option value="Return">Sales Returns</option>
          <option value="VendorReturn">Vendor Returns</option>
          <option value="StockAdjustment">Stock Adjustments</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Actions</option>
          <option value="CREATE">CREATE (New Entry)</option>
          <option value="UPDATE">UPDATE (Modified)</option>
          <option value="DELETE">DELETE (Removed)</option>
          <option value="ROLLBACK">ROLLBACK (Reverted)</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 min-w-[920px]">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 pl-4 pr-3 w-36">Timestamp</th>
                <th className="py-3.5 px-3 w-40">Document / Entity</th>
                <th className="py-3.5 px-3">Details / Target Item</th>
                <th className="py-3.5 px-3 w-24 text-center">Action</th>
                <th className="py-3.5 px-3 w-44">Actor (User)</th>
                <th className="py-3.5 px-3 w-28 text-center">State</th>
                <th className="py-3.5 pl-3 pr-5 text-right w-44">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading audit trail history...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No audit records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const conf = ENTITY_CONFIG[log.entityName] || {
                    label: log.entityName,
                    icon: Database,
                    color: "text-slate-600 dark:text-slate-300",
                    bg: "bg-slate-100 dark:bg-slate-800",
                    border: "border-slate-200 dark:border-slate-700",
                  };
                  const Icon = conf.icon;
                  const details = parseSnapshotDetails(log);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-3.5 pl-4 pr-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs border ${conf.bg} ${conf.color} ${conf.border}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span>{conf.label}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white max-w-xs truncate flex items-center gap-2">
                          <span>{details.title}</span>
                          {details.amountStr && (
                            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              {details.amountStr}
                            </span>
                          )}
                        </div>
                        {details.subtitle && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm mt-0.5">
                            {details.subtitle}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-black text-[10px] tracking-wider uppercase border ${
                            log.action === "CREATE"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                              : log.action === "UPDATE"
                              ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800"
                              : log.action === "DELETE"
                              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                              : "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{log.actorEmail}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {log.isRolledBack ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full font-bold border border-slate-200 dark:border-slate-700">
                            <RotateCcw className="w-3 h-3" />
                            Rolled Back
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                          >
                            Inspect Diff
                          </button>
                          {!log.isRolledBack && log.action !== "ROLLBACK" && (
                            <button
                              onClick={() => handleRollback(log.id)}
                              disabled={rollbackLoading}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Rollback
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PERFECTLY CENTERED, NON-OVERWHELMING INSPECT DIFF MODAL                   */}
      {/* ========================================================================= */}
      {selectedLog && (() => {
        const conf = ENTITY_CONFIG[selectedLog.entityName] || {
          label: selectedLog.entityName,
          icon: Database,
          color: "text-slate-600",
          bg: "bg-slate-100",
          border: "border-slate-200",
        };
        const Icon = conf.icon;
        const details = parseSnapshotDetails(selectedLog);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-6 backdrop-blur-xs animate-fadeIn">
            {/* Modal Container: Fixed Max Height, Flex Column, Strictly Centered */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              
              {/* 1. Modal Top Header (Fixed at top) */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${conf.bg} ${conf.color} ${conf.border}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] tracking-wider uppercase border ${
                        selectedLog.action === "CREATE"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                          : selectedLog.action === "UPDATE"
                          ? "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950 dark:text-sky-300"
                          : "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-300"
                      }`}>
                        {selectedLog.action}
                      </span>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                        {conf.label}: {details.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      <span><strong>By:</strong> {selectedLog.actorEmail}</span>
                      <span>•</span>
                      <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-base font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* 2. Modal Body (Single, Clean Scrollable Container) */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                
                {/* Clean Plain-English Event Explanation */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                    {details.humanSummary}
                  </div>
                </div>

                {/* Navigation View Switcher */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setDiffModalTab("visual")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        diffModalTab === "visual"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      Changes Made ({parsedDiffFields.length})
                    </button>
                    <button
                      onClick={() => setDiffModalTab("sideBySide")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        diffModalTab === "sideBySide"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      Before / After
                    </button>
                    <button
                      onClick={() => setDiffModalTab("json")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        diffModalTab === "json"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      Raw Data
                    </button>
                  </div>

                  {diffModalTab === "json" && (
                    <button
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(
                            {
                              diff: selectedLog.diff ? JSON.parse(selectedLog.diff) : null,
                              beforeState: selectedLog.beforeState ? JSON.parse(selectedLog.beforeState) : null,
                              afterState: selectedLog.afterState ? JSON.parse(selectedLog.afterState) : null,
                            },
                            null,
                            2
                          )
                        )
                      }
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
                    >
                      {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedJson ? "Copied" : "Copy Payload"}
                    </button>
                  )}
                </div>

                {/* TAB 1: Visual Human-Friendly Field Cards */}
                {diffModalTab === "visual" && (
                  <div className="space-y-3">
                    {parsedDiffFields.length === 0 ? (
                      <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {selectedLog.action === "CREATE"
                            ? "New Record Successfully Created"
                            : "No Modified Fields"}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {selectedLog.action === "CREATE"
                            ? "All fields were cleanly recorded. Switch to Before/After tab to inspect full record snapshot."
                            : "The operation completed without field changes."}
                        </p>
                      </div>
                    ) : (
                      parsedDiffFields.map((field, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                            <span className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-emerald-500" />
                              {field.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {/* Old Value */}
                            <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60 rounded-lg space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                                Before / Previous:
                              </span>
                              <div>{renderHumanValue(field.key, field.oldVal)}</div>
                            </div>

                            {/* New Value */}
                            <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-lg space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                                After / New:
                              </span>
                              <div>{renderHumanValue(field.key, field.newVal)}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 2: Clean Side-by-Side Snapshot View */}
                {diffModalTab === "sideBySide" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Before */}
                    <div className="space-y-1.5">
                      <div className="bg-rose-50 dark:bg-rose-950/60 p-2 rounded-lg text-rose-800 dark:text-rose-200 font-bold border border-rose-200 text-xs flex justify-between">
                        <span>BEFORE STATE</span>
                        <span className="text-[10px] font-mono">Original</span>
                      </div>
                      {selectedLog.beforeState ? (
                        <pre className="p-3 bg-slate-950 text-rose-300 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-56 leading-relaxed">
                          {JSON.stringify(JSON.parse(selectedLog.beforeState), null, 2)}
                        </pre>
                      ) : (
                        <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed text-xs">
                          No previous state (New Record)
                        </div>
                      )}
                    </div>

                    {/* After */}
                    <div className="space-y-1.5">
                      <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg text-emerald-800 dark:text-emerald-200 font-bold border border-emerald-200 text-xs flex justify-between">
                        <span>AFTER STATE</span>
                        <span className="text-[10px] font-mono">Updated</span>
                      </div>
                      {selectedLog.afterState ? (
                        <pre className="p-3 bg-slate-950 text-emerald-300 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-56 leading-relaxed">
                          {JSON.stringify(JSON.parse(selectedLog.afterState), null, 2)}
                        </pre>
                      ) : (
                        <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed text-xs">
                          Record was deleted
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Raw JSON */}
                {diffModalTab === "json" && (
                  <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-56 leading-relaxed border border-slate-800">
                    {JSON.stringify(
                      {
                        entityName: selectedLog.entityName,
                        entityId: selectedLog.entityId,
                        action: selectedLog.action,
                        actor: selectedLog.actorEmail,
                        timestamp: selectedLog.timestamp,
                        diff: selectedLog.diff ? JSON.parse(selectedLog.diff) : null,
                        beforeState: selectedLog.beforeState ? JSON.parse(selectedLog.beforeState) : null,
                        afterState: selectedLog.afterState ? JSON.parse(selectedLog.afterState) : null,
                      },
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>

              {/* 3. Modal Bottom Footer (Fixed at bottom) */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850/50">
                <div className="text-xs text-slate-500">
                  {!selectedLog.isRolledBack && selectedLog.action !== "ROLLBACK" ? (
                    <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Rolling back will accurately restore warehouse inventory and ledger finances.
                    </span>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">This event has already been rolled back.</span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
                  >
                    Close
                  </button>
                  {!selectedLog.isRolledBack && selectedLog.action !== "ROLLBACK" && (
                    <button
                      onClick={() => handleRollback(selectedLog.id)}
                      disabled={rollbackLoading}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {rollbackLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      Confirm Rollback
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
