"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Package, Search, X, Check, AlertTriangle, Layers, Tag } from "lucide-react";

export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  unit?: string | null;
  salesPrice?: number | string | null;
  averageCost?: number | string | null;
  onHandQty?: number | null;
  minStockAlert?: number | null;
  [key: string]: any;
}

interface ProductSelectProps {
  products?: ProductItem[];
  value: string;
  onChange: (product: ProductItem | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  priceType?: "sales" | "cost";
  showStockBadge?: boolean;
}

export default function ProductSelect({
  products: initialProducts,
  value,
  onChange,
  placeholder = "Search product by SKU, name, model...",
  required = false,
  className = "",
  disabled = false,
  priceType = "sales",
  showStockBadge = true,
}: ProductSelectProps) {
  const [internalProducts, setInternalProducts] = useState<ProductItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch products if not passed via props
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setInternalProducts(initialProducts);
    } else {
      const fetchProducts = async () => {
        try {
          const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
          const res = await fetch("/api/inventory/products", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setInternalProducts(data.products || []);
          }
        } catch (e) {
          console.error("Failed to load products in ProductSelect:", e);
        }
      };
      fetchProducts();
    }
  }, [initialProducts]);

  const productList = initialProducts && initialProducts.length > 0 ? initialProducts : internalProducts;

  // Find currently selected product
  const selectedProduct = useMemo(() => {
    return productList.find((p) => String(p.id) === String(value));
  }, [productList, value]);

  // Sync display text when value changes
  useEffect(() => {
    if (selectedProduct) {
      setSearchQuery(`${selectedProduct.sku ? `[${selectedProduct.sku}] ` : ""}${selectedProduct.name}`);
    } else if (!value) {
      setSearchQuery("");
    }
  }, [selectedProduct, value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If closed without explicit pick, restore label if valid value exists, else reset
        if (selectedProduct) {
          setSearchQuery(`${selectedProduct.sku ? `[${selectedProduct.sku}] ` : ""}${selectedProduct.name}`);
        } else if (!value) {
          setSearchQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedProduct, value]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return productList;

    // If query matches the selected product's formatted string, show full list on click
    if (selectedProduct && searchQuery === `${selectedProduct.sku ? `[${selectedProduct.sku}] ` : ""}${selectedProduct.name}`) {
      return productList;
    }

    return productList.filter((p) => {
      const sku = (p.sku || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      const category = (p.category || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const model = (p.model || "").toLowerCase();

      return (
        sku.includes(q) ||
        name.includes(q) ||
        category.includes(q) ||
        brand.includes(q) ||
        model.includes(q) ||
        `${sku} ${name}`.includes(q)
      );
    });
  }, [productList, searchQuery, selectedProduct]);

  // Scroll active index into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (product: ProductItem) => {
    onChange(product);
    setSearchQuery(`${product.sku ? `[${product.sku}] ` : ""}${product.name}`);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchQuery("");
    setIsOpen(true);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          handleSelect(filteredProducts[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        if (selectedProduct) {
          setSearchQuery(`${selectedProduct.sku ? `[${selectedProduct.sku}] ` : ""}${selectedProduct.name}`);
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <Package className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none shrink-0" />
        
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          required={required && !value}
          value={searchQuery}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
            if (!e.target.value) {
              onChange(null);
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full pl-8.5 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
            disabled ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""
          }`}
        />

        {searchQuery ? (
          <button
            type="button"
            disabled={disabled}
            onClick={handleClear}
            className="absolute right-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-0.5 rounded transition-colors"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Search className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 absolute right-2.5 pointer-events-none" />
        )}
      </div>

      {/* Dropdown Options */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[60] max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 animate-fadeIn text-xs min-w-[280px]"
        >
          {filteredProducts.length === 0 ? (
            <div className="p-3 text-center text-slate-400 dark:text-slate-500 space-y-1">
              <Package className="w-5 h-5 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
              <p className="font-semibold text-xs text-slate-600 dark:text-slate-400">No matching items found</p>
              <p className="text-[11px] text-slate-400">Try searching with a different keyword or SKU</p>
            </div>
          ) : (
            filteredProducts.map((p, idx) => {
              const isSelected = String(p.id) === String(value);
              const isHighlighted = idx === highlightedIndex;
              const stockQty = Number(p.onHandQty ?? 0);
              const isOutOfStock = stockQty <= 0;
              const isLowStock = !isOutOfStock && stockQty <= (p.minStockAlert || 5);
              const price = priceType === "cost" ? p.averageCost : (p.salesPrice || Number(p.averageCost || 0) * 1.25);

              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(p)}
                  className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                    isHighlighted
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100"
                      : isSelected
                      ? "bg-slate-50 dark:bg-slate-800/50"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      {p.sku && (
                        <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {p.sku}
                        </span>
                      )}
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {p.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      {p.category && (
                        <span className="flex items-center gap-0.5">
                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                          {p.category}
                        </span>
                      )}
                      {p.brand && <span>• {p.brand}</span>}
                      {p.model && <span>• Mod: {p.model}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1">
                    {/* Stock Status Badge */}
                    {showStockBadge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          isOutOfStock
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            : isLowStock
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        }`}
                      >
                        {isOutOfStock ? (
                          <>Out: 0 {p.unit || "Nos"}</>
                        ) : isLowStock ? (
                          <>Low: {stockQty} {p.unit || "Nos"}</>
                        ) : (
                          <>Stock: {stockQty} {p.unit || "Nos"}</>
                        )}
                      </span>
                    )}

                    {/* Price Info */}
                    {price !== undefined && price !== null && Number(price) > 0 && (
                      <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        PKR {Number(price).toLocaleString()}
                      </span>
                    )}

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
