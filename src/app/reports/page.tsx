"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, Printer, Download, Search, Calendar, ChevronRight, FileText } from "lucide-react";
import SearchFilter from "@/components/shared/SearchFilter";
import SkeletonTable from "@/components/shared/SkeletonTable";

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "pnl";

  const [reportType, setReportType] = useState(initialType); // pnl, ledger, valuation, aging, sales
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    const type = searchParams.get("type");
    if (type) {
      setReportType(type);
    }
  }, [searchParams]);

  // ==================== REAL CSV EXPORTER ====================
  const exportToCSV = () => {
    if (!reportData) return;

    let headers: string[] = [];
    let rows: any[] = [];
    let fileName = `${reportType}-report.csv`;

    if (reportType === "ledger") {
      headers = ["Entry Date", "Description", "Debit Account", "Credit Account", "Amount (PKR)", "Ref Type", "Ref ID"];
      const query = ledgerSearch.toLowerCase();
      const filteredData = (reportData as any[]).filter((entry) => {
        return (
          (entry.description || "").toLowerCase().includes(query) ||
          (entry.debitAccount || "").toLowerCase().includes(query) ||
          (entry.creditAccount || "").toLowerCase().includes(query) ||
          (entry.referenceType || "").toLowerCase().includes(query) ||
          (entry.referenceId || "").toLowerCase().includes(query) ||
          String(entry.amount).includes(query) ||
          new Date(entry.entryDate).toLocaleDateString().toLowerCase().includes(query)
        );
      });
      rows = filteredData.map((e) => [
        new Date(e.entryDate).toLocaleDateString(),
        `"${e.description.replace(/"/g, '""')}"`,
        e.debitAccount,
        e.creditAccount,
        Number(e.amount).toFixed(2),
        e.referenceType,
        e.referenceId,
      ]);
    } else if (reportType === "pnl") {
      headers = ["Financial Account", "Amount (PKR)"];
      rows = [
        ["Sales Revenue", Number(reportData.salesRevenue).toFixed(2)],
        ["Less: Sales Returns", Number(reportData.salesReturns).toFixed(2)],
        ["Net Sales Revenue", Number(reportData.netSales).toFixed(2)],
        ["Less: Cost of Goods Sold (COGS)", Number(reportData.cogs).toFixed(2)],
        ["Gross Profit", Number(reportData.grossProfit).toFixed(2)],
        ["Operating Expenses:", ""],
        ["  Salary Expense", Number(reportData.salaryExpense).toFixed(2)],
        ["  Inventory Adjustments", Number(reportData.inventoryAdjustments).toFixed(2)],
        ["Total Expenses", Number(reportData.totalExpenses).toFixed(2)],
        ["Net Net Profit", Number(reportData.netProfit).toFixed(2)],
      ];
    } else if (reportType === "valuation") {
      headers = ["Product SKU", "Product Name", "Category", "On Hand Quantity", "Avg Cost (PKR)", "Stock Valuation (PKR)"];
      rows = (reportData.items as any[]).map((p) => [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        p.onHandQty,
        Number(p.averageCost).toFixed(2),
        Number(p.totalValue).toFixed(2),
      ]);
      rows.push(["TOTAL ASSET VALUATION", "", "", "", "", Number(reportData.totalValuation).toFixed(2)]);
    } else if (reportType === "aging") {
      headers = ["Aging Bracket", "Accounts Receivable (AR) (PKR)", "Accounts Payable (AP) (PKR)"];
      const ar = reportData.accountsReceivableAging || {};
      const ap = reportData.accountsPayableAging || {};
      rows = [
        ["Current (0-30 days)", Number(ar.current).toFixed(2), Number(ap.current).toFixed(2)],
        ["31 - 60 Days", Number(ar.thirty).toFixed(2), Number(ap.thirty).toFixed(2)],
        ["61 - 90 Days", Number(ar.sixty).toFixed(2), Number(ap.sixty).toFixed(2)],
        ["90+ Days (Overdue)", Number(ar.ninety).toFixed(2), Number(ap.ninety).toFixed(2)],
      ];
    } else if (reportType === "sales") {
      headers = ["Client / Product SKU", "Description / Product Name", "Quantity Sold", "Sales Total (PKR)"];
      rows.push(["SALES BY CLIENT", "", "", ""]);
      Object.entries(reportData.salesByClient || {}).forEach(([client, amount]) => {
        rows.push([client, "", "", Number(amount).toFixed(2)]);
      });
      rows.push(["", "", "", ""]);
      rows.push(["SALES BY PRODUCT", "", "", ""]);
      Object.entries(reportData.salesByProduct || {}).forEach(([key, p]: any) => {
        rows.push([key, `"${p.name.replace(/"/g, '""')}"`, p.quantity, Number(p.amount).toFixed(2)]);
      });
    }

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Selection Panel Header (hidden in print) */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Financial Reports Desk</h2>
            <p className="text-xs text-slate-500 mt-1">Audit ledgers, stock value balances, and profitability statements</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportToCSV}
              disabled={!reportData}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              disabled={!reportData}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap border-b border-slate-100 dark:border-slate-800/80 gap-1 pt-2">
          {[
            { id: "pnl", label: "Profit & Loss" },
            { id: "ledger", label: "General Ledger" },
            { id: "valuation", label: "Stock Valuation" },
            { id: "aging", label: "AP/AR Aging" },
            { id: "sales", label: "Sales Analytics" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setReportType(tab.id);
                setReportData(null);
              }}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                reportType === tab.id
                  ? "border-blue-500 text-blue-500 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filter row */}
        {reportType !== "valuation" && reportType !== "aging" && (
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Period:</span>
            </div>
            <input
              type="date"
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Main Print Container Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm print-card">
        {/* Printable header */}
        <div className="hidden print-only mb-6">
          <h2 className="text-xl font-bold text-slate-950">HVAC ERP REPORT</h2>
          <p className="text-xs text-slate-500 capitalize">Report Type: {reportType} Statement</p>
          <p className="text-xs text-slate-400 mt-1">
            Generated on: {new Date().toLocaleDateString()} {reportType !== "valuation" && `(Period: ${startDate} to ${endDate})`}
          </p>
          <hr className="border-t border-slate-200 my-4" />
        </div>

        {loading ? (
          <SkeletonTable rows={8} columns={5} />
        ) : error ? (
          <div className="py-12 text-center text-rose-500 font-semibold">{error}</div>
        ) : !reportData ? (
          <div className="py-20 text-center text-slate-400 text-sm">Select dates and compile to render report data.</div>
        ) : (
          /* ==================== REPORT RENDERS ==================== */
          <div>
            {/* 1. PROFIT & LOSS VIEW */}
            {reportType === "pnl" && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center pb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">PROFIT & LOSS STATEMENT</h3>
                  <p className="text-xs text-slate-500">For the period {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</p>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800/80">
                  <div className="p-4 flex justify-between font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/20">
                    <span>Account Category</span>
                    <span>Balance (PKR)</span>
                  </div>

                  <div className="p-4 flex justify-between">
                    <span className="font-semibold">Sales Revenue (Invoiced)</span>
                    <span>{Number(reportData.salesRevenue).toFixed(2)}</span>
                  </div>

                  <div className="p-4 flex justify-between text-rose-600 dark:text-rose-400">
                    <span className="font-semibold pl-4">Less: Sales Returns & Adjustments</span>
                    <span>({Number(reportData.salesReturns).toFixed(2)})</span>
                  </div>

                  <div className="p-4 flex justify-between font-bold text-slate-900 dark:text-slate-100">
                    <span>Net Sales Revenue</span>
                    <span>{Number(reportData.netSales).toFixed(2)}</span>
                  </div>

                  <div className="p-4 flex justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Less: Cost of Goods Sold (COGS)</span>
                    <span>({Number(reportData.cogs).toFixed(2)})</span>
                  </div>

                  <div className="p-4 flex justify-between font-bold text-lg text-slate-900 dark:text-slate-100 bg-slate-50/30 dark:bg-slate-800/10">
                    <span>Gross Profit Margin</span>
                    <span>{Number(reportData.grossProfit).toFixed(2)}</span>
                  </div>

                  <div className="p-4 font-semibold text-slate-500 bg-slate-50/20 dark:bg-slate-900/40">
                    Operating & Administrative Expenses
                  </div>

                  <div className="p-4 flex justify-between pl-8">
                    <span>Salaries & Payroll Expenses</span>
                    <span>{Number(reportData.salaryExpense).toFixed(2)}</span>
                  </div>

                  <div className="p-4 flex justify-between pl-8">
                    <span>Inventory Manual Adjustments (Asset write-off)</span>
                    <span>{Number(reportData.inventoryAdjustments).toFixed(2)}</span>
                  </div>

                  <div className="p-4 flex justify-between font-semibold pl-4 text-slate-900 dark:text-slate-100">
                    <span>Total Operating Expenses</span>
                    <span>{Number(reportData.totalExpenses).toFixed(2)}</span>
                  </div>

                  <div className="p-4 flex justify-between font-black text-xl text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
                    <span>NET AUDITED PROFIT / (LOSS)</span>
                    <span>PKR {Number(reportData.netProfit).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. GENERAL LEDGER VIEW */}
            {reportType === "ledger" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                  <h3 className="text-sm font-black text-slate-850 dark:text-slate-200 uppercase tracking-tight">General Ledger Journal Entries</h3>
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search description, accounts, doc types..."
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 shadow-sm"
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="p-3">Entry Date</th>
                        <th className="p-3">Journal Description</th>
                        <th className="p-3">Debit Account</th>
                        <th className="p-3">Credit Account</th>
                        <th className="p-3 text-right">Amount (PKR)</th>
                        <th className="p-3">Ref Doc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                       {reportData && Array.isArray(reportData) && (reportData as any[])
                        .filter((entry) => {
                          const query = ledgerSearch.toLowerCase();
                          return (
                            (entry.description || "").toLowerCase().includes(query) ||
                            (entry.debitAccount || "").toLowerCase().includes(query) ||
                            (entry.creditAccount || "").toLowerCase().includes(query) ||
                            (entry.referenceType || "").toLowerCase().includes(query) ||
                            (entry.referenceId || "").toLowerCase().includes(query) ||
                            String(entry.amount).includes(query) ||
                            new Date(entry.entryDate).toLocaleDateString().toLowerCase().includes(query)
                          );
                        })
                        .map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-3 whitespace-nowrap">{new Date(entry.entryDate).toLocaleDateString()}</td>
                          <td className="p-3 font-semibold">{entry.description}</td>
                          <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">{entry.debitAccount}</td>
                          <td className="p-3 text-rose-600 dark:text-rose-400 font-medium">{entry.creditAccount}</td>
                          <td className="p-3 text-right font-bold">{Number(entry.amount).toFixed(2)}</td>
                          <td className="p-3 whitespace-nowrap text-slate-400 uppercase text-[10px]">{entry.referenceType} ({entry.referenceId.slice(0, 8)})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. STOCK VALUATION VIEW */}
            {reportType === "valuation" && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center">Inventory Stock Valuation</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="p-3">SKU</th>
                        <th className="p-3">Item Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">On Hand Qty</th>
                        <th className="p-3 text-right">Unit Avg Cost (PKR)</th>
                        <th className="p-3 text-right">Total Asset Value (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {reportData && Array.isArray(reportData.items) && (reportData.items as any[]).map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-3 whitespace-nowrap font-semibold">{prod.sku}</td>
                          <td className="p-3">{prod.name}</td>
                          <td className="p-3">{prod.category}</td>
                          <td className="p-3 text-right font-bold">{prod.onHandQty}</td>
                          <td className="p-3 text-right">{Number(prod.averageCost).toFixed(2)}</td>
                          <td className="p-3 text-right font-extrabold text-blue-600 dark:text-blue-400">{Number(prod.totalValue).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold border-t-2 border-slate-200 dark:border-slate-800">
                        <td className="p-4" colSpan={3}>TOTAL PHYSICAL ASSETS VALUE</td>
                        <td className="p-4 text-right" colSpan={3}>
                          PKR {Number(reportData?.totalValuation || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. AR/AP AGING VIEW */}
            {reportType === "aging" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Accounts Receivable */}
                <div className="space-y-4">
                  <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center">Accounts Receivable (Customer Overdue)</h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                    <div className="p-4 flex justify-between">
                      <span className="font-medium">Current (0 - 30 Days)</span>
                      <span className="font-bold">PKR {Number(reportData.accountsReceivableAging?.current || 0).toFixed(2)}</span>
                    </div>
                    <div className="p-4 flex justify-between">
                      <span className="font-medium">31 - 60 Days</span>
                      <span className="font-bold">PKR {Number(reportData.accountsReceivableAging?.thirty || 0).toFixed(2)}</span>
                    </div>
                    <div className="p-4 flex justify-between">
                      <span className="font-medium">61 - 90 Days</span>
                      <span className="font-bold">PKR {Number(reportData.accountsReceivableAging?.sixty || 0).toFixed(2)}</span>
                    </div>
                    <div className="p-4 flex justify-between text-rose-500 font-bold">
                      <span>90+ Days (Critical)</span>
                      <span>PKR {Number(reportData.accountsReceivableAging?.ninety || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Accounts Payable */}
                <div className="space-y-4">
                  <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center">Accounts Payable (Vendor Overdue)</h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                    <div className="p-4 flex justify-between">
                      <span className="font-medium">Current (0 - 30 Days)</span>
                      <span className="font-bold">PKR {Number(reportData.accountsPayableAging?.current || 0).toFixed(2)}</span>
                    </div>
                    <div className="p-4 flex justify-between">
                      <span className="font-medium">31 - 60 Days</span>
                      <span className="font-bold">PKR {Number(reportData.accountsPayableAging?.thirty || 0).toFixed(2)}</span>
                    </div>
                    <div className="p-4 flex justify-between">
                      <span className="font-medium">61 - 90 Days</span>
                      <span className="font-bold">PKR {Number(reportData.accountsPayableAging?.sixty || 0).toFixed(2)}</span>
                    </div>
                    <div className="p-4 flex justify-between text-rose-500 font-bold">
                      <span>90+ Days (Critical)</span>
                      <span>PKR {Number(reportData.accountsPayableAging?.ninety || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SALES ANALYTICS VIEW */}
            {reportType === "sales" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase">Sales Revenue Breakdown</h3>
                  <p className="text-sm font-extrabold mt-1 text-emerald-500">
                    Total Revenue: PKR {Number(reportData.totalSalesAmount || 0).toFixed(2)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sales by Client */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue by Customer Client</h4>
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 font-bold">
                            <th className="p-3">Client Name</th>
                            <th className="p-3 text-right">Revenue (PKR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {Object.entries(reportData.salesByClient || {}).map(([client, amount]: any) => (
                            <tr key={client} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                              <td className="p-3 font-semibold">{client}</td>
                              <td className="p-3 text-right font-bold">{Number(amount).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sales by Product */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue by Product Item</h4>
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 font-bold">
                            <th className="p-3">SKU / Item</th>
                            <th className="p-3 text-right">Units Sold</th>
                            <th className="p-3 text-right">Revenue (PKR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {Object.entries(reportData.salesByProduct || {}).map(([key, p]: any) => (
                            <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                              <td className="p-3 font-semibold">
                                {key} <span className="block text-[10px] text-slate-500 font-normal">{p.name}</span>
                              </td>
                              <td className="p-3 text-right">{p.quantity}</td>
                              <td className="p-3 text-right font-bold">{Number(p.amount).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
