"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, Phone, MapPin, Plus, Check, Search, X, Building2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/shared/ToastProvider";

export interface CustomerData {
  id?: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  ntn?: string | null;
  cnic?: string | null;
  notes?: string | null;
  isVendor?: boolean;
}

interface CustomerSelectProps {
  label?: string;
  value: string;
  phoneValue?: string;
  addressValue?: string;
  onChange: (customer: CustomerData) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  includeVendors?: boolean;
}

export default function CustomerSelect({
  label = "Customer / Client Name",
  value,
  phoneValue,
  addressValue,
  onChange,
  required = true,
  placeholder = "Search or select customer...",
  className = "",
  includeVendors = false,
}: CustomerSelectProps) {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Quick Add Form States
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickAddress, setQuickAddress] = useState("");
  const [quickNtn, setQuickNtn] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
      let all: CustomerData[] = [];
      
      const res = await fetch("/api/sales/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        all = data.customers || [];
      }

      if (includeVendors) {
        const vRes = await fetch("/api/procurement/vendors", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (vRes.ok) {
          const vData = await vRes.json();
          const mappedVendors: CustomerData[] = (vData.vendors || []).map((v: any) => ({
            id: undefined, // pass undefined so invoice auto-creates a customer record
            name: v.name,
            phone: v.phone || "",
            email: v.email || null,
            address: v.address || null,
            ntn: v.ntn || null,
            notes: v.paymentTerms || null,
            isVendor: true,
          }));
          all = [...all, ...mappedVendors];
        }
      }

      setCustomers(all);
    } catch (e) {
      console.error("Failed to fetch customers/vendors:", e);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchCustomers();
  }, []);

  useEffect(() => {
    setSearchQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const handleSelect = (c: CustomerData) => {
    onChange({
      id: c.id,
      name: c.name,
      phone: c.phone || "",
      address: c.address || "",
      email: c.email || "",
      ntn: c.ntn || "",
      cnic: c.cnic || "",
      notes: c.notes || "",
    });
    setSearchQuery(c.name);
    setIsOpen(false);
  };

  const handleOpenQuickAdd = () => {
    setQuickName(searchQuery.trim());
    setQuickPhone(phoneValue || "");
    setQuickAddress(addressValue || "");
    setQuickEmail("");
    setQuickNtn("");
    setQuickNotes("");
    setIsQuickAddOpen(true);
    setIsOpen(false);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickPhone.trim()) {
      toast({ title: "Required Fields", message: "Customer name and phone number are required.", type: "warning" });
      return;
    }

    setSubmitting(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    try {
      const res = await fetch("/api/sales/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: quickName.trim(),
          phone: quickPhone.trim(),
          email: quickEmail.trim() || null,
          address: quickAddress.trim() || null,
          ntn: quickNtn.trim() || null,
          notes: quickNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.customer) {
          // Existing customer found, use it
          handleSelect(data.customer);
          setIsQuickAddOpen(false);
          toast({ title: "Customer Selected", message: `Selected existing customer ${data.customer.name}.`, type: "info" });
          return;
        }
        throw new Error(data.error || "Failed to create customer");
      }

      toast({ title: "Customer Created", message: `Customer "${quickName}" added and selected.`, type: "success" });
      const newCust = data.customer;
      setCustomers((prev) => [newCust, ...prev]);
      handleSelect(newCust);
      setIsQuickAddOpen(false);
    } catch (err: any) {
      toast({ title: "Creation Failed", message: err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          required={required}
          value={searchQuery}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            fetchCustomers();
          }}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val);
            onChange({
              name: val,
              phone: phoneValue || "",
              address: addressValue || "",
            });
            setIsOpen(true);
          }}
          className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />

        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              onChange({ name: "", phone: "", address: "" });
            }}
            className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 animate-fadeIn text-xs">
          {/* Add New Customer Option Header */}
          <button
            type="button"
            onClick={handleOpenQuickAdd}
            className="w-full text-left px-3.5 py-2.5 bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2 transition-colors border-b border-blue-100 dark:border-blue-900/40"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>
              {searchQuery.trim() ? `+ Add new customer "${searchQuery.trim()}"` : "+ Add New Customer"}
            </span>
          </button>

          {filtered.map((c: any) => {
            const netBal = c.ledgerBalance !== undefined ? c.ledgerBalance : (c.outstandingBalance || 0);
            const initials = c.name ? c.name.slice(0, 2).toUpperCase() : "CU";
            return (
              <button
                key={c.id || c.phone || c.name}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-2">
                      {c.name}
                      {c.isVendor && (
                        <span className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded-md uppercase">
                          Vendor
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {c.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {c.phone}
                        </span>
                      )}
                      {c.address && (
                        <span className="flex items-center gap-1 truncate max-w-[160px]">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {c.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {netBal > 0 ? (
                    <span className="text-[10px] font-bold font-mono text-rose-600 dark:text-rose-400">
                      Due: PKR {Math.round(netBal).toLocaleString()}
                    </span>
                  ) : netBal < 0 ? (
                    <span className="text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400">
                      Adv: PKR {Math.round(Math.abs(netBal)).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Settled
                    </span>
                  )}
                  {c.name.toLowerCase() === value.toLowerCase() && (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-3 text-center text-slate-400">
              No matching customer found. Click above to add them!
            </div>
          )}
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {mounted && isQuickAddOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                <span>Quick Add Customer</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="text-rose-500 hover:text-rose-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Enter customer details. Name and Phone are required; other fields are optional and can be edited later.
            </p>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Customer / Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Textile Mill or Ali Ahmed"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0300-1234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="client@domain.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={quickEmail}
                    onChange={(e) => setQuickEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Premises / Delivery Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 45, Industrial Estate, Multan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={quickAddress}
                  onChange={(e) => setQuickAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    NTN / STRN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1234567-8"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={quickNtn}
                    onChange={(e) => setQuickNtn(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VIP client, preferred billing Net 15"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  {submitting ? "Saving..." : "Save & Select Customer"}
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
