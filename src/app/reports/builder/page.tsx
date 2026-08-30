"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  Table,
  FileSpreadsheet,
  AlertCircle,
  Hash,
  Coins,
  Filter,
  RefreshCw,
  Search,
  Printer,
  Receipt,
  Package,
  ArrowDownToLine,
  ShoppingCart,
  AlertTriangle,
  Users,
  UserCheck,
  Check,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/shared/ToastProvider";
import { formatDateDisplay } from "@/lib/dateUtils";

interface EntityConfig {
  label: string;
  fields: string[];
}

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  INVOICE: {
    label: "Sales Invoices",
    fields: [
      "invoiceNumber",
      "clientName",
      "clientPhone",
      "clientAddress",
      "date",
      "status",
      "dispatchStatus",
      "totalAmount",
      "amountPaid",
      "isGst",
      "subjectHeading",
      "createdAt",
    ],
  },
  PRODUCT: {
    label: "Stock & Inventory",
    fields: [
      "sku",
      "name",
      "category",
      "unit",
      "onHandQty",
      "stockStatus",
      "primaryVendor",
      "totalPurchasedQty",
      "totalPurchaseCost",
      "lastPurchaseCost",
      "averageCost",
      "totalSoldQty",
      "totalSalesValue",
      "salesPrice",
      "totalValuation",
      "incomingQty",
      "reorderLevel",
      "createdAt",
    ],
  },
  GRN: {
    label: "Stock Receipts & GRNs",
    fields: [
      "grnNumber",
      "poNumber",
      "vendorName",
      "receivedAt",
      "receivedBy",
      "totalUnits",
      "totalValuation",
      "notes",
    ],
  },
  PURCHASE_ORDER: {
    label: "Purchase Orders",
    fields: [
      "poNumber",
      "vendorName",
      "status",
      "totalOrderedQty",
      "totalReceivedQty",
      "discount",
      "totalAmount",
      "notes",
      "createdAt",
    ],
  },
  COMPLAINT: {
    label: "Customer Complaints",
    fields: [
      "complaintNumber",
      "customerName",
      "customerPhone",
      "customerAddress",
      "status",
      "amount",
      "amountStatus",
      "description",
      "remarks",
      "date",
      "createdAt",
    ],
  },
  EMPLOYEE: {
    label: "Human Resources / Staff",
    fields: [
      "name",
      "cnic",
      "phone",
      "department",
      "position",
      "status",
      "baseSalary",
      "joiningDate",
      "createdAt",
    ],
  },
  CUSTOMER: {
    label: "Registered Customers",
    fields: [
      "name",
      "phone",
      "email",
      "address",
      "ntn",
      "cnic",
      "notes",
      "createdAt",
    ],
  },
};

const FIELD_LABELS: Record<string, string> = {
  invoiceNumber: "Invoice #",
  clientName: "Client / Customer",
  clientPhone: "Client Phone",
  clientAddress: "Client Address",
  date: "Date",
  dispatchStatus: "Dispatch Status",
  totalAmount: "Total Amount (PKR)",
  amountPaid: "Amount Paid (PKR)",
  isGst: "Tax / GST",
  subjectHeading: "Subject",
  sku: "SKU Code",
  name: "Product Description",
  category: "Category",
  unit: "Unit",
  onHandQty: "Ready Stock On Hand",
  stockStatus: "Stock Readiness Status",
  primaryVendor: "Purchased From (Supplier)",
  totalPurchasedQty: "Total Purchased Qty",
  totalPurchaseCost: "Total Purchase Cost (PKR)",
  lastPurchaseCost: "Last Purchase Cost (PKR)",
  averageCost: "Avg Unit Cost (PKR)",
  totalSoldQty: "Total Sold Units",
  totalSalesValue: "Total Sales Value (PKR)",
  salesPrice: "Selling Price (PKR)",
  totalValuation: "Ready Stock Valuation (PKR)",
  incomingQty: "Incoming / In-Transit Qty",
  reorderLevel: "Reorder Level",
  grnNumber: "GRN #",
  receivedAt: "Receipt Date",
  receivedBy: "Received By Officer",
  totalUnits: "Total Units Received",
  complaintNumber: "Complaint #",
  customerName: "Customer Name",
  customerPhone: "Phone Number",
  customerAddress: "Site Address",
  status: "Status",
  amount: "Service Fee (PKR)",
  amountStatus: "Payment Status",
  description: "Description",
  remarks: "Remarks",
  poNumber: "PO #",
  vendorName: "Vendor / Supplier",
  totalOrderedQty: "Total Ordered Units",
  totalReceivedQty: "Total Received Units",
  discount: "Discount (PKR)",
  notes: "Notes / Terms",
  cnic: "CNIC / ID",
  phone: "Phone",
  department: "Department",
  position: "Position",
  baseSalary: "Base Salary (PKR)",
  joiningDate: "Joining Date",
  email: "Email Address",
  address: "Address",
  ntn: "NTN Number",
  createdAt: "Created Date",
  updatedAt: "Updated Date",
};

const CURRENCY_FIELDS = new Set([
  "totalAmount",
  "amountPaid",
  "amount",
  "discount",
  "baseSalary",
  "averageCost",
  "salesPrice",
  "totalPurchaseCost",
  "lastPurchaseCost",
  "totalSalesValue",
  "totalValuation",
]);

const DATE_FIELDS = new Set([
  "date",
  "receivedAt",
  "createdAt",
  "updatedAt",
  "joiningDate",
]);

export default function ReportBuilderPage() {
  const { toast } = useToast();
  const [selectedEntity, setSelectedEntity] = useState<string>("INVOICE");
  const [selectedFields, setSelectedFields] = useState<string[]>(ENTITY_CONFIGS.INVOICE.fields);
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sections = [
    { id: "INVOICE", label: "Sales Invoices", icon: Receipt },
    { id: "PRODUCT", label: "Stock & Inventory", icon: Package },
    { id: "GRN", label: "Stock Receipts (GRNs)", icon: ArrowDownToLine },
    { id: "PURCHASE_ORDER", label: "Purchase Orders", icon: ShoppingCart },
    { id: "COMPLAINT", label: "Customer Complaints", icon: AlertTriangle },
    { id: "EMPLOYEE", label: "Human Resources / Staff", icon: Users },
    { id: "CUSTOMER", label: "Registered Customers", icon: UserCheck },
  ];

  const fetchDataForEntity = async (entity: string) => {
    setLoading(true);
    setError(null);
    try {
      const allFields = ENTITY_CONFIGS[entity].fields;
      const res = await fetch("/api/reports/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity,
          fields: allFields,
          filters: [],
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch report data");
      const data = await res.json();
      setResults(data.data || []);
      setSelectedFields(allFields);
      setTableSearch("");
      setSortField(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataForEntity(selectedEntity);
  }, [selectedEntity]);

  const handleHeaderClick = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleField = (field: string) => {
    const allFields = ENTITY_CONFIGS[selectedEntity].fields;
    let nextFields: string[];
    if (selectedFields.includes(field)) {
      if (selectedFields.length > 1) {
        nextFields = selectedFields.filter((f) => f !== field);
      } else {
        toast({ title: "Keep One Column", message: "You must display at least one column.", type: "warning" });
        return;
      }
    } else {
      nextFields = [...selectedFields, field];
    }
    // Sort to maintain original defined order
    nextFields.sort((a, b) => allFields.indexOf(a) - allFields.indexOf(b));
    setSelectedFields(nextFields);
  };

  const showAllFields = () => {
    setSelectedFields(ENTITY_CONFIGS[selectedEntity].fields);
  };

  const hideAllFields = () => {
    setSelectedFields([ENTITY_CONFIGS[selectedEntity].fields[0]]);
  };

  const sortedAndFilteredResults = useMemo(() => {
    if (!results) return [];
    let list = [...results];

    if (tableSearch.trim()) {
      const term = tableSearch.toLowerCase();
      list = list.filter((row) =>
        selectedFields.some((field) => {
          const val = row[field];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(term);
        })
      );
    }

    if (sortField) {
      list.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }
        return sortDirection === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return list;
  }, [results, tableSearch, selectedFields, sortField, sortDirection]);

  const totalAmountSum = useMemo(() => {
    return sortedAndFilteredResults.reduce((acc, row) => {
      const sumField = selectedFields.find((f) => f === "totalValuation" || f === "totalAmount" || f === "amount" || f === "salesPrice");
      return sumField && row[sumField] ? acc + Number(row[sumField]) : acc;
    }, 0);
  }, [sortedAndFilteredResults, selectedFields]);

  const exportToExcel = () => {
    if (sortedAndFilteredResults.length === 0) return;
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `TCE_Report_${selectedEntity.toLowerCase()}_${dateStr}`;

    const exportRows = sortedAndFilteredResults.map((row) => {
      const formattedRow: Record<string, any> = {};
      selectedFields.forEach((field) => {
        const headerName = FIELD_LABELS[field] || field;
        const val = row[field];
        if (typeof val === "boolean") {
          formattedRow[headerName] = val ? "Yes" : "No";
        } else if (DATE_FIELDS.has(field) && val) {
          formattedRow[headerName] = formatDateDisplay(val, "en-GB");
        } else if (CURRENCY_FIELDS.has(field) && val !== null && val !== undefined) {
          formattedRow[headerName] = Math.round(Number(val));
        } else {
          formattedRow[headerName] = val !== null && val !== undefined ? String(val) : "";
        }
      });
      return formattedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Report");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    toast({ title: "Excel Ready", message: `Exported ${exportRows.length} rows to Excel.`, type: "success" });
  };

  const renderCellContent = (row: any, field: string) => {
    const val = row[field];
    if (val === null || val === undefined) return <span className="text-slate-400">-</span>;

    if (typeof val === "boolean" || field === "isGst") {
      const isTrue = Boolean(val);
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
            isTrue
              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
          }`}
        >
          {field === "isGst" ? (isTrue ? "GST (18%)" : "Non-GST") : (isTrue ? "Yes" : "No")}
        </span>
      );
    }

    if (field === "status" || field === "amountStatus" || field === "dispatchStatus") {
      const s = String(val).toUpperCase();
      let colorClass = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      if (s === "PAID" || s === "RESOLVED" || s === "COMPLETED" || s === "DELIVERED" || s === "ACTIVE" || s === "ACCEPTED") {
        colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
      } else if (s === "UNPAID" || s === "REJECTED" || s === "CANCELLED" || s === "CLOSED") {
        colorClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
      } else if (s === "OPEN" || s === "PENDING" || s === "DRAFT" || s === "PARTIALLY_PAID" || s === "PENDING_DISPATCH") {
        colorClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
      } else if (s === "IN_PROGRESS" || s === "DISPATCHED" || s === "SUBMITTED" || s === "SENT") {
        colorClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800";
      }
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${colorClass}`}>
          {s}
        </span>
      );
    }

    if (field === "stockStatus") {
      const s = String(val);
      let colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
      if (s.includes("Out of Stock")) {
        colorClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
      } else if (s.includes("Low Stock")) {
        colorClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
      }
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${colorClass}`}>
          {s}
        </span>
      );
    }

    if (field === "onHandQty") {
      const qty = Number(val || 0);
      return (
        <span className={`font-mono font-bold ${qty > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
          {qty.toLocaleString()}
        </span>
      );
    }

    if (field === "primaryVendor" || field === "vendorName") {
      return (
        <span className="font-semibold text-slate-900 dark:text-white">
          {String(val)}
        </span>
      );
    }

    if (CURRENCY_FIELDS.has(field)) {
      const num = Number(val);
      if (isNaN(num)) return <span>{String(val)}</span>;
      return <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">PKR {Math.round(num).toLocaleString("en-US")}</span>;
    }

    if (DATE_FIELDS.has(field)) {
      return <span className="text-slate-600 dark:text-slate-300">{formatDateDisplay(val, "en-GB")}</span>;
    }

    return <span className="text-slate-700 dark:text-slate-200">{String(val)}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Official TCE Branded Print Header (Visible ONLY on print) */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black tracking-wide text-slate-900">THERMOTECH CONSULTING ENGINEERS (TCE)</h1>
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-0.5">
              HVAC System Design, Supply & Contracting Services
            </p>
            <p className="text-[9px] text-slate-500 mt-1">
              Head Office: Multan, Pakistan | Contact: +92-321-8304978 | Web: www.tcehvac.com
            </p>
          </div>
          <div className="text-right">
            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded text-[9px] font-black uppercase">
              System Audit Report
            </span>
            <p className="text-[9px] text-slate-500 mt-2">
              Generated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-700">
          <span>Data Source: {ENTITY_CONFIGS[selectedEntity]?.label}</span>
          <span>Total Records: {sortedAndFilteredResults.length}</span>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Custom Report Builder</h1>
            <p className="text-xs text-slate-500">Instant database explorer with interactive excel-like table, filters and exports</p>
          </div>
        </div>
      </div>

      {/* 1. SECTIONS / TABS (Instant Load) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 no-print">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Report Section</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = selectedEntity === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setSelectedEntity(sec.id)}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                }`}
              >
                <Icon className="w-5 h-5 mb-1.5 shrink-0" />
                <span className="text-[11px] font-bold tracking-tight line-clamp-1">{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. VISIBLE COLUMNS TOGGLERS */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 no-print">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visible Columns (Show / Hide)</h3>
          <div className="flex items-center gap-3 text-xs font-semibold text-violet-600 dark:text-violet-400">
            <button onClick={showAllFields} className="hover:underline">Show All</button>
            <span className="text-slate-300">|</span>
            <button onClick={hideAllFields} className="hover:underline">Hide All</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ENTITY_CONFIGS[selectedEntity]?.fields.map((f) => {
            const isVisible = selectedFields.includes(f);
            return (
              <button
                key={f}
                onClick={() => toggleField(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isVisible
                    ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300"
                    : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/30 dark:border-slate-800 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                {isVisible && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                {FIELD_LABELS[f] || f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state / Errors */}
      {loading && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 no-print">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-violet-600" />
          <p className="text-xs font-bold text-slate-500">Loading custom report data...</p>
        </div>
      )}

      {error && (
        <div className="p-6 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-xs text-center no-print">
          {error}
        </div>
      )}

      {/* Results Table & KPI Summary */}
      {!loading && !error && results !== null && (
        <div className="space-y-4">
          {/* Quick KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 no-print">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-violet-50 dark:bg-violet-950/50 text-violet-600 rounded-lg">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Records Found</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{sortedAndFilteredResults.length}</div>
              </div>
            </div>

            {totalAmountSum > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Amount Sum</div>
                  <div className="text-sm font-bold text-emerald-600 font-mono">PKR {Math.round(totalAmountSum).toLocaleString("en-US")}</div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-lg">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Displayed Columns</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedFields.length} of {ENTITY_CONFIGS[selectedEntity]?.fields.length} Fields
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40 no-print">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Table className="w-4 h-4 text-violet-500" />
                {ENTITY_CONFIGS[selectedEntity]?.label} Results ({sortedAndFilteredResults.length} records)
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter visible results..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors shadow-2xs"
                  title="Export to Excel Spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:border-violet-400 transition-colors shadow-2xs print-include"
                  title="Print Report or Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5" /> Print PDF
                </button>
              </div>
            </div>

            {/* Grid Table */}
            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 border-collapse border-b border-slate-200 dark:border-slate-800">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold sticky top-0 shadow-2xs z-10">
                  <tr>
                    {selectedFields.map((f) => {
                      const isSorted = sortField === f;
                      return (
                        <th
                          key={f}
                          onClick={() => handleHeaderClick(f)}
                          className="p-3 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                          title="Click to sort by this column"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{FIELD_LABELS[f] || f}</span>
                            {isSorted && (
                              <span className="text-[10px] text-violet-600 dark:text-violet-400">
                                {sortDirection === "asc" ? "▲" : "▼"}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedAndFilteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={selectedFields.length} className="p-8 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-6 h-6 text-slate-400" />
                          <span>No records matched your filter criteria.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedAndFilteredResults.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        {selectedFields.map((f) => (
                          <td key={f} className="p-3 whitespace-nowrap border-r border-slate-100/50 dark:border-slate-800/30 last:border-0">
                            {renderCellContent(row, f)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
