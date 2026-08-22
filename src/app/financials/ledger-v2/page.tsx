"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  PlusCircle,
  Scale,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function LedgerV2Page() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the consolidated General Ledger in /financials
    router.replace("/financials?tab=general-ledger");
  }, [router]);

  const [activeTab, setActiveTab] = useState<"manual" | "party" | "trial" | "journal">("manual");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);

  // Manual Entry Form State
  const [debitAccount, setDebitAccount] = useState("");
  const [creditAccount, setCreditAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [partyType, setPartyType] = useState<"CUSTOMER" | "VENDOR" | "EMPLOYEE" | "">("");
  const [partyId, setPartyId] = useState("");
  const [partySearch, setPartySearch] = useState("");
  const [partiesList, setPartiesList] = useState<any[]>([]);
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Party Ledger View State
  const [selectedPartyType, setSelectedPartyType] = useState<"CUSTOMER" | "VENDOR" | "EMPLOYEE">("CUSTOMER");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [partyLedgerData, setPartyLedgerData] = useState<any>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const [jRes, tbRes, custRes, vendRes, empRes] = await Promise.all([
        fetch("/api/finance/journal?limit=100"),
        fetch("/api/finance/journal/trial-balance"),
        fetch("/api/sales/customers"),
        fetch("/api/procurement/vendors"),
        fetch("/api/hrm/employees"),
      ]);

      const jData = await jRes.json();
      if (jData.accounts) setAccounts(jData.accounts);
      if (jData.entries) setJournalEntries(jData.entries);

      const tbData = await tbRes.json();
      setTrialBalanceData(tbData);

      const custData = await custRes.json();
      const vendData = await vendRes.json();
      const empData = await empRes.json();

      const combinedParties: any[] = [];
      (custData.customers || []).forEach((c: any) => combinedParties.push({ id: c.id, name: c.name, type: "CUSTOMER", meta: c.phone || "No phone" }));
      (vendData.vendors || []).forEach((v: any) => combinedParties.push({ id: v.id, name: v.name, type: "VENDOR", meta: v.contactPerson || "Vendor" }));
      (empData.employees || []).forEach((e: any) => combinedParties.push({ id: e.id, name: e.name, type: "EMPLOYEE", meta: `${e.employeeNo || ""} ${e.cnic || ""}`.trim() }));
      setPartiesList(combinedParties);
    } catch (e: any) {
      console.error("Error loading ledger v2 data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitMessage(null);

    if (!debitAccount || !creditAccount || !amount || Number(amount) <= 0 || !narration) {
      setSubmitMessage({ type: "error", text: "Please complete all required fields." });
      return;
    }

    if (debitAccount === creditAccount) {
      setSubmitMessage({ type: "error", text: "Debit and Credit accounts must be distinct." });
      return;
    }

    try {
      const res = await fetch("/api/finance/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debitAccount,
          creditAccount,
          amount: Number(amount),
          narration,
          partyType: partyType || undefined,
          partyId: partyId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post manual journal entry.");
      }

      setSubmitMessage({
        type: "success",
        text: `Journal Entry posted successfully (ID: ${data.journalEntry.id}). Debit = Credit = PKR ${Number(amount).toLocaleString()}`,
      });
      setAmount("");
      setNarration("");
      setPartyId("");
      fetchInitialData();
    } catch (err: any) {
      setSubmitMessage({ type: "error", text: err.message });
    }
  }

  async function loadPartyLedger(pId: string, pType: string) {
    if (!pId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/journal/party-ledger?partyId=${pId}&partyType=${pType}`);
      const data = await res.json();
      setPartyLedgerData(data);
    } catch (err) {
      console.error("Error loading party ledger:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredParties = partiesList.filter((p) => {
    const matchType = !partyType || p.type === partyType;
    const matchSearch = !partySearch || p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.meta.toLowerCase().includes(partySearch.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold tracking-wide uppercase">
              Double-Entry Engine (v2)
            </span>
            <span className="text-xs text-slate-400">Isolated & Non-Destructive</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-2 text-white">General Ledger & Financial Accounting</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-legged double entry, canonical Chart of Accounts, and mathematical balance verification.
          </p>
        </div>
        <button
          onClick={fetchInitialData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "manual" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          Manual Journal Entry
        </button>
        <button
          onClick={() => setActiveTab("party")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "party" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Double-Entry Party Ledger
        </button>
        <button
          onClick={() => setActiveTab("trial")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "trial" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <Scale className="w-4 h-4" />
          Trial Balance
        </button>
        <button
          onClick={() => setActiveTab("journal")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "journal" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          All Journal Entries ({journalEntries.length})
        </button>
      </div>

      {/* Tab 1: Manual Journal Entry Form */}
      {activeTab === "manual" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Post Manual Journal Entry</h2>
          <p className="text-xs text-slate-500 mb-6">
            Post an atomic, balanced 2-legged financial transaction. Automatically enforces <code className="text-emerald-500">Debit = Credit</code>.
          </p>

          {submitMessage && (
            <div
              className={`p-4 rounded-xl mb-6 text-sm flex items-start gap-3 ${
                submitMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
              }`}
            >
              {submitMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 mt-0.5 text-rose-600" />}
              <span>{submitMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Debit Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Debit Account (Receives Value / Asset / Expense) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={debitAccount}
                  onChange={(e) => setDebitAccount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Select Debit Account --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Credit Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Credit Account (Gives Value / Liability / Income) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={creditAccount}
                  onChange={(e) => setCreditAccount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Select Credit Account --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Party Selection (Explicit Anti-Ambiguity Selector) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Party Subledger Tag (Customer / Vendor / Employee)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select
                    value={partyType}
                    onChange={(e) => {
                      setPartyType(e.target.value as any);
                      setPartyId("");
                    }}
                    className="col-span-1 px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="">All Types</option>
                    <option value="CUSTOMER">Customer</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>

                  <select
                    value={partyId}
                    onChange={(e) => setPartyId(e.target.value)}
                    className="col-span-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                  >
                    <option value="">-- No Party Tag (General Ledger) --</option>
                    {filteredParties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.type}: {p.meta}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Narration */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Narration / Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Reason or reference for this journal entry..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm shadow-md transition"
            >
              Post Journal Entry
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Double-Entry Party Ledger */}
      {activeTab === "party" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">View Pure Double-Entry Party Statement</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Party Type</label>
                <select
                  value={selectedPartyType}
                  onChange={(e) => {
                    setSelectedPartyType(e.target.value as any);
                    setSelectedPartyId("");
                    setPartyLedgerData(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Select Specific Party</label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => {
                    setSelectedPartyId(e.target.value);
                    loadPartyLedger(e.target.value, selectedPartyType);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value="">-- Choose Party --</option>
                  {partiesList
                    .filter((p) => p.type === selectedPartyType)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.meta})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {partyLedgerData && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{partyLedgerData.party.name}</h3>
                  <span className="text-xs text-slate-500">{partyLedgerData.party.type} Subledger Account</span>
                </div>
                <div className="mt-2 sm:mt-0 text-right">
                  <div className="text-xs text-slate-500">Current Position</div>
                  <div className={`text-xl font-extrabold ${partyLedgerData.totals.closingBalance >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                    PKR {Math.abs(partyLedgerData.totals.closingBalance).toLocaleString()}
                    <span className="text-xs font-normal ml-1">
                      {selectedPartyType === "VENDOR"
                        ? partyLedgerData.totals.closingBalance >= 0 ? "Payable" : "Prepayment"
                        : partyLedgerData.totals.closingBalance >= 0 ? "Receivable" : "Advance Deposit"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Source</th>
                      <th className="p-3">Account Tag</th>
                      <th className="p-3">Narration</th>
                      <th className="p-3 text-right">Debit (PKR)</th>
                      <th className="p-3 text-right">Credit (PKR)</th>
                      <th className="p-3 text-right">Running Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {partyLedgerData.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          No journal transactions recorded for this party.
                        </td>
                      </tr>
                    ) : (
                      partyLedgerData.transactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="p-3">{new Date(tx.entryDate).toISOString().slice(0, 10)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">{tx.sourceType}</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{tx.accountName}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{tx.narration}</td>
                          <td className="p-3 text-right font-mono">{tx.debit > 0 ? tx.debit.toLocaleString() : "-"}</td>
                          <td className="p-3 text-right font-mono">{tx.credit > 0 ? tx.credit.toLocaleString() : "-"}</td>
                          <td className="p-3 text-right font-mono font-bold">{tx.runningBalance.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Trial Balance */}
      {activeTab === "trial" && trialBalanceData && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Trial Balance Statement</h2>
              <p className="text-xs text-slate-500">Summary of all debit and credit balances in the double-entry Chart of Accounts.</p>
            </div>
            <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
              trialBalanceData.totals.isBalanced
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
            }`}>
              {trialBalanceData.totals.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              {trialBalanceData.totals.isBalanced ? "Equation Balanced (Debit = Credit)" : "Unbalanced Discrepancy"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Account Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Debit Total (PKR)</th>
                  <th className="p-3 text-right">Credit Total (PKR)</th>
                  <th className="p-3 text-right">Net Debit (PKR)</th>
                  <th className="p-3 text-right">Net Credit (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {trialBalanceData.trialBalance.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{row.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">{row.type}</span>
                    </td>
                    <td className="p-3 text-right font-mono">{row.totalDebit > 0 ? row.totalDebit.toLocaleString() : "-"}</td>
                    <td className="p-3 text-right font-mono">{row.totalCredit > 0 ? row.totalCredit.toLocaleString() : "-"}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">{row.netDebit > 0 ? row.netDebit.toLocaleString() : "-"}</td>
                    <td className="p-3 text-right font-mono font-bold text-blue-600">{row.netCredit > 0 ? row.netCredit.toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td className="p-3" colSpan={2}>Grand Total</td>
                  <td className="p-3 text-right font-mono">PKR {trialBalanceData.totals.totalDebit.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono">PKR {trialBalanceData.totals.totalCredit.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-emerald-600" colSpan={2}>Balanced</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: General Journal */}
      {activeTab === "journal" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Posted Journal Entries</h2>
          <div className="space-y-4">
            {journalEntries.map((je: any) => (
              <div key={je.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex justify-between items-start text-xs border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{je.narration}</span>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Key: {je.idempotencyKey || "(none)"}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">{je.sourceType}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{new Date(je.entryDate).toISOString().slice(0, 10)}</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  {je.lines.map((line: any) => (
                    <div key={line.id} className="flex justify-between items-center pl-2">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {line.debit > 0 ? `Dr. ${line.account.name}` : `    Cr. ${line.account.name}`}
                      </span>
                      <div className="font-mono">
                        {line.debit > 0 ? (
                          <span className="text-emerald-600 font-semibold">PKR {Number(line.debit).toLocaleString()}</span>
                        ) : (
                          <span className="text-blue-600 font-semibold">PKR {Number(line.credit).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
