"use client";

import React, { useState, useEffect } from "react";
import { Search, ShoppingCart, Plus, Minus, Trash2, DollarSign, User, Phone, CheckCircle2, Printer } from "lucide-react";
import { SkeletonCard } from "@/components/shared/SkeletonTable";
import { useToast } from "@/components/shared/ToastProvider";

export default function PosPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<any[]>([]);
  const [clientName, setClientName] = useState("Walk-in Customer");
  const [clientPhone, setClientPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCatalog = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("/api/inventory/products", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (e) {} finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const addToCart = (product: any) => {
    if (product.onHandQty <= 0) {
      toast({ title: "Out of Stock", message: "Product is out of stock!", type: "warning" });
      return;
    }

    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.onHandQty) {
        toast({ title: "Stock Limit", message: "Cannot add more units than physical stock on hand!", type: "warning" });
        return;
      }
      setCart(
        cart.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: 1,
          salesPrice: Number(product.averageCost) * 1.3, // default mark-up
          maxQty: product.onHandQty,
        },
      ]);
    }
  };

  const updateCartQty = (productId: string, increment: boolean) => {
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = increment ? item.quantity + 1 : item.quantity - 1;
            if (nextQty > item.maxQty) {
              toast({ title: "Insufficient Stock", message: "Insufficient physical stock available.", type: "warning" });
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast({ title: "Empty Cart", message: "Your POS cart is empty.", type: "warning" });
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/sales/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientName,
          clientPhone,
          paymentMethod,
          lineItems: cart,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "POS checkout failed");

      toast({ title: "Checkout Successful", message: "Counter invoice created and payment recorded.", type: "success" });
      // Show receipt modal
      setReceiptData(data.invoice);
      setCart([]);
      setClientName("Walk-in Customer");
      setClientPhone("");
    } catch (err: any) {
      toast({ title: "Checkout Failed", message: err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const cartTotal = cart.reduce((acc, item) => acc + item.quantity * item.salesPrice, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[80vh]">
      {/* 1. Left Catalog search and selection grid (lg:col-span-7) */}
      <div className="lg:col-span-7 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm overflow-hidden no-print">
        <div className="mb-4 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Quick search product SKU or name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 no-scrollbar">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                  p.onHandQty <= 0
                    ? "opacity-50 border-slate-200 bg-slate-50 dark:bg-slate-950/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-blue-500 dark:hover:border-blue-500/80"
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">{p.category}</span>
                  <h4 className="font-bold text-xs truncate mt-0.5">{p.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">{p.sku}</p>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-xs font-black text-blue-500">PKR {Math.round(Number(p.salesPrice || p.averageCost * 1.3)).toLocaleString("en-US")}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    p.onHandQty <= 0 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {p.onHandQty <= 0 ? "Out of stock" : `${p.onHandQty} Left`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Right Cart Drawer & Checkout Form (lg:col-span-5) */}
      <div className="lg:col-span-5 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm overflow-hidden no-print">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <ShoppingCart className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-sm">POS Checkout Cart ({cart.length})</h3>
        </div>

        {/* Cart Item rows list */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1 no-scrollbar">
          {cart.map((item) => (
            <div key={item.productId} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-xs">
              <div className="min-w-0 flex-1 pr-2">
                <h5 className="font-bold truncate">{item.name}</h5>
                <span className="text-[9px] text-slate-400 font-semibold">{item.sku}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => updateCartQty(item.productId, false)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold w-6 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateCartQty(item.productId, true)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="font-black text-blue-500 w-16 text-right">
                  {(item.quantity * item.salesPrice).toFixed(0)}
                </span>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="p-1 hover:bg-rose-50 text-rose-500 rounded ml-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="py-20 text-center text-slate-400 text-xs">Cart is empty. Click items on the left grid.</div>
          )}
        </div>

        {/* Checkout Billing Form */}
        <form onSubmit={handleCheckout} className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  className="w-full pl-8 pr-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Phone</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. +92300"
                  className="w-full pl-8 pr-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase">Payment Channel</span>
            <select
              className="px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="CASH">CASH</option>
              <option value="CARD">CARD</option>
              <option value="BANK">BANK</option>
            </select>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cart Total</span>
            <span className="text-lg font-black text-blue-500">PKR {cartTotal.toLocaleString()}</span>
          </div>

          <button
            type="submit"
            disabled={submitting || cart.length === 0}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/10"
          >
            {submitting ? "Checking out..." : "Process Checkout & Print Receipt"}
          </button>
        </form>
      </div>

      {/* ==================== POS PRINT RECEIPT DIALOG ==================== */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 flex flex-col">
            <div className="text-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Checkout Success!</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Receipt {receiptData.invoiceNumber} logged.</p>
            </div>

            {/* Receipt Preview */}
            <div className="border border-dashed border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xs space-y-3 font-mono bg-slate-50 dark:bg-slate-950/40">
              <div className="text-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-sm block">HVAC TRADING POS</span>
                <span className="text-[9px] text-slate-400">Date: {new Date(receiptData.date).toLocaleDateString()}</span>
              </div>
              <div className="space-y-1 text-[10px]">
                <p>Client: {receiptData.clientName}</p>
                {receiptData.clientPhone && <p>Phone: {receiptData.clientPhone}</p>}
                <p>Method: {paymentMethod}</p>
              </div>
              <div className="border-t border-b border-dashed border-slate-200 dark:border-slate-800 py-2 space-y-1">
                {receiptData.lineItems.map((l: any) => (
                  <div key={l.id} className="flex justify-between text-[10px]">
                    <span>{l.productId ? products.find((pr) => pr.id === l.productId)?.sku : "Item"} x{l.quantity}</span>
                    <span>{(l.quantity * Number(l.salesPrice)).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL AMOUNT:</span>
                <span>PKR {Number(receiptData.totalAmount).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setReceiptData(null)}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
              >
                Close Drawer
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
