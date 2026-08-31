"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Plus, Edit2, Trash2 } from "lucide-react";
import SearchFilter from "@/components/shared/SearchFilter";
import SkeletonTable from "@/components/shared/SkeletonTable";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { useToast } from "@/components/shared/ToastProvider";
import { createPortal } from "react-dom";

const DEFAULT_STOCKING_UNITS = [
  "Nos",
  "Rft",
  "Job",
  "Mtr",
  "Set",
  "Coil",
  "Kg",
  "Ltr",
  "Box",
  "Ton",
  "Sft",
  "Ft",
  "Pcs",
  "Bundle",
  "Packet",
  "Cylinder",
  "Drum",
  "Roll",
  "Bag",
  "Lot",
  "Hrs",
  "Days",
  "Month",
];

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search/Filter states
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  // New Catalog Product states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("Nos");
  const [newReorderLevel, setNewReorderLevel] = useState("5");
  const [newAvgCost, setNewAvgCost] = useState("0");
  const [newSalesPrice, setNewSalesPrice] = useState("0");
  const [newOnHandQty, setNewOnHandQty] = useState("0");

  // Edit Catalog Product states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editUnit, setEditUnit] = useState("Nos");
  const [editReorderLevel, setEditReorderLevel] = useState("5");
  const [editAvgCost, setEditAvgCost] = useState("0");
  const [editSalesPrice, setEditSalesPrice] = useState("0");
  const [editOnHandQty, setEditOnHandQty] = useState("0");

  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
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

  const handleDeleteProduct = async (product: any) => {
    if (!confirm(`Are you sure you want to delete product "${product.sku} - ${product.name}"?`)) return;

    try {
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_PRODUCTS",
          ids: [product.id],
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Product Deleted", message: `Deleted ${product.sku} - ${product.name}.`, type: "success" });
        setSelectedProductIds((prev) => prev.filter((id) => id !== product.id));
        fetchData();
      } else {
        toast({ title: "Delete Failed", message: json.error, type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", message: e.message, type: "error" });
    }
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
      const prodRes = await fetch("/api/inventory/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!prodRes.ok) throw new Error("Failed to load products");
      const prodData = await prodRes.json();
      setProducts(prodData.products || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setMounted(true);
  }, []);

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku || !newName || !newCategory || !newUnit || !newReorderLevel) {
      toast({ title: "Missing Fields", message: "Please fill in all required fields.", type: "warning" });
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

      toast({ title: "Product Onboarded", message: "Product onboarded successfully in HVAC catalog.", type: "success" });
      setIsCreateOpen(false);
      setNewSku("");
      setNewName("");
      setNewCategory("");
      setNewUnit("Nos");
      setNewReorderLevel("5");
      setNewAvgCost("0");
      setNewSalesPrice("0");
      setNewOnHandQty("0");
      fetchData();
    } catch (err: any) {
      toast({ title: "Creation Failed", message: err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const availableUnits = React.useMemo(() => {
    const existingUnits = products
      .map((p) => p.unit)
      .filter((u): u is string => Boolean(u && typeof u === "string" && u.trim().length > 0));

    return Array.from(new Set([...DEFAULT_STOCKING_UNITS, ...existingUnits]));
  }, [products]);

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setEditSku(p.sku || "");
    setEditName(p.name || "");
    setEditCategory(p.category || "");
    setEditUnit(p.unit || "Nos");
    setEditReorderLevel(String(p.reorderLevel ?? 5));
    setEditAvgCost(String(p.averageCost ?? 0));
    setEditSalesPrice(String(p.salesPrice ?? 0));
    setEditOnHandQty(String(p.onHandQty ?? 0));
    setIsEditOpen(true);
  };

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editSku || !editName || !editCategory || !editUnit) {
      toast({ title: "Missing Fields", message: "Please fill in all required fields.", type: "warning" });
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/inventory/products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingId,
          sku: editSku,
          name: editName,
          category: editCategory,
          unit: editUnit,
          reorderLevel: Math.max(0, parseInt(editReorderLevel) || 0),
          averageCost: Math.max(0, Number(editAvgCost) || 0),
          salesPrice: Math.max(0, Number(editSalesPrice) || 0),
          onHandQty: Math.max(0, parseInt(editOnHandQty) || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update product");

      toast({ title: "Product Updated", message: `Product "${editName}" updated successfully.`, type: "success" });
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Update Failed", message: err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products locally
  const filteredProducts = products.filter((p) => {
    const s = search.toLowerCase();
    const matchesText =
      (p.sku || "").toLowerCase().includes(s) ||
      (p.name || "").toLowerCase().includes(s) ||
      (p.category || "").toLowerCase().includes(s);
    const matchesCategory = category === "" || p.category === category;
    return matchesText && matchesCategory;
  });

  // Extract unique categories for dropdown filter
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map((c) => ({
    label: c,
    value: c,
  }));

  const lowStockProducts = products.filter((p) => Math.max(0, Number(p.onHandQty || 0)) <= Number(p.reorderLevel || 0));

  return (
    <div className="space-y-6">
      <datalist id="inventory-stocking-units">
        {availableUnits.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      {/* 1. Low Stock Alert Banner */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-4 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <h4 className="font-bold text-sm">Low Stock Alert!</h4>
            <p className="text-xs mt-0.5">
              The following catalog items are running below reorder limits:{" "}
              {lowStockProducts.map((p) => `${p.sku} (${Math.max(0, Number(p.onHandQty || 0))} left)`).join(", ")}.
            </p>
          </div>
        </div>
      )}

      {/* 2. Selection Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">HVAC Catalog & Inventory</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Manage catalog items, monitor on-hand warehouse quantities, edit details, and track reorder alerts.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setNewUnit("Nos");
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and filter row */}
      <SearchFilter
        placeholder="Search products by SKU, name, or category..."
        search={search}
        onSearchChange={setSearch}
        status={category}
        onStatusChange={setCategory}
        statusOptions={categories}
      />

      {loading ? (
        <SkeletonTable rows={7} columns={8} />
      ) : error ? (
        <div className="p-8 text-center text-rose-500 font-bold">{error}</div>
      ) : (
        /* ==================== PRODUCT CATALOG TABLE ==================== */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3 text-center w-8">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                    <th className="p-3 text-right font-bold">In Stock (On Hand)</th>
                    <th className="p-3 text-right">Incoming Qty</th>
                    <th className="p-3 text-right">Avg Cost (PKR)</th>
                    <th className="p-3 text-right">Sales Price (PKR)</th>
                    <th className="p-3 text-right">Reorder Level</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredProducts.map((p) => {
                    const isLow = Number(p.onHandQty || 0) <= Number(p.reorderLevel || 0);
                    const isSelected = selectedProductIds.includes(p.id);

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors ${
                          isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                        <td className="p-3 font-bold whitespace-nowrap font-mono">{p.sku || "-"}</td>
                        <td className="p-3 font-semibold">{p.name || "-"}</td>
                        <td className="p-3">{p.category || "-"}</td>
                        <td className="p-3 text-slate-500">{p.unit || "Nos"}</td>
                        <td className={`p-3 text-right font-black text-sm font-mono ${isLow ? "text-amber-500" : ""}`}>
                          {Math.max(0, Number(p.onHandQty || 0))}
                          {isLow && (
                            <span className="inline-block ml-1 text-[10px] bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded font-bold uppercase">
                              Low
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right text-blue-500 font-medium font-mono">{p.incomingQty ?? 0}</td>
                        <td className="p-3 text-right font-semibold font-mono">{Number(p.averageCost || 0).toFixed(2)}</td>
                        <td className="p-3 text-right font-semibold font-mono text-emerald-600 dark:text-emerald-400">{Number(p.salesPrice || 0).toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-400 font-semibold font-mono">{p.reorderLevel ?? 0}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-[10px] font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1"
                              title="Edit Product Details"
                            >
                              <Edit2 className="w-3 h-3 text-blue-500" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded text-[10px] font-bold transition-all flex items-center gap-1"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
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
              Create a new catalog item in the database. Define its SKU, categories, default unit, pricing, and reorder levels.
            </p>

            <form onSubmit={handleCreateProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Product SKU / Code (Unique)</label>
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
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Product / Item Name</label>
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
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Category</label>
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
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">
                    Stocking Unit
                  </label>
                  <input
                    type="text"
                    required
                    list="inventory-stocking-units"
                    placeholder="e.g. Nos, Rft, Job, Mtr"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Reorder Level</label>
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
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Unit Cost Rate (PKR)</label>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  {submitting ? "Onboarding..." : "Onboard Item"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== EDIT PRODUCT ITEM DIALOG ==================== */}
      {mounted && isEditOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-500" />
                <span>Edit Product Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Update product SKU, name, category, units, stock quantity, cost, and sales price.
            </p>

            <form onSubmit={handleEditProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Product SKU / Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COMP-ZR61-TFD"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Product / Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Copeland Scroll Compressor 5HP"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Compressors"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">
                    Stocking Unit
                  </label>
                  <input
                    type="text"
                    required
                    list="inventory-stocking-units"
                    placeholder="e.g. Nos, Rft, Job, Mtr"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Reorder Level</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
                    value={editReorderLevel}
                    onChange={(e) => setEditReorderLevel(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">In Stock (On Hand Qty)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-600 dark:text-blue-400"
                    value={editOnHandQty}
                    onChange={(e) => setEditOnHandQty(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Unit Cost Rate (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
                    value={editAvgCost}
                    onChange={(e) => setEditAvgCost(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Sales Price (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                    value={editSalesPrice}
                    onChange={(e) => setEditSalesPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  {submitting ? "Saving..." : "Save Product Details"}
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
