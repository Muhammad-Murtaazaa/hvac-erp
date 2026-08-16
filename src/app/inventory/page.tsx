"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Plus, ClipboardCheck, ArrowUpRight, ArrowDownRight, Layers, Eye } from "lucide-react";
import SearchFilter from "@/components/shared/SearchFilter";
import SkeletonTable from "@/components/shared/SkeletonTable";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { useToast } from "@/components/shared/ToastProvider";
import { createPortal } from "react-dom";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search/Filter states
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  // Audit Dialog state
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [adjustedQty, setAdjustedQty] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // New Catalog Product states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("Nos");
  const [newReorderLevel, setNewReorderLevel] = useState("5");
  const [newAvgCost, setNewAvgCost] = useState("0");

  const [activeTab, setActiveTab] = useState("catalog"); // catalog, audit_logs

  const { toast } = useToast();
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const handleBulkExport = () => {
    const selected = products.filter((p) => selectedProductIds.includes(p.id));
    if (selected.length === 0) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["SKU,Product Name,Category,Unit,On Hand Qty,Incoming Qty,Avg Cost,Sales Price,Reorder Level"]
        .concat(
          selected.map(
            (p) =>
              `"${p.sku}","${p.name}","${p.category}","${p.unit}",${p.onHandQty},${p.incomingQty},${p.averageCost},${p.salesPrice || 0},${p.reorderLevel}`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Selected_Products_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", message: `Exported ${selected.length} items to CSV.`, type: "info" });
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedProductIds.length} selected product(s)?`)) return;

    try {
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_PRODUCTS",
          ids: selectedProductIds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Products Deleted", message: json.message, type: "success" });
        setSelectedProductIds([]);
        fetchData();
      } else {
        toast({ title: "Delete Failed", message: json.error, type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", message: e.message, type: "error" });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      // Fetch Products
      const prodRes = await fetch("/api/inventory/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!prodRes.ok) throw new Error("Failed to load products");
      const prodData = await prodRes.json();
      setProducts(prodData.products || []);

      // Fetch Adjustments
      const adjRes = await fetch("/api/inventory/adjust", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (adjRes.ok) {
        const adjData = await adjRes.json();
        setAdjustments(adjData.adjustments || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchData();
    setMounted(true);
  }, []);

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !adjustedQty || parseInt(adjustedQty) === 0) {
      alert("Please select a product and enter a non-zero quantity.");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: selectedProductId,
          adjustedQty: parseInt(adjustedQty),
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit adjustment");

      alert("Physical stock audit logged and ledger adjusted successfully.");
      setIsAuditOpen(false);
      setSelectedProductId("");
      setAdjustedQty("");
      setReason("");
      fetchData(); // reload data
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku || !newName || !newCategory || !newUnit || !newReorderLevel) {
      alert("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/inventory/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sku: newSku,
          name: newName,
          category: newCategory,
          unit: newUnit,
          reorderLevel: parseInt(newReorderLevel),
          averageCost: Number(newAvgCost) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");

      alert("Product onboarded successfully in HVAC catalog.");
      setIsCreateOpen(false);
      setNewSku("");
      setNewName("");
      setNewCategory("");
      setNewUnit("Nos");
      setNewReorderLevel("5");
      setNewAvgCost("0");
      fetchData(); // reload data
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products locally
  const filteredProducts = products.filter((p) => {
    const matchesText =
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "" || p.category === category;
    return matchesText && matchesCategory;
  });

  // Filter adjustments locally
  const filteredAdjustments = adjustments.filter((adj) => {
    const matchesText =
      adj.product.sku.toLowerCase().includes(search.toLowerCase()) ||
      adj.product.name.toLowerCase().includes(search.toLowerCase()) ||
      adj.user.name.toLowerCase().includes(search.toLowerCase()) ||
      (adj.reason || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "" || adj.product.category === category;
    return matchesText && matchesCategory;
  });

  // Extract unique categories for dropdown filter
  const categories = Array.from(new Set(products.map((p) => p.category))).map((c) => ({
    label: c,
    value: c,
  }));

  const lowStockProducts = products.filter((p) => p.onHandQty <= p.reorderLevel);

  return (
    <div className="space-y-6">
      {/* 1. Low Stock Alert Banner */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-4 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <h4 className="font-bold text-sm">Low Stock Alert!</h4>
            <p className="text-xs mt-0.5">
              The following catalog items are running below reorder limits:{" "}
              {lowStockProducts.map((p) => `${p.sku} (${p.onHandQty} left)`).join(", ")}.
            </p>
          </div>
        </div>
      )}

      {/* 2. Selection Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">HVAC Catalog & Inventory</h2>
            <p className="text-xs text-slate-500 mt-1">Audit physical stock counts, log ledger asset variances, and track alerts</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
            >
              <Plus className="w-4 h-4" />
              Add Product Item
            </button>
            <button
              onClick={() => setIsAuditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10"
            >
              <ClipboardCheck className="w-4 h-4" />
              Manual Stock Audit
            </button>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/80 gap-1 pt-4">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "catalog"
                ? "border-blue-500 text-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-500"
            }`}
          >
            Product Catalog ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("audit_logs")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "audit_logs"
                ? "border-blue-500 text-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-500"
            }`}
          >
            Physical Audit Logs ({adjustments.length})
          </button>
        </div>
      </div>

      {/* Search and filter row */}
      <SearchFilter
        placeholder={activeTab === "catalog" ? "Search products by SKU, name, or category..." : "Search audit logs by SKU, name, auditor, or reason..."}
        search={search}
        onSearchChange={setSearch}
        status={category}
        onStatusChange={setCategory}
        statusOptions={categories}
      />

      {loading ? (
        <SkeletonTable rows={7} columns={7} />
      ) : error ? (
        <div className="p-8 text-center text-rose-500 font-bold">{error}</div>
      ) : activeTab === "catalog" ? (
        /* ==================== PRODUCT CATALOG TAB ==================== */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3 text-center w-8">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductIds(filteredProducts.map((p) => p.id));
                          } else {
                            setSelectedProductIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3 text-right font-bold">On Hand Qty</th>
                    <th className="p-3 text-right">Incoming Qty</th>
                    <th className="p-3 text-right">Avg Cost (PKR)</th>
                    <th className="p-3 text-right">Reorder Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredProducts.map((p) => {
                    const isLow = p.onHandQty <= p.reorderLevel;
                    const isSelected = selectedProductIds.includes(p.id);

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors ${
                          isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds((prev) => [...prev, p.id]);
                              } else {
                                setSelectedProductIds((prev) => prev.filter((id) => id !== p.id));
                              }
                            }}
                          />
                        </td>
                        <td className="p-3 font-bold whitespace-nowrap">{p.sku}</td>
                        <td className="p-3 font-semibold">{p.name}</td>
                        <td className="p-3">{p.category}</td>
                        <td className="p-3 text-slate-500">{p.unit}</td>
                        <td className={`p-3 text-right font-extrabold text-sm ${isLow ? "text-amber-500" : ""}`}>
                          {p.onHandQty}
                          {isLow && (
                            <span className="inline-block ml-1 text-[10px] bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded font-bold uppercase">
                              Low
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right text-blue-500 font-medium">{p.incomingQty}</td>
                        <td className="p-3 text-right font-semibold">{Number(p.averageCost).toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-400 font-semibold">{p.reorderLevel}</td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No catalog products match the active query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Bulk Action Bar for Inventory */}
          <BulkActionBar
            selectedCount={selectedProductIds.length}
            onClear={() => setSelectedProductIds([])}
            onBulkExport={handleBulkExport}
            onBulkDelete={handleBulkDelete}
          />
        </div>
      ) : (
        /* ==================== AUDIT LOGS TAB ==================== */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                  <th className="p-3">Audit Date</th>
                  <th className="p-3">Auditor</th>
                  <th className="p-3">Product SKU / Name</th>
                  <th className="p-3 text-right">Adjustment Qty</th>
                  <th className="p-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredAdjustments.map((adj) => {
                  const isUp = adj.adjustedQty > 0;
                  return (
                    <tr key={adj.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                      <td className="p-3 whitespace-nowrap">{new Date(adj.createdAt).toLocaleString()}</td>
                      <td className="p-3 font-semibold">{adj.user.name}</td>
                      <td className="p-3">
                        <span className="font-bold">{adj.product.sku}</span>
                        <span className="block text-[10px] text-slate-500">{adj.product.name}</span>
                      </td>
                      <td className={`p-3 text-right font-extrabold flex items-center justify-end gap-1 ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
                        {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {isUp ? `+${adj.adjustedQty}` : adj.adjustedQty}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{adj.reason}</td>
                    </tr>
                  );
                })}
                {filteredAdjustments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No manual stock adjustments match the active query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== AUDIT STOCK DIALOG ==================== */}
      {mounted && isAuditOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Physical Stock Audit</h3>
              <button
                type="button"
                onClick={() => setIsAuditOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Manually adjust inventory counts. This updates physical on-hand stocks and posts balancing entries to the ledger.
            </p>

            <form onSubmit={handleAuditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Catalog Product</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Choose item...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} (Current: {p.onHandQty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Adjustment Quantity</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. +5 or -3"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={adjustedQty}
                  onChange={(e) => setAdjustedQty(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Audit Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Broken packaging write-off, or physical recount addition"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAuditOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl text-xs font-bold transition-all"
                >
                  {submitting ? "Submitting..." : "Submit Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== ADD PRODUCT ITEM DIALOG ==================== */}
      {mounted && isCreateOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Onboard New Product Item</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Create a new catalog item in the database. You can define its SKU, categories, default unit, and reorder levels.
            </p>

            <form onSubmit={handleCreateProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Product SKU / Code (Unique)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COMP-ZR61-TFD"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Product / Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Copeland Scroll Compressor 5HP"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Compressors, Pipes, Valves"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Stocking Unit</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                  >
                    <option value="Nos">Nos (Number / Item)</option>
                    <option value="Mtr">Mtr (Meter)</option>
                    <option value="Coil">Coil (Roll / Cable)</option>
                    <option value="Kg">Kg (Kilogram)</option>
                    <option value="Ltr">Ltr (Liter)</option>
                    <option value="Box">Box (Pack)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reorder Level (Alert Limit)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={newReorderLevel}
                    onChange={(e) => setNewReorderLevel(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Initial Unit Cost / Price (PKR)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  value={newAvgCost}
                  onChange={(e) => setNewAvgCost(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
                >
                  {submitting ? "Onboarding..." : "Onboard Item"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
