"use client";

import React, { useState, useEffect } from "react";
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

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
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
      params.append("limit", "100");

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
    if (!confirm("Are you sure you want to rollback this change? This will accurately revert database records, stock levels, and ledger finances.")) {
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

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.entityName.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.actorEmail.toLowerCase().includes(q) ||
      (log.diff && log.diff.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Audit Trail & Rollback</h1>
            <p className="text-xs text-slate-500">Immutable transaction history with one-click multi-table financial rollback</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogs()}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Trail
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500" />
          )}
          <span className="font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail by ID, email, entity..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mr-1">
          <Filter className="w-4 h-4" />
          Filters:
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs"
        >
          <option value="">All Entities</option>
          <option value="Invoice">Invoices / Sales</option>
          <option value="PurchaseOrder">Purchase Orders</option>
          <option value="GoodsReceivedNote">GRN / Receiving</option>
          <option value="Product">Products / Catalog</option>
          <option value="StockAdjustment">Stock Adjustments</option>
          <option value="DeliveryOrder">Delivery Orders</option>
          <option value="Employee">Employees / HRM</option>
          <option value="PayrollRun">Payroll Runs</option>
          <option value="Complaint">Complaints / Service</option>
          <option value="Return">Sales Returns</option>
          <option value="VendorReturn">Vendor Returns</option>
          <option value="Vendor">Vendors / Suppliers</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs"
        >
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="ROLLBACK">ROLLBACK</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">Record ID</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No audit records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 whitespace-nowrap text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                        {log.entityName}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{log.entityId.slice(0, 8)}...</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          log.action === "CREATE"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                            : log.action === "UPDATE"
                            ? "bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400"
                            : log.action === "DELETE"
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                            : "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">{log.actorEmail}</td>
                    <td className="p-3.5">
                      {log.isRolledBack ? (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                          Rolled Back
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs transition-colors font-medium"
                      >
                        Inspect Diff
                      </button>
                      {!log.isRolledBack && log.action !== "ROLLBACK" && (
                        <button
                          onClick={() => handleRollback(log.id)}
                          disabled={rollbackLoading}
                          className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Rollback
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diff Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Audit Snapshot Details ({selectedLog.entityName})
                </h3>
                <p className="text-xs text-slate-500 font-mono">Record ID: {selectedLog.entityId}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs space-y-1">
                <div className="text-slate-500">Action: <span className="font-semibold text-slate-900 dark:text-white">{selectedLog.action}</span></div>
                <div className="text-slate-500">Modified by: <span className="font-semibold text-slate-900 dark:text-white">{selectedLog.actorEmail}</span></div>
                <div className="text-slate-500">Date: <span className="font-semibold text-slate-900 dark:text-white">{new Date(selectedLog.timestamp).toLocaleString()}</span></div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Captured Field Diff / Payload</h4>
                {selectedLog.diff ? (
                  <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-56">
                    {JSON.stringify(JSON.parse(selectedLog.diff), null, 2)}
                  </pre>
                ) : selectedLog.afterState ? (
                  <pre className="p-3 bg-slate-950 text-sky-400 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-56">
                    {JSON.stringify(JSON.parse(selectedLog.afterState), null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-slate-400 italic">No field-level diff recorded for this event.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              {!selectedLog.isRolledBack && selectedLog.action !== "ROLLBACK" && (
                <button
                  onClick={() => handleRollback(selectedLog.id)}
                  disabled={rollbackLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Confirm Rollback
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
