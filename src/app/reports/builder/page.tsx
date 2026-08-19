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
} from "lucide-react";
import * as XLSX from "xlsx";
import { convertToCSV } from "@/lib/export";
import { useToast } from "@/components/shared/ToastProvider";

const ENTITY_CONFIGS: Record<string, { label: string; fields: string[] }> = {
  INVOICE: {
    label: "Sales Invoices",
    fields: ["invoiceNumber", "clientName", "clientPhone", "date", "status", "totalAmount", "amountPaid", "isGst"],
  },
  PRODUCT: {
    label: "Inventory / Stock",
    fields: ["sku", "name", "category", "unit", "quantity", "averageCost", "salesPrice", "reorderLevel"],
  },
  COMPLAINT: {
    label: "Customer Complaints",
    fields: ["complaintNumber", "customerName", "customerPhone", "customerAddress", "status", "amount", "amountStatus"],
  },
  PURCHASE_ORDER: {
    label: "Purchase Orders",
    fields: ["poNumber", "vendorId", "status", "totalAmount", "poDate", "deliveryDate"],
  },
};

export default function ReportBuilderPage() {
  const { toast } = useToast();
  const [selectedEntity, setSelectedEntity] = useState<string>("INVOICE");
  const [selectedFields, setSelectedFields] = useState<string[]>(ENTITY_CONFIGS.INVOICE.fields);
  const [filters, setFilters] = useState<Array<{ field: string; operator: string; value: string }>>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateTitle, setTemplateTitle] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/reports/templates");
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEntityChange = (entity: string) => {
    setSelectedEntity(entity);
    setSelectedFields(ENTITY_CONFIGS[entity]?.fields || []);
    setFilters([]);
    setResults([]);
  };

  const addFilter = () => {
    const defaultField = ENTITY_CONFIGS[selectedEntity]?.fields[0] || "";
    setFilters([...filters, { field: defaultField, operator: "EQUALS", value: "" }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, idx) => idx !== index));
  };

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      if (selectedFields.length > 1) {
        setSelectedFields(selectedFields.filter((f) => f !== field));
      }
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const runReport = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: selectedEntity,
          fields: selectedFields,
          filters: filters.filter((f) => f.value.trim() !== ""),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setResults(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!templateTitle.trim()) {
      toast({ title: "Title Required", message: "Please enter a template title.", type: "warning" });
      return;
    }

    try {
      const res = await fetch("/api/reports/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: templateTitle,
          entity: selectedEntity,
          config: {
            fields: selectedFields,
            filters: filters.filter((f) => f.value.trim() !== ""),
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast({ title: "Template Saved", message: `Report template "${templateTitle}" saved.`, type: "success" });
        setTemplateTitle("");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchTemplates();
      }
    } catch (e: any) {
      toast({ title: "Save Failed", message: e.message, type: "error" });
    }
  };

  const loadTemplate = (tmpl: any) => {
    try {
      const cfg = JSON.parse(tmpl.config);
      setSelectedEntity(tmpl.entity);
      setSelectedFields(cfg.fields || ENTITY_CONFIGS[tmpl.entity]?.fields || []);
      setFilters(cfg.filters || []);
    } catch (e) {
      console.error(e);
    }
  };

  const exportCurrentData = (format: "EXCEL" | "CSV") => {
    if (!results || results.length === 0) return;
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `custom_report_${selectedEntity.toLowerCase()}_${dateStr}`;

    if (format === "CSV") {
      const csv = convertToCSV(results);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
    } else {
      const worksheet = XLSX.utils.json_to_sheet(results);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Report");
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    }
  };

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
                  onClick={() => setSelectedEntity(key)}
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
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              2. Visible Columns (Fields)
            </label>
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
                    {f}
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
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={flt.field}
                      onChange={(e) => {
                        const next = [...filters];
                        next[idx].field = e.target.value;
                        setFilters(next);
                      }}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs"
                    >
                      {ENTITY_CONFIGS[selectedEntity]?.fields.map((f) => (
                        <option key={f} value={f}>
                          {f}
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
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs"
                    >
                      <option value="EQUALS">Equals</option>
                      <option value="CONTAINS">Contains</option>
                      <option value="GREATER_THAN">&gt; Greater Than</option>
                      <option value="LESS_THAN">&lt; Less Than</option>
                    </select>

                    <input
                      type="text"
                      value={flt.value}
                      placeholder="Value"
                      onChange={(e) => {
                        const next = [...filters];
                        next[idx].value = e.target.value;
                        setFilters(next);
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs"
                    />

                    <button
                      onClick={() => removeFilter(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
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
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save Preset
              </button>
              {saveSuccess && <span className="text-xs text-emerald-500 font-medium">Saved!</span>}
            </div>

            <button
              onClick={runReport}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-95 shadow-md transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
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

            <div className="space-y-2 mt-4">
              {templates.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No saved presets yet.</p>
              ) : (
                templates.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => loadTemplate(t)}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-400 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{t.title}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{t.entity}</span>
                    </div>
                    <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">Load</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      {results && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs mt-6">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Table className="w-4 h-4 text-violet-500" />
              Report Results ({results.length} records found)
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold sticky top-0">
                <tr>
                  {selectedFields.map((f) => (
                    <th key={f} className="p-3 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={selectedFields.length} className="p-8 text-center text-slate-400">
                      No records matched your filter criteria.
                    </td>
                  </tr>
                ) : (
                  results.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      {selectedFields.map((f) => (
                        <td key={f} className="p-3 whitespace-nowrap">
                          {typeof row[f] === "boolean"
                            ? row[f] ? "Yes" : "No"
                            : row[f] !== null && row[f] !== undefined
                            ? String(row[f])
                            : "-"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
