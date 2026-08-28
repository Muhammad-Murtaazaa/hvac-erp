"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  Play,
  Save,
  Download,
  Plus,
  Trash2,
  Table,
  CheckCircle2,
  Layers,
  FileSpreadsheet,
  CheckSquare,
  Square,
  AlertCircle,
  Hash,
  Coins,
  Filter,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { convertToCSV } from "@/lib/export";
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
    label: "Inventory / Stock",
    fields: [
      "sku",
      "name",
      "category",
      "unit",
      "onHandQty",
      "incomingQty",
      "reorderLevel",
      "averageCost",
      "salesPrice",
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
  PURCHASE_ORDER: {
    label: "Purchase Orders",
    fields: [
      "poNumber",
      "status",
      "discount",
      "totalAmount",
      "notes",
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
  // Invoice
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
  // Product
  sku: "SKU Code",
  name: "Item / Name",
  category: "Category",
  unit: "Unit",
  onHandQty: "Stock On Hand",
  incomingQty: "Incoming Qty",
  reorderLevel: "Reorder Level",
  averageCost: "Avg Cost (PKR)",
  salesPrice: "Sales Price (PKR)",
  // Complaint
  complaintNumber: "Complaint #",
  customerName: "Customer Name",
  customerPhone: "Phone Number",
  customerAddress: "Site Address",
  status: "Status",
  amount: "Service Fee (PKR)",
  amountStatus: "Payment Status",
  description: "Description",
  remarks: "Remarks",
  // Purchase Order
  poNumber: "PO #",
  discount: "Discount (PKR)",
  notes: "Notes / Terms",
  // Employee
  cnic: "CNIC / ID",
  phone: "Phone",
  department: "Department",
  position: "Position",
  baseSalary: "Base Salary (PKR)",
  joiningDate: "Joining Date",
  // Customer
  email: "Email Address",
  address: "Address",
  ntn: "NTN Number",
  // Shared
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
]);

const DATE_FIELDS = new Set([
  "date",
  "createdAt",
  "updatedAt",
  "joiningDate",
]);

export default function ReportBuilderPage() {
  const { toast } = useToast();
  const [selectedEntity, setSelectedEntity] = useState<string>("INVOICE");
  const [selectedFields, setSelectedFields] = useState<string[]>(ENTITY_CONFIGS.INVOICE.fields);
  const [filters, setFilters] = useState<Array<{ field: string; operator: string; value: string; secondValue?: string }>>([]);
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateTitle, setTemplateTitle] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    try {
      const res = await fetch("/api/reports/templates", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTemplates(json.data);
      }
    } catch (e) {
      console.error("Failed to load templates:", e);
    }
  };

  const handleEntityChange = (entity: string) => {
    setSelectedEntity(entity);
    setSelectedFields(ENTITY_CONFIGS[entity]?.fields || []);
    setFilters([]);
    setResults(null);
  };

  const selectAllFields = () => {
    setSelectedFields(ENTITY_CONFIGS[selectedEntity]?.fields || []);
  };

  const clearAllFields = () => {
    const all = ENTITY_CONFIGS[selectedEntity]?.fields || [];
    setSelectedFields(all.slice(0, 1));
  };

  const addFilter = () => {
    const defaultField = ENTITY_CONFIGS[selectedEntity]?.fields[0] || "";
    setFilters([...filters, { field: defaultField, operator: "EQUALS", value: "", secondValue: "" }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, idx) => idx !== index));
  };

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      if (selectedFields.length > 1) {
        setSelectedFields(selectedFields.filter((f) => f !== field));
      } else {
        toast({ title: "Column Required", message: "At least one column must remain visible.", type: "warning" });
      }
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const runReport = async () => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    try {
      const cleanFilters = filters
        .filter((f) => f.value && f.value.trim() !== "")
        .map((f) => ({
          field: f.field,
          operator: f.operator,
          value: f.value.trim(),
          secondValue: f.secondValue ? f.secondValue.trim() : undefined,
        }));

      const res = await fetch("/api/reports/builder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          entity: selectedEntity,
          fields: selectedFields,
          filters: cleanFilters,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to compile custom report query.");
      }

      setResults(json.data || []);
      toast({
        title: "Report Generated",
        message: `Loaded ${json.data ? json.data.length : 0} matching records.`,
        type: "success",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Query Execution Failed",
        message: e.message || "An unexpected error occurred while executing the query.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!templateTitle.trim()) {
      toast({ title: "Title Required", message: "Please enter a preset title.", type: "warning" });
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    try {
      const res = await fetch("/api/reports/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: templateTitle.trim(),
          entity: selectedEntity,
          config: {
            fields: selectedFields,
            filters: filters.filter((f) => f.value && f.value.trim() !== ""),
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save preset");
      }

      toast({ title: "Preset Saved", message: `Report preset "${templateTitle}" saved.`, type: "success" });
      setTemplateTitle("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchTemplates();
    } catch (e: any) {
      toast({ title: "Save Failed", message: e.message, type: "error" });
    }
  };

  const deleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    try {
      const res = await fetch(`/api/reports/templates?id=${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Preset Removed", message: "Preset deleted successfully.", type: "info" });
        fetchTemplates();
      }
    } catch (err: any) {
      toast({ title: "Delete Failed", message: err.message, type: "error" });
    }
  };

  const loadTemplate = (tmpl: any) => {
    try {
      const cfg = typeof tmpl.config === "string" ? JSON.parse(tmpl.config) : tmpl.config;
      const entity = tmpl.entity.toUpperCase();
      if (ENTITY_CONFIGS[entity]) {
        setSelectedEntity(entity);
        const validFields = (cfg.fields || []).filter((f: string) => ENTITY_CONFIGS[entity].fields.includes(f));
        setSelectedFields(validFields.length > 0 ? validFields : ENTITY_CONFIGS[entity].fields);
        setFilters(cfg.filters || []);
        setResults(null);
        toast({ title: "Preset Loaded", message: `Applied configuration from "${tmpl.title}". Click Execute to run.`, type: "info" });
      }
    } catch (e) {
      console.error("Failed to load preset:", e);
      toast({ title: "Load Error", message: "Preset format is invalid.", type: "error" });
    }
  };

  const exportCurrentData = (format: "EXCEL" | "CSV") => {
    if (!results || results.length === 0) {
      toast({ title: "No Data", message: "Please execute the report before exporting.", type: "warning" });
      return;
    }
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Report_${selectedEntity.toLowerCase()}_${dateStr}`;

    // Map rows with human-readable headers
    const exportRows = results.map((row) => {
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

    if (format === "CSV") {
      const csv = convertToCSV(exportRows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export Started", message: `Exported ${exportRows.length} rows to CSV.`, type: "success" });
    } else {
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Report");
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast({ title: "Excel Ready", message: `Exported ${exportRows.length} rows to Excel.`, type: "success" });
    }
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

  // Compute live summary KPI
  const totalAmountSum = results
    ? results.reduce((acc, row) => {
        const sumField = selectedFields.find((f) => f === "totalAmount" || f === "amount" || f === "salesPrice");
        return sumField && row[sumField] ? acc + Number(row[sumField]) : acc;
      }, 0)
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Custom Report Builder</h1>
            <p className="text-xs text-slate-500">Visual query composer with multi-field filtering and one-click Excel export</p>
          </div>
        </div>

        {results && results.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCurrentData("CSV")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:border-violet-400 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => exportCurrentData("EXCEL")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>
        )}
      </div>

      {/* Builder Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Query Config */}
        <div className="lg:col-span-2 space-y-5">
          {/* Step 1: Base Entity */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              1. Select Data Source
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.keys(ENTITY_CONFIGS).map((key) => (
                <button
                  key={key}
                  onClick={() => handleEntityChange(key)}
                  className={`p-3 text-left rounded-xl border text-xs font-medium transition-all ${
                    selectedEntity === key
                      ? "border-violet-600 bg-violet-50/50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 font-semibold shadow-xs"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {ENTITY_CONFIGS[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Choose Columns */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                2. Visible Columns (Fields)
              </label>
              <div className="flex items-center gap-3 text-xs">
                <button
                  onClick={selectAllFields}
                  className="flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:underline font-semibold"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Select All
                </button>
                <button
                  onClick={clearAllFields}
                  className="flex items-center gap-1 text-slate-500 hover:underline"
                >
                  <Square className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ENTITY_CONFIGS[selectedEntity]?.fields.map((f) => {
                const active = selectedFields.includes(f);
                return (
                  <button
                    key={f}
                    onClick={() => toggleField(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {FIELD_LABELS[f] || f}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Filters */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                3. Query Filters (Optional)
              </label>
              <button
                onClick={addFilter}
                className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add Filter
              </button>
            </div>

            {filters.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No filters added. The report will return all recent records.</p>
            ) : (
              <div className="space-y-2">
                {filters.map((flt, idx) => (
                  <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <select
                      value={flt.field}
                      onChange={(e) => {
                        const next = [...filters];
                        next[idx].field = e.target.value;
                        setFilters(next);
                      }}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium"
                    >
                      {ENTITY_CONFIGS[selectedEntity]?.fields.map((f) => (
                        <option key={f} value={f}>
                          {FIELD_LABELS[f] || f}
                        </option>
                      ))}
                    </select>

                    <select
                      value={flt.operator}
                      onChange={(e) => {
                        const next = [...filters];
                        next[idx].operator = e.target.value;
                        setFilters(next);
                      }}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium"
                    >
                      <option value="EQUALS">Equals</option>
                      <option value="CONTAINS">Contains</option>
                      <option value="GREATER_THAN">&gt;= Greater / On or After</option>
                      <option value="LESS_THAN">&lt;= Less / On or Before</option>
                      <option value="BETWEEN">Between</option>
                    </select>

                    {flt.field === "isGst" ? (
                      <select
                        value={flt.value}
                        onChange={(e) => {
                          const next = [...filters];
                          next[idx].value = e.target.value;
                          setFilters(next);
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs"
                      >
                        <option value="">-- Choose --</option>
                        <option value="true">GST (Taxable)</option>
                        <option value="false">Non-GST</option>
                      </select>
                    ) : (
                      <input
                        type={DATE_FIELDS.has(flt.field) ? "date" : "text"}
                        value={flt.value}
                        placeholder={DATE_FIELDS.has(flt.field) ? "Date" : "Filter Value"}
                        onChange={(e) => {
                          const next = [...filters];
                          next[idx].value = e.target.value;
                          setFilters(next);
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs"
                      />
                    )}

                    {flt.operator === "BETWEEN" && (
                      <input
                        type={DATE_FIELDS.has(flt.field) ? "date" : "text"}
                        value={flt.secondValue || ""}
                        placeholder={DATE_FIELDS.has(flt.field) ? "To Date" : "To Value"}
                        onChange={(e) => {
                          const next = [...filters];
                          next[idx].secondValue = e.target.value;
                          setFilters(next);
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs"
                      />
                    )}

                    <button
                      onClick={() => removeFilter(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                      title="Remove Filter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Run & Save Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Preset Name (e.g. Unpaid Invoices)"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white"
              />
              <button
                onClick={saveTemplate}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" /> Save Preset
              </button>
              {saveSuccess && <span className="text-xs text-emerald-500 font-medium">Saved!</span>}
            </div>

            <button
              onClick={runReport}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-95 shadow-md transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              {loading ? "Compiling Query..." : "Execute Report"}
            </button>
          </div>
        </div>

        {/* Right Col: Saved Presets */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs h-full">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Layers className="w-4 h-4 text-violet-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Saved Report Presets
              </h3>
            </div>

            <div className="space-y-2 mt-4 max-h-[350px] overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No saved presets yet.</p>
              ) : (
                templates.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => loadTemplate(t)}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-400 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{t.title}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{t.entity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">Load</span>
                      <button
                        onClick={(e) => deleteTemplate(t.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-opacity"
                        title="Delete Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Table & KPI Summary */}
      {results !== null && (
        <div className="space-y-3 mt-6">
          {/* Quick KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-violet-50 dark:bg-violet-950/50 text-violet-600 rounded-lg">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Records Found</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{results.length}</div>
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
                <div className="text-[10px] font-bold text-slate-400 uppercase">Columns / Filters</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedFields.length} Cols / {filters.filter((f) => f.value.trim() !== "").length} Filters
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Table className="w-4 h-4 text-violet-500" />
                Report Results ({results.length} records found)
              </div>
            </div>

            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold sticky top-0 shadow-2xs z-10">
                  <tr>
                    {selectedFields.map((f) => (
                      <th key={f} className="p-3 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                        {FIELD_LABELS[f] || f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={selectedFields.length} className="p-8 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-6 h-6 text-slate-400" />
                          <span>No records matched your filter criteria.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    results.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        {selectedFields.map((f) => (
                          <td key={f} className="p-3 whitespace-nowrap">
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
