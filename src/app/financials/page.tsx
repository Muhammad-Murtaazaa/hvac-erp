"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  ShoppingBag,
  Percent,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  Sparkles,
  BookOpen,
  FileText,
  CreditCard,
  Plus,
  PlusCircle,
  Search,
  User,
  UserCheck,
  Users,
  Building2,
  BadgeCheck,
  Eye,
  Send,
  ArrowRightLeft,
  Filter,
  Check,
  X,
  Scale,
  Coins,
  Link2,
  Landmark,
  Info,
  SlidersHorizontal,
  FileCheck,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Zap,
  FileSpreadsheet,
  ShieldCheck,
  Tag,
  ArrowRight,
  Receipt,
  PiggyBank,
  History,
  Edit2,
  Edit3,
  Phone,
  Mail,
  MapPin,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/components/shared/ToastProvider";

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

/* ========================================================================= */
/* UNIVERSAL SEARCHABLE PARTY SELECTOR (CUSTOMERS, VENDORS, EMPLOYEES)       */
/* ========================================================================= */
function UniversalPartyCombobox({
  selectedName,
  selectedId,
  selectedType,
  parties = [],
  placeholder = "Search any Customer, Vendor, or Staff by name, phone...",
  onSelect,
  onAddNewCustomer,
  onAddNewVendor,
}: {
  selectedName: string;
  selectedId?: string;
  selectedType?: "CUSTOMER" | "VENDOR" | "EMPLOYEE";
  parties: Array<{
    id: string;
    name: string;
    type: "CUSTOMER" | "VENDOR" | "EMPLOYEE";
    phone?: string;
    email?: string;
    extra?: string;
    balance?: number;
  }>;
  placeholder?: string;
  onSelect: (party: any) => void;
  onAddNewCustomer: (initialName: string) => void;
  onAddNewVendor: (initialName: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "CUSTOMER" | "VENDOR" | "EMPLOYEE">("ALL");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    let list = parties;
    if (filterType !== "ALL") {
      list = list.filter((p) => p.type === filterType);
    }
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(s);
      const phoneMatch = p.phone?.toLowerCase().includes(s);
      const extraMatch = p.extra?.toLowerCase().includes(s);
      const emailMatch = p.email?.toLowerCase().includes(s);
      return nameMatch || phoneMatch || extraMatch || emailMatch;
    });
  }, [parties, search, filterType]);

  const currentSelectedParty = useMemo(() => {
    if (selectedId) return parties.find((p) => p.id === selectedId);
    if (selectedName) return parties.find((p) => p.name?.toLowerCase() === selectedName.toLowerCase());
    return null;
  }, [parties, selectedId, selectedName]);

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          <Search className="w-3.5 h-3.5 text-blue-500" />
          <span>Universal Party Search</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddNewCustomer(search)}
            className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>+ Customer</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <button
            type="button"
            onClick={() => onAddNewVendor(search)}
            className="text-[10px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>+ Vendor</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={isOpen ? search : selectedName || ""}
            placeholder={placeholder}
            onFocus={() => {
              setIsOpen(true);
              setSearch(selectedName || "");
            }}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
          />
          {isOpen || selectedName ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                onSelect(null);
                setIsOpen(true);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>

        {/* Dropdown Floating Popover */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-80 overflow-y-auto no-scrollbar p-2 space-y-1.5 animate-fadeIn">
            {/* Quick Filter Chips inside Dropdown */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterType === "ALL"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All ({parties.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("CUSTOMER")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  filterType === "CUSTOMER"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                }`}
              >
                <User className="w-3 h-3" />
                Customers ({parties.filter((p) => p.type === "CUSTOMER").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("VENDOR")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  filterType === "VENDOR"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                }`}
              >
                <Building2 className="w-3 h-3" />
                Vendors ({parties.filter((p) => p.type === "VENDOR").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("EMPLOYEE")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  filterType === "EMPLOYEE"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                }`}
              >
                <Users className="w-3 h-3" />
                Staff ({parties.filter((p) => p.type === "EMPLOYEE").length})
              </button>
            </div>

            {/* List of matches */}
            {filtered.length > 0 ? (
              filtered.map((party: any) => {
                const isSelected = (selectedId && party.id === selectedId) || (selectedName && party.name === selectedName);
                return (
                  <div
                    key={`${party.type}-${party.id || party.name}`}
                    onClick={() => {
                      onSelect(party);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-black"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-[10px] uppercase shrink-0 ${
                          party.type === "CUSTOMER"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : party.type === "VENDOR"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        }`}
                      >
                        {party.type === "CUSTOMER" ? "CU" : party.type === "VENDOR" ? "VE" : "ST"}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs truncate flex items-center gap-1.5">
                          <span>{party.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase ${
                              party.type === "CUSTOMER"
                                ? "bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                                : party.type === "VENDOR"
                                ? "bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                : "bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                            }`}
                          >
                            {party.type === "CUSTOMER" ? "Customer" : party.type === "VENDOR" ? "Vendor" : "Staff"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {party.phone && <span>📞 {party.phone}</span>}
                          {party.extra && <span>• {party.extra}</span>}
                        </div>
                      </div>
                    </div>

                    {party.balance !== undefined && (
                      <div className="text-right shrink-0 ml-2">
                        <span
                          className={`text-[10px] font-mono font-bold block ${
                            party.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                          }`}
                        >
                          {party.balance > 0 ? `Due: PKR ${Math.round(party.balance).toLocaleString()}` : "Settled"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching accounts found for &ldquo;{search}&rdquo;.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Party Summary Ribbon */}
      {currentSelectedParty && !isOpen && (
        <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                currentSelectedParty.type === "CUSTOMER"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : currentSelectedParty.type === "VENDOR"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
              }`}
            >
              {currentSelectedParty.type === "CUSTOMER" ? "Customer" : currentSelectedParty.type === "VENDOR" ? "Vendor" : "Staff"}
            </span>
            <span className="font-bold text-slate-800 dark:text-white truncate">{currentSelectedParty.name}</span>
            {currentSelectedParty.phone && (
              <span className="text-[10px] text-slate-500 font-mono truncate">📞 {currentSelectedParty.phone}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* SEARCHABLE PARTY SELECTOR WITH REAL-TIME FILTERING & AUTO-ADD SUGGEST     */
/* ========================================================================= */
function SearchablePartyCombobox({
  label,
  type,
  selectedName,
  selectedId,
  parties = [],
  placeholder = "Search or type name...",
  required = false,
  onSelect,
  onAddNew,
  onEdit,
  onViewLedger,
}: {
  label: string;
  type: "CUSTOMER" | "VENDOR" | "EMPLOYEE";
  selectedName: string;
  selectedId?: string;
  parties: any[];
  placeholder?: string;
  required?: boolean;
  onSelect: (party: any) => void;
  onAddNew: (name: string) => void;
  onEdit?: (party: any) => void;
  onViewLedger?: (party: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return parties;
    const s = search.toLowerCase();
    return parties.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(s);
      const phoneMatch = p.phone?.toLowerCase().includes(s);
      const contactMatch = p.contactPerson?.toLowerCase().includes(s);
      const emailMatch = p.email?.toLowerCase().includes(s);
      return nameMatch || phoneMatch || contactMatch || emailMatch;
    });
  }, [parties, search]);

  const exactMatch = useMemo(() => {
    if (!search) return null;
    return parties.find((p) => p.name?.toLowerCase() === search.trim().toLowerCase());
  }, [parties, search]);

  const currentSelectedParty = useMemo(() => {
    if (selectedId) return parties.find((p) => p.id === selectedId);
    if (selectedName) return parties.find((p) => p.name?.toLowerCase() === selectedName.toLowerCase());
    return null;
  }, [parties, selectedId, selectedName]);

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {type === "CUSTOMER" ? (
            <User className="w-3.5 h-3.5 text-blue-500" />
          ) : type === "VENDOR" ? (
            <Building2 className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Users className="w-3.5 h-3.5 text-purple-500" />
          )}
          <span>{label}</span>
        </label>
        {onAddNew && (
          <button
            type="button"
            onClick={() => onAddNew(search)}
            className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>+ Add New {type === "CUSTOMER" ? "Customer" : type === "VENDOR" ? "Vendor" : "Staff"}</span>
          </button>
        )}
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            required={required && !selectedName && !selectedId}
            value={isOpen ? search : selectedName || ""}
            placeholder={placeholder}
            onFocus={() => {
              setIsOpen(true);
              setSearch(selectedName || "");
            }}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
          />
          {isOpen || selectedName ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                onSelect(null);
                setIsOpen(true);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>

        {/* Dropdown Floating Popover */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto no-scrollbar p-2 space-y-1 animate-fadeIn">
            {/* If search term is typed and no exact match exists, show + Add Suggestion Card */}
            {search.trim() && !exactMatch && (
              <div
                onClick={() => {
                  onAddNew(search.trim());
                  setIsOpen(false);
                }}
                className="p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/80 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    +
                  </div>
                  <div>
                    <div className="text-xs font-black text-blue-900 dark:text-blue-200">
                      Add &ldquo;{search.trim()}&rdquo;
                    </div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400">
                      Not found. Click to create new {type === "CUSTOMER" ? "Customer Account" : "Vendor Profile"}.
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-lg shadow-xs">
                  Create Now
                </span>
              </div>
            )}

            {/* List of matches */}
            {filtered.length > 0 ? (
              filtered.map((party: any) => {
                const isSelected = (selectedId && party.id === selectedId) || (selectedName && party.name === selectedName);
                return (
                  <div
                    key={party.id || party.name}
                    onClick={() => {
                      onSelect(party);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-black"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-[10px] uppercase shrink-0 ${
                          type === "CUSTOMER"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : type === "VENDOR"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        }`}
                      >
                        {party.name?.substring(0, 2) || "PA"}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs truncate flex items-center gap-1.5">
                          <span>{party.name}</span>
                          {party.contactPerson && (
                            <span className="text-[10px] text-slate-400 font-normal">({party.contactPerson})</span>
                          )}
                          {party.role && <span className="text-[10px] text-purple-500 font-normal">({party.role})</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          {party.phone && <span>📞 {party.phone}</span>}
                          {party.email && <span>✉️ {party.email}</span>}
                          {party.paymentTerms && <span>⏱️ {party.paymentTerms}</span>}
                        </div>
                      </div>
                    </div>

                    {party.balance !== undefined && (
                      <div className="text-right shrink-0 ml-2">
                        <span
                          className={`text-[10px] font-mono font-bold block ${
                            party.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                          }`}
                        >
                          {party.balance > 0 ? `Due: PKR ${Math.round(party.balance).toLocaleString()}` : "Settled"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : !search.trim() ? (
              <div className="p-4 text-center text-xs text-slate-400">No {type.toLowerCase()} records found.</div>
            ) : null}

            {/* Permanent Action Footer */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onAddNew(search);
                  setIsOpen(false);
                }}
                className="w-full py-2 px-3 text-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Register New {type === "CUSTOMER" ? "Customer Account" : type === "VENDOR" ? "Vendor Profile" : "Staff"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Party Summary Ribbon with Edit & View Ledger CTAs */}
      {currentSelectedParty && !isOpen && (
        <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-slate-800 dark:text-white truncate">{currentSelectedParty.name}</span>
            {currentSelectedParty.phone && (
              <span className="text-[11px] text-slate-500 font-mono truncate">📞 {currentSelectedParty.phone}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {type === "CUSTOMER" && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(currentSelectedParty)}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 transition-colors flex items-center gap-1"
                title="Edit Customer Account Details"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}

            {onViewLedger && (
              <button
                type="button"
                onClick={() => onViewLedger(currentSelectedParty)}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors flex items-center gap-1"
                title="View Statement of Account (SOA)"
              >
                <FileText className="w-3 h-3" />
                <span>View Ledger</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* SEARCHABLE ACCOUNT SELECTOR (TYPE ANY CUSTOM ACCOUNT OR SEARCH SUGGESTIONS)*/
/* ========================================================================= */
function SearchableAccountCombobox({
  value,
  onChange,
  placeholder = "Type or search account name (e.g. Bank Account, Cash in Hand, Expenses)...",
  suggestions = [
    "Cash in Hand",
    "Bank Account",
    "Sales Revenue",
    "Service & Maintenance Revenue",
    "Operating Expenses",
    "Office Rent & Utilities",
    "Salary & Wage Expense",
    "Owner Capital / Equity",
    "General & Administrative Expense",
    "Logistics & Carriage Outward",
    "General Expense",
  ],
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = (value || "").toLowerCase().trim();
    if (!q) return suggestions;
    return suggestions.filter((s) => s.toLowerCase().includes(q));
  }, [suggestions, value]);

  const exactMatch = useMemo(() => {
    const q = (value || "").toLowerCase().trim();
    if (!q) return null;
    return suggestions.find((s) => s.toLowerCase() === q);
  }, [suggestions, value]);

  return (
    <div className="relative w-full space-y-1.5" ref={dropdownRef}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          required
          value={value}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            } else if (e.key === "Enter" && isOpen && filtered.length > 0) {
              onChange(filtered[0]);
              setIsOpen(false);
              e.preventDefault();
            }
          }}
          className="w-full pl-10 pr-9 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(true);
              inputRef.current?.focus();
            }}
            className="absolute right-3 p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
        )}
      </div>

      {/* Dropdown Floating Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto no-scrollbar p-1.5 space-y-0.5 animate-fadeIn text-xs divide-y divide-slate-100 dark:divide-slate-800/60">
          {/* Custom entry option if user typed something not in standard suggestions */}
          {value.trim() && !exactMatch && (
            <div
              onClick={() => {
                onChange(value.trim());
                setIsOpen(false);
              }}
              className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 transition-colors cursor-pointer flex items-center justify-between font-bold"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-black">+</span>
                <span>Use custom account: &ldquo;{value.trim()}&rdquo;</span>
              </div>
              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-mono">Custom</span>
            </div>
          )}

          {/* List of matched suggestions */}
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const isSelected = item.toLowerCase() === (value || "").toLowerCase().trim();
              return (
                <div
                  key={item}
                  onClick={() => {
                    onChange(item);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer flex items-center justify-between ${
                    isSelected ? "bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold" : "text-slate-700 dark:text-slate-200 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                    <span>{item}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                </div>
              );
            })
          ) : !value.trim() ? (
            <div className="p-3 text-center text-slate-400">Type to search or pick an account</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FinancialsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Top Section Mode: "overview" | "record" | "entries" | "statements" | "accounts"
  const [activeSection, setActiveSection] = useState<"statements" | "record" | "entries" | "accounts" | "overview">("overview");

  // Timeframe presets for Overview
  const [timeframe, setTimeframe] = useState<"30d" | "this_month" | "quarter" | "ytd" | "all" | "custom">("30d");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  // Analytics sub-tabs
  const [analyticsTab, setAnalyticsTab] = useState<"cashflow" | "revenue" | "expenses" | "pnl" | "aging">("cashflow");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const applyTimeframe = (preset: "30d" | "this_month" | "quarter" | "ytd" | "all") => {
    setTimeframe(preset);
    const now = new Date();
    const end = now.toISOString().split("T")[0];
    setEndDate(end);
    if (preset === "30d") {
      setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    } else if (preset === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(first.toISOString().split("T")[0]);
    } else if (preset === "quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const qStart = new Date(now.getFullYear(), qMonth, 1);
      setStartDate(qStart.toISOString().split("T")[0]);
    } else if (preset === "ytd") {
      const ytd = new Date(now.getFullYear(), 0, 1);
      setStartDate(ytd.toISOString().split("T")[0]);
    } else if (preset === "all") {
      setStartDate("2024-01-01");
    }
  };

  // ================= STATEMENTS & LEDGER STATE =================
  const [partyType, setPartyType] = useState<"CUSTOMER" | "VENDOR" | "EMPLOYEE">("CUSTOMER");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedPartyName, setSelectedPartyName] = useState("");
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [soaStartDate, setSoaStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [soaEndDate, setSoaEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [soaData, setSoaData] = useState<any>(null);
  const [soaLoading, setSoaLoading] = useState(false);
  const [soaPreset, setSoaPreset] = useState<"this_month" | "last_30" | "ytd" | "all">("this_month");

  // ================= ENTRIES & GENERAL LEDGER STATE =================
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [voucherFilterType, setVoucherFilterType] = useState("");
  const [voucherSearch, setVoucherSearch] = useState("");

  const [generalLedgerEntries, setGeneralLedgerEntries] = useState<any[]>([]);
  const [glLoading, setGlLoading] = useState(false);
  const [glTotals, setGlTotals] = useState<any>({ totalDebit: 0, totalCredit: 0, isBalanced: true, count: 0 });
  const [glSearch, setGlSearch] = useState("");
  const [glSourceType, setGlSourceType] = useState("");
  const [glStartDate, setGlStartDate] = useState("");
  const [glEndDate, setGlEndDate] = useState("");
  const [ledgerViewMode, setLedgerViewMode] = useState<"simple" | "accounting">("simple");
  const [glDirectionFilter, setGlDirectionFilter] = useState<"ALL" | "DEBIT" | "CREDIT">("ALL");
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Helper to extract clean single-line details for Simple Ledger
  const getSimpleLedgerDetails = (entry: any) => {
    const d = new Date(entry.entryDate);
    const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const partyLine = entry.lines?.find((l: any) => l.partyName);
    const partyName = partyLine?.partyName || null;
    const partyType = partyLine?.partyType || null;

    const mainAccount = partyName
      ? partyLine.accountName
      : entry.lines?.find((l: any) => !l.accountName?.toLowerCase().includes("cost of goods") && !l.accountName?.toLowerCase().includes("tax"))?.accountName || entry.lines?.[0]?.accountName || "General Account";

    let direction: "DEBIT" | "CREDIT" = "DEBIT";
    let amount = entry.totalDebit || entry.totalCredit || 0;

    if (partyLine) {
      if (partyLine.debit > 0) {
        direction = "DEBIT";
        amount = partyLine.debit;
      } else if (partyLine.credit > 0) {
        direction = "CREDIT";
        amount = partyLine.credit;
      }
    } else {
      const activeLine = entry.lines?.find((l: any) => l.debit > 0 || l.credit > 0);
      if (activeLine) {
        if (activeLine.debit > 0) {
          direction = "DEBIT";
          amount = activeLine.debit;
        } else {
          direction = "CREDIT";
          amount = activeLine.credit;
        }
      }
    }

    let sourceLabel = entry.sourceType || "VOUCHER";
    let sourceBadgeBg = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    if (entry.sourceType === "INVOICE") {
      sourceLabel = "Invoice";
      sourceBadgeBg = "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    } else if (entry.sourceType === "VOUCHER") {
      sourceLabel = "Voucher";
      sourceBadgeBg = "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
    } else if (entry.sourceType === "GRN") {
      sourceLabel = "Purchase (GRN)";
      sourceBadgeBg = "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    } else if (entry.sourceType === "PAYROLL") {
      sourceLabel = "Payroll";
      sourceBadgeBg = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    }

    return {
      dateStr,
      timeStr,
      partyName,
      partyType,
      mainAccount,
      direction,
      amount,
      sourceLabel,
      sourceBadgeBg,
    };
  };

  const simpleLedgerEntries = useMemo(() => {
    return generalLedgerEntries.map((entry) => ({
      entry,
      details: getSimpleLedgerDetails(entry),
    }));
  }, [generalLedgerEntries]);

  const displayedLedgerList = useMemo(() => {
    if (glDirectionFilter === "ALL") return simpleLedgerEntries;
    return simpleLedgerEntries.filter((item) => item.details.direction === glDirectionFilter);
  }, [simpleLedgerEntries, glDirectionFilter]);

  const simpleStats = useMemo(() => {
    let debits = 0;
    let credits = 0;
    simpleLedgerEntries.forEach(({ details }) => {
      if (details.direction === "DEBIT") debits += details.amount;
      else credits += details.amount;
    });
    return {
      count: simpleLedgerEntries.length,
      totalDebits: debits,
      totalCredits: credits,
      net: debits - credits,
    };
  }, [simpleLedgerEntries]);

  // ================= SIMPLIFIED 2-ACCOUNT DEBIT/CREDIT ENTRY STATE =================
  const [txnAccountType, setTxnAccountType] = useState<"PARTY" | "GENERAL">("PARTY");
  const [txnPartyType, setTxnPartyType] = useState<"CUSTOMER" | "VENDOR" | "EMPLOYEE">("CUSTOMER");
  const [txnTargetPartyId, setTxnTargetPartyId] = useState("");
  const [txnTargetPartyName, setTxnTargetPartyName] = useState("");
  const [txnTargetGeneralAccount, setTxnTargetGeneralAccount] = useState("Sales Revenue");
  const [txnDirection, setTxnDirection] = useState<"DEBIT" | "CREDIT">("DEBIT"); // DEBIT or CREDIT on Target Account
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split("T")[0]);

  const [txnSourceType, setTxnSourceType] = useState<"GENERAL" | "PARTY">("GENERAL");
  const [txnSourceGeneralAccount, setTxnSourceGeneralAccount] = useState("Cash in Hand");
  const [txnSourcePartyType, setTxnSourcePartyType] = useState<"CUSTOMER" | "VENDOR" | "EMPLOYEE">("CUSTOMER");
  const [txnSourcePartyId, setTxnSourcePartyId] = useState("");
  const [txnSourcePartyName, setTxnSourcePartyName] = useState("");

  const [txnPaymentMethod, setTxnPaymentMethod] = useState("BANK");
  const [txnReferenceNumber, setTxnReferenceNumber] = useState("");
  const [txnNarration, setTxnNarration] = useState("");
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

  // ================= FINANCIAL ACCOUNTS & LINKED DOCS STATE =================
  const [accountsData, setAccountsData] = useState<any[]>([]);
  const [partyAccountsList, setPartyAccountsList] = useState<any>({ customers: [], vendors: [], employees: [], all: [] });
  const [partyAccountTab, setPartyAccountTab] = useState<"all" | "customers" | "vendors" | "employees">("all");
  const [partyAccountSearch, setPartyAccountSearch] = useState("");
  const [partyStatusFilter, setPartyStatusFilter] = useState<"all" | "receivable" | "payable" | "settled">("all");

  const [partiesList, setPartiesList] = useState<any>({ customers: [], vendors: [], employees: [] });
  const [documentsList, setDocumentsList] = useState<any>({ invoices: [], purchaseOrders: [], deliveryOrders: [], complaints: [] });
  const [accountsLoading, setAccountsLoading] = useState(false);

  // Unified List of all Customers, Vendors, and Employees for Universal Search
  const universalPartiesList = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      type: "CUSTOMER" | "VENDOR" | "EMPLOYEE";
      phone?: string;
      email?: string;
      extra?: string;
      balance?: number;
    }> = [];

    (partiesList.customers || []).forEach((c: any) => {
      list.push({
        id: c.id,
        name: c.name,
        type: "CUSTOMER",
        phone: c.phone || "",
        email: c.email || "",
        extra: c.address || "",
        balance: c.balance,
      });
    });

    (partiesList.vendors || []).forEach((v: any) => {
      list.push({
        id: v.id,
        name: v.name,
        type: "VENDOR",
        phone: v.phone || "",
        email: v.email || "",
        extra: v.contactPerson ? `Contact: ${v.contactPerson}` : "",
        balance: v.balance,
      });
    });

    (partiesList.employees || []).forEach((e: any) => {
      list.push({
        id: e.id,
        name: e.name,
        type: "EMPLOYEE",
        phone: e.phone || "",
        email: e.email || "",
        extra: e.department ? `${e.department} - ${e.position || "Staff"}` : "Staff Member",
        balance: e.balance,
      });
    });

    return list;
  }, [partiesList]);

  // Document Linking State
  const [linkedDocType, setLinkedDocType] = useState<"NONE" | "INVOICE" | "PO" | "DO" | "COMPLAINT">("NONE");
  const [linkedDocId, setLinkedDocId] = useState("");
  const [linkedDocNumber, setLinkedDocNumber] = useState("");

  // ================= CUSTOMER & VENDOR ACCOUNT MODAL STATE =================
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingVendor, setIsSavingVendor] = useState(false);
  const [modalContext, setModalContext] = useState<"statement" | "record" | "source">("statement");

  const [customerForm, setCustomerForm] = useState({
    originalName: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    ntn: "",
    openingBalance: "",
    notes: "",
  });

  const [vendorForm, setVendorForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    ntn: "",
    address: "",
    paymentTerms: "Net 30 Days",
  });

  // Helper date presets for SOA
  const applySoaPreset = (preset: "this_month" | "last_30" | "ytd" | "all") => {
    setSoaPreset(preset);
    const now = new Date();
    const end = now.toISOString().split("T")[0];
    setSoaEndDate(end);
    if (preset === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setSoaStartDate(first.toISOString().split("T")[0]);
    } else if (preset === "last_30") {
      const prev30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setSoaStartDate(prev30.toISOString().split("T")[0]);
    } else if (preset === "ytd") {
      const ytd = new Date(now.getFullYear(), 0, 1);
      setSoaStartDate(ytd.toISOString().split("T")[0]);
    } else if (preset === "all") {
      setSoaStartDate("2024-01-01");
    }
  };

  const fetchFinancials = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const res = await fetch(`/api/finance/insights?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch financial data");

      const json = await res.json();
      if (json.success) setData(json);
      else throw new Error(json.error || "Failed to load financials");
    } catch (err: any) {
      console.error("Financials fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAccountsAndParties = async () => {
    setAccountsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const [accRes, custRes, vendRes] = await Promise.all([
        fetch("/api/finance/accounts", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/finance/customers", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/procurement/vendors", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      let accounts = [];
      let partyAccounts = { customers: [], vendors: [], employees: [], all: [] };
      let parties: any = { customers: [], vendors: [], employees: [] };
      let docs: any = { invoices: [], purchaseOrders: [], deliveryOrders: [], complaints: [] };

      if (accRes.ok) {
        const accJson = await accRes.json();
        accounts = accJson.accounts || [];
        partyAccounts = accJson.partyAccounts || partyAccounts;
        parties = accJson.parties || parties;
        docs = accJson.documents || docs;
      }

      if (custRes.ok) {
        const custJson = await custRes.json();
        if (custJson.customers && custJson.customers.length > 0) {
          parties.customers = custJson.customers;
        }
      }

      if (vendRes.ok) {
        const vendJson = await vendRes.json();
        if (vendJson.vendors && vendJson.vendors.length > 0) {
          parties.vendors = vendJson.vendors;
        }
      }

      setAccountsData(accounts);
      setPartyAccountsList(partyAccounts);
      setPartiesList(parties);
      setDocumentsList(docs);
    } catch (err) {
      console.error("Failed to load accounts and documents:", err);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchGeneralLedger = async () => {
    setGlLoading(true);
    const token = localStorage.getItem("token");
    try {
      let url = `/api/finance/journal?search=${encodeURIComponent(glSearch)}&limit=200`;
      if (glSourceType) url += `&sourceType=${glSourceType}`;
      if (glStartDate) url += `&startDate=${glStartDate}`;
      if (glEndDate) url += `&endDate=${glEndDate}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setGeneralLedgerEntries(json.entries || []);
        setGlTotals(json.totals || { totalDebit: 0, totalCredit: 0, isBalanced: true, count: 0 });
      }
    } catch (err) {
      console.error("Failed to load General Ledger:", err);
    } finally {
      setGlLoading(false);
    }
  };

  // Quick Open Modal Handlers
  const handleOpenAddCustomer = (initialName = "", ctx: "statement" | "record" | "source" = "statement") => {
    setModalContext(ctx);
    setCustomerForm({
      originalName: "",
      name: initialName,
      phone: "",
      email: "",
      address: "",
      ntn: "",
      openingBalance: "",
      notes: "",
    });
    setShowAddCustomerModal(true);
  };

  const handleOpenEditCustomer = (cust: any) => {
    setCustomerForm({
      originalName: cust.name,
      name: cust.name,
      phone: cust.phone || "",
      email: cust.email || "",
      address: cust.address || "",
      ntn: cust.ntn || "",
      openingBalance: "",
      notes: "",
    });
    setShowEditCustomerModal(true);
  };

  const handleOpenAddVendor = (initialName = "", ctx: "statement" | "record" | "source" = "statement") => {
    setModalContext(ctx);
    setVendorForm({
      name: initialName,
      contactPerson: "",
      phone: "",
      email: "",
      ntn: "",
      address: "",
      paymentTerms: "Net 30 Days",
    });
    setShowAddVendorModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      toast({ title: "Customer Name Required", message: "Please enter a valid customer name.", type: "warning" });
      return;
    }

    setIsSavingCustomer(true);
    const token = localStorage.getItem("token");
    const isEdit = showEditCustomerModal;

    try {
      const url = isEdit ? "/api/finance/customers" : "/api/finance/customers";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(customerForm),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save customer account");

      toast({
        title: isEdit ? "Customer Account Updated" : "Customer Account Created",
        message: `${customerForm.name} saved successfully with direct ledger tracking.`,
        type: "success",
      });

      await fetchAccountsAndParties();

      if (modalContext === "statement") {
        setPartyType("CUSTOMER");
        setSelectedPartyName(customerForm.name);
        fetchPartyLedger(customerForm.name, "");
      } else if (modalContext === "source") {
        setTxnSourcePartyName(customerForm.name);
      } else {
        setTxnTargetPartyName(customerForm.name);
      }

      setShowAddCustomerModal(false);
      setShowEditCustomerModal(false);
    } catch (err: any) {
      toast({ title: "Failed to Save", message: err.message, type: "error" });
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim() || !vendorForm.contactPerson.trim() || !vendorForm.phone.trim()) {
      toast({
        title: "Required Fields Missing",
        message: "Vendor Name, Contact Person, and Phone are required.",
        type: "warning",
      });
      return;
    }

    setIsSavingVendor(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/procurement/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(vendorForm),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create vendor account");

      toast({
        title: "Vendor Registered",
        message: `${vendorForm.name} added to vendor database.`,
        type: "success",
      });

      await fetchAccountsAndParties();

      const created = json.vendor;
      if (modalContext === "statement") {
        setPartyType("VENDOR");
        setSelectedPartyId(created?.id || "");
        setSelectedPartyName(created?.name || vendorForm.name);
        fetchPartyLedger(created?.name || vendorForm.name, created?.id || "");
      } else if (modalContext === "source") {
        setTxnSourcePartyId(created?.id || "");
        setTxnSourcePartyName(created?.name || vendorForm.name);
      } else {
        setTxnTargetPartyId(created?.id || "");
        setTxnTargetPartyName(created?.name || vendorForm.name);
      }

      setShowAddVendorModal(false);
    } catch (err: any) {
      toast({ title: "Failed to Register Vendor", message: err.message, type: "error" });
    } finally {
      setIsSavingVendor(false);
    }
  };

  const handleJumpToStatement = (type: "CUSTOMER" | "VENDOR" | "EMPLOYEE", name: string, id?: string) => {
    setActiveSection("statements");
    setPartyType(type);
    setSelectedPartyName(name);
    setSelectedPartyId(id || "");
    fetchPartyLedger(name, id || "");
  };

  const fetchVouchers = async () => {
    setVouchersLoading(true);
    const token = localStorage.getItem("token");
    try {
      let url = `/api/finance/vouchers?search=${voucherSearch}`;
      if (voucherFilterType) url += `&voucherType=${voucherFilterType}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setVouchers(json.vouchers || []);
      }
    } catch (err) {
      console.error("Failed to load vouchers:", err);
    } finally {
      setVouchersLoading(false);
    }
  };

  const fetchPartyLedger = async (
    explicitPartyName?: string,
    explicitPartyId?: string,
    explicitPartyType?: "CUSTOMER" | "VENDOR" | "EMPLOYEE"
  ) => {
    const pName = explicitPartyName !== undefined ? explicitPartyName : selectedPartyName;
    const pId = explicitPartyId !== undefined ? explicitPartyId : selectedPartyId;
    const pType = explicitPartyType !== undefined ? explicitPartyType : partyType;

    if (!pName && !pId) {
      toast({ title: "Select a Party", message: "Please choose a customer, vendor or staff member.", type: "warning" });
      return;
    }
    setSoaLoading(true);
    const token = localStorage.getItem("token");
    try {
      const url = `/api/finance/party-ledger?partyType=${pType}&partyId=${pId || ""}&partyName=${encodeURIComponent(pName)}&startDate=${soaStartDate}&endDate=${soaEndDate}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setSoaData(json);
      }
    } catch (err) {
      console.error("Failed to load party statement:", err);
      toast({ title: "Failed to Load Statement", message: "Could not retrieve ledger records.", type: "error" });
    } finally {
      setSoaLoading(false);
    }
  };

  // Synchronize URL search parameters (tab, partyType, partyName, partyId)
  useEffect(() => {
    if (!searchParams) return;
    const tab = searchParams.get("tab");
    const pType = searchParams.get("partyType");
    const pName = searchParams.get("partyName");
    const pId = searchParams.get("partyId");

    if (tab === "general-ledger" || tab === "gl" || tab === "entries") {
      setActiveSection("entries");
      fetchGeneralLedger();
    } else if (tab === "accounts" || tab === "financial-accounts") {
      setActiveSection("accounts");
      fetchAccountsAndParties();
    } else if (tab === "record" || tab === "add") {
      setActiveSection("record");
    } else if (tab === "overview" || tab === "analytics") {
      setActiveSection("overview");
    } else if (tab === "statements" || tab === "ledger" || pName || pType) {
      setActiveSection("statements");
      if (pType === "CUSTOMER" || pType === "VENDOR" || pType === "EMPLOYEE") {
        setPartyType(pType);
      }
      if (pName) {
        setSelectedPartyName(pName);
        fetchPartyLedger(pName, pId || "");
      }
      if (pId) {
        setSelectedPartyId(pId);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchFinancials();
    fetchAccountsAndParties();
  }, [startDate, endDate]);

  useEffect(() => {
    if (activeSection === "entries") {
      fetchVouchers();
      fetchGeneralLedger();
    } else if (activeSection === "accounts") {
      fetchAccountsAndParties();
    }
  }, [activeSection, voucherFilterType, voucherSearch]);

  // Set default party when partiesList is loaded
  useEffect(() => {
    if (partiesList.customers?.length > 0 && !selectedPartyName && partyType === "CUSTOMER") {
      setSelectedPartyName(partiesList.customers[0].name);
    }
  }, [partiesList, partyType]);

  // Dynamic double entry preview
  const journalPreview = useMemo(() => {
    let targetAcc = "Accounts Receivable (Trade Debtors)";
    let targetPartyId: string | null = null;
    let targetPartyName: string | null = null;
    let targetPartyType: "CUSTOMER" | "VENDOR" | "EMPLOYEE" | "GENERAL" = "GENERAL";

    if (txnAccountType === "PARTY") {
      targetPartyType = txnPartyType;
      targetPartyId = txnTargetPartyId || null;
      targetPartyName = txnTargetPartyName || null;
      if (txnPartyType === "CUSTOMER") targetAcc = "Accounts Receivable (Trade Debtors)";
      else if (txnPartyType === "VENDOR") targetAcc = "Accounts Payable (Trade Creditors)";
      else if (txnPartyType === "EMPLOYEE") targetAcc = "Employee Advance";
    } else {
      targetAcc = txnTargetGeneralAccount;
    }

    let sourceAcc = txnSourceGeneralAccount || "Cash in Hand";
    let sourcePartyId: string | null = null;
    let sourcePartyName: string | null = null;

    if (txnSourceType === "GENERAL") {
      sourceAcc = txnSourceGeneralAccount || "Cash in Hand";
    } else {
      sourcePartyId = txnSourcePartyId || null;
      sourcePartyName = txnSourcePartyName || null;
      if (txnSourcePartyType === "CUSTOMER") sourceAcc = "Accounts Receivable (Trade Debtors)";
      else if (txnSourcePartyType === "VENDOR") sourceAcc = "Accounts Payable (Trade Creditors)";
      else if (txnSourcePartyType === "EMPLOYEE") sourceAcc = "Employee Advance";
    }

    let debitAccount = targetAcc;
    let creditAccount = sourceAcc;
    let debitPartyId = targetPartyId;
    let creditPartyId = sourcePartyId;

    if (txnDirection === "DEBIT") {
      debitAccount = targetAcc;
      debitPartyId = targetPartyId;
      creditAccount = sourceAcc;
      creditPartyId = sourcePartyId;
    } else {
      debitAccount = sourceAcc;
      debitPartyId = sourcePartyId;
      creditAccount = targetAcc;
      creditPartyId = targetPartyId;
    }

    let voucherType = "JV";
    const hasBank = debitAccount.toLowerCase().includes("bank") || creditAccount.toLowerCase().includes("bank");
    const hasCash = debitAccount.toLowerCase().includes("cash") || creditAccount.toLowerCase().includes("cash");

    if (hasBank && hasCash) {
      voucherType = "CV";
    } else if (hasBank) {
      voucherType = txnDirection === "CREDIT" ? "BRV" : "BPV";
    } else if (hasCash) {
      voucherType = txnDirection === "CREDIT" ? "CRV" : "CPV";
    } else if (targetAcc.includes("Employee") || sourceAcc.includes("Employee")) {
      voucherType = "EAV";
    }

    const typeLabel = txnDirection === "DEBIT"
      ? `Debit ${targetAcc} / Credit ${sourceAcc}`
      : `Credit ${targetAcc} / Debit ${sourceAcc}`;

    return {
      voucherType,
      debitAccount,
      creditAccount,
      debitPartyId,
      creditPartyId,
      targetAcc,
      sourceAcc,
      targetPartyType,
      targetPartyId,
      targetPartyName,
      typeLabel,
    };
  }, [
    txnAccountType,
    txnPartyType,
    txnTargetPartyId,
    txnTargetPartyName,
    txnTargetGeneralAccount,
    txnDirection,
    txnSourceType,
    txnSourceGeneralAccount,
    txnSourcePartyType,
    txnSourcePartyId,
    txnSourcePartyName,
  ]);

  // Key Balance Aggregates for Header Bar
  const keyMetrics = useMemo(() => {
    const cashAcc = accountsData.find((a) => a.name?.toLowerCase().includes("cash"));
    const bankAccounts = accountsData.filter((a) => a.name?.toLowerCase().includes("bank"));
    const arAcc = accountsData.find((a) => a.name?.includes("Receivable"));
    const apAcc = accountsData.find((a) => a.name?.includes("Payable"));

    const totalBankBalance = bankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalLiquidCash = (cashAcc?.balance || 0) + totalBankBalance;
    const totalAR = arAcc?.balance || 0;
    const totalAP = apAcc?.balance || 0;

    return {
      liquidCash: totalLiquidCash,
      receivables: totalAR,
      payables: totalAP,
      cashInHand: cashAcc?.balance || 0,
      bankBalance: totalBankBalance,
    };
  }, [accountsData]);

  // Filtered party list for searching
  const filteredParties = useMemo(() => {
    const query = partySearchQuery.toLowerCase().trim();
    if (partyType === "CUSTOMER") {
      return (partiesList.customers || []).filter((c: any) => !query || c.name.toLowerCase().includes(query));
    } else if (partyType === "VENDOR") {
      return (partiesList.vendors || []).filter((v: any) => !query || v.name.toLowerCase().includes(query));
    } else {
      return (partiesList.employees || []).filter((e: any) => !query || e.name.toLowerCase().includes(query));
    }
  }, [partiesList, partyType, partySearchQuery]);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingEntry) return;
    if (!txnAmount || Number(txnAmount) <= 0) {
      toast({ title: "Validation Error", message: "Please specify a valid transaction amount.", type: "warning" });
      return;
    }
    if (!txnNarration) {
      toast({ title: "Validation Error", message: "Please provide a clear narration or reason.", type: "warning" });
      return;
    }

    setIsSubmittingEntry(true);
    const token = localStorage.getItem("token");

    const finalDescription = linkedDocNumber
      ? `[Linked ${linkedDocType}: ${linkedDocNumber}] ${txnNarration}`
      : txnNarration;

    try {
      const res = await fetch("/api/finance/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          voucherType: journalPreview.voucherType,
          entryDate: txnDate,
          debitAccount: journalPreview.debitAccount,
          creditAccount: journalPreview.creditAccount,
          debitPartyId: journalPreview.debitPartyId || undefined,
          creditPartyId: journalPreview.creditPartyId || undefined,
          amount: Number(txnAmount),
          partyType: journalPreview.targetPartyType,
          partyId: journalPreview.targetPartyId || undefined,
          partyName: journalPreview.targetPartyName || undefined,
          paymentMethod: txnPaymentMethod,
          chequeNumber: txnReferenceNumber || undefined,
          description: finalDescription,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record transaction");

      toast({
        title: "Transaction Posted Successfully",
        message: `${json.voucher.voucherNumber} logged with balanced double-entry.`,
        type: "success",
      });

      // Clear & Refresh
      setTxnAmount("");
      setTxnReferenceNumber("");
      setTxnNarration("");
      setLinkedDocType("NONE");
      setLinkedDocId("");
      setLinkedDocNumber("");
      fetchVouchers();
      fetchGeneralLedger();
      fetchAccountsAndParties();
      setActiveSection("entries");
    } catch (err: any) {
      toast({ title: "Failed to Save", message: err.message, type: "error" });
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  const handleDownloadSOAPDF = () => {
    if (!soaData) return;
    const token = localStorage.getItem("token") || "";
    const url = `/api/pdf?type=soa&partyType=${partyType}&partyId=${selectedPartyId}&partyName=${encodeURIComponent(
      selectedPartyName
    )}&startDate=${soaStartDate}&endDate=${soaEndDate}&inline=true&token=${token}`;
    window.open(url, "_blank");
  };

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatCompact = (amount: number) => {
    if (Math.abs(amount) >= 1_000_000) return (amount / 1_000_000).toFixed(2) + "M";
    if (Math.abs(amount) >= 1_000) return (amount / 1_000).toFixed(0) + "K";
    return String(Math.round(amount));
  };

  const kpis = data?.kpis;
  const timeline = data?.timeline || [];

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* ========================================================================= */}
      {/* TOP HERO HEADER & METRICS BAR                                             */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                  Financial Ledger & Sub-Accounts
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                Accounts & Financial Ledger
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Record receipts, vendor disbursements, employee advances, and inspect audit-ready sub-ledger statements.
              </p>
            </div>
          </div>

          {/* Quick Action */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveSection("statements");
                if (selectedPartyName) {
                  fetchPartyLedger(selectedPartyName, selectedPartyId);
                }
              }}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black transition-all shadow-xs flex items-center gap-2 transform active:scale-95"
            >
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Statement of Accounts</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection("record");
                setTxnNarration("Advance payment received");
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-blue-500/25 flex items-center gap-2 transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Record Transaction</span>
            </button>
          </div>
        </div>

        {/* Modern Segmented Navigation Tabs Dock */}
        <div className="flex items-center overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div className="inline-flex bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 gap-1.5 shadow-inner">
            <button
              onClick={() => setActiveSection("overview")}
              className={`px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                activeSection === "overview"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-black shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span>Financial Insights & Analytics</span>
            </button>

            <button
              onClick={() => {
                setActiveSection("statements");
                if (selectedPartyName) {
                  fetchPartyLedger(selectedPartyName, selectedPartyId);
                }
              }}
              className={`px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                activeSection === "statements"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-black shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "hover:text-slate-900 dark:hover:text-white text-slate-700 dark:text-slate-300"
              }`}
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Statement of Account (Customer/Vendor Ledger)</span>
            </button>

            <button
              onClick={() => setActiveSection("record")}
              className={`px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                activeSection === "record"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-md shadow-blue-500/25"
                  : "hover:text-slate-900 dark:hover:text-white text-slate-700 dark:text-slate-300"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Record Debit / Credit</span>
            </button>

            <button
              onClick={() => setActiveSection("entries")}
              className={`px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                activeSection === "entries"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-black shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>Universal General Ledger</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                Balanced Dr=Cr
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: UNIVERSAL STATEMENT OF ACCOUNT (SUB-LEDGER)                       */}
      {/* ========================================================================= */}
      {activeSection === "statements" && (
        <div className="space-y-6">
          {/* Controls & Filter Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Statement of Account (Universal Sub-Ledger)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Search any Customer, Vendor, or Staff Member to view their real-time ledger statement and running balances.
                </p>
              </div>

              {/* Total registered counts badge */}
              <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100/80 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                <span className="text-blue-600 dark:text-blue-400 font-bold">{partiesList.customers?.length || 0} Customers</span>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{partiesList.vendors?.length || 0} Vendors</span>
                <span>•</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{partiesList.employees?.length || 0} Staff</span>
              </div>
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              {/* Universal Party Search Bar */}
              <div className="lg:col-span-5">
                <UniversalPartyCombobox
                  selectedName={selectedPartyName}
                  selectedId={selectedPartyId}
                  selectedType={partyType}
                  parties={universalPartiesList}
                  placeholder="Search customer, vendor, or staff by name, phone..."
                  onSelect={(party) => {
                    if (party) {
                      setPartyType(party.type);
                      setSelectedPartyName(party.name);
                      setSelectedPartyId(party.id || "");
                      fetchPartyLedger(party.name, party.id || "", party.type);
                    } else {
                      setSelectedPartyName("");
                      setSelectedPartyId("");
                      setSoaData(null);
                    }
                  }}
                  onAddNewCustomer={(initialName) => handleOpenAddCustomer(initialName, "statement")}
                  onAddNewVendor={(initialName) => handleOpenAddVendor(initialName, "statement")}
                />
              </div>

              {/* Date Presets and Pickers */}
              <div className="lg:col-span-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Statement Period</span>
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => applySoaPreset("this_month")}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        soaPreset === "this_month"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => applySoaPreset("last_30")}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        soaPreset === "last_30"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => applySoaPreset("ytd")}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        soaPreset === "ytd"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      YTD
                    </button>
                    <button
                      type="button"
                      onClick={() => applySoaPreset("all")}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        soaPreset === "all"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      All Time
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                    value={soaStartDate}
                    onChange={(e) => setSoaStartDate(e.target.value)}
                  />
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                    value={soaEndDate}
                    onChange={(e) => setSoaEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="lg:col-span-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchPartyLedger()}
                  disabled={soaLoading || (!selectedPartyName && !selectedPartyId)}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  {soaLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  <span>{soaLoading ? "Loading..." : "View Statement"}</span>
                </button>

                {soaData && (
                  <button
                    type="button"
                    onClick={handleDownloadSOAPDF}
                    title="Download Official PDF Statement"
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-xs"
                  >
                    <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                )}
              </div>
            </div>
          </div>


          {/* Statement Presentation Area */}
          {soaData ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm space-y-6 p-6 animate-fadeIn">
              {/* Party Profile & Key KPIs Header Banner */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 rounded-2xl border border-blue-100/80 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/25 shrink-0">
                    {soaData.partyInfo?.name?.substring(0, 2).toUpperCase() || "AC"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 uppercase tracking-widest">
                        {partyType} Statement
                      </span>
                      {soaData.partyInfo?.phone && (
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                          📞 {soaData.partyInfo?.phone}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {soaData.partyInfo?.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Period: <strong className="font-mono text-slate-700 dark:text-slate-300">{soaStartDate}</strong> to{" "}
                      <strong className="font-mono text-slate-700 dark:text-slate-300">{soaEndDate}</strong>
                    </p>
                  </div>
                </div>

                {/* 4 Financial Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Opening Balance</span>
                    <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 mt-1 block">
                      PKR {Math.round(soaData.openingBalance || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block">Total Debited / Billed</span>
                    <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400 mt-1 block">
                      PKR {Math.round(soaData.totals?.totalDebit || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">Total Credited / Paid</span>
                    <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                      PKR {Math.round(soaData.totals?.totalCredit || 0).toLocaleString()}
                    </span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl border shadow-sm ${
                      soaData.totals?.closingBalance > 0
                        ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60"
                        : soaData.totals?.closingBalance < 0
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest block text-slate-500 dark:text-slate-400">
                      Net Balance Due
                    </span>
                    <span
                      className={`text-base font-black font-mono mt-1 block ${
                        soaData.totals?.closingBalance > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : soaData.totals?.closingBalance < 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      PKR {Math.abs(Math.round(soaData.totals?.closingBalance || 0)).toLocaleString()}
                    </span>
                    <span
                      className={`block text-[9px] font-black uppercase mt-0.5 ${
                        soaData.totals?.closingBalance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {soaData.totals?.closingBalance > 0
                        ? partyType === "CUSTOMER"
                          ? "Receivable (Customer Owes Us)"
                          : "Payable (We Owe Vendor)"
                        : soaData.totals?.closingBalance < 0
                        ? partyType === "CUSTOMER"
                          ? "Advance Credit Held"
                          : "Advance Paid to Vendor"
                        : "Balanced / Settled"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions Sub-Ledger Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Reference #</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Particulars / Reason</th>
                      <th className="p-3.5 text-right text-rose-600 dark:text-rose-400">Debit (Billed / Given)</th>
                      <th className="p-3.5 text-right text-emerald-600 dark:text-emerald-400">Credit (Received / Paid)</th>
                      <th className="p-3.5 text-right font-black">Running Balance (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {soaData.transactions?.map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {tx.date}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {tx.referenceNumber}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                              tx.docType === "INVOICE"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : tx.docType === "PAYMENT" || tx.docType === "ADVANCE"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : tx.docType === "GRN" || tx.docType === "PO"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            }`}
                          >
                            {tx.docType}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300 max-w-sm">
                          {tx.description}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {tx.debit > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">PKR {tx.debit.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {tx.credit > 0 ? (
                            <span>PKR {tx.credit.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-white">
                          PKR {tx.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {soaData.transactions?.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          No transactions found during this timeframe. Try selecting "All Time".
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-950/90 font-bold border-t border-slate-200 dark:border-slate-800">
                    <tr>
                      <td colSpan={4} className="p-4 text-right text-slate-500 uppercase tracking-wider text-xs">
                        Period Total Summary:
                      </td>
                      <td className="p-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                        PKR {soaData.totals?.totalDebit?.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        PKR {soaData.totals?.totalCredit?.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                        PKR {soaData.totals?.closingBalance?.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-16 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-slate-800 dark:text-white">
                Select a Party to View Complete Statement
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Choose any customer, vendor, or employee above and click <strong>"View Statement"</strong> to see their full transaction history, running balance, and download an official PDF statement.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: "+ RECORD DEBIT / CREDIT" TRANSACTION ENTRY FORM                    */}
      {/* ========================================================================= */}
      {activeSection === "record" && (
        <div className="bg-white dark:bg-slate-900 p-7 lg:p-9 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-8 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <PlusCircle className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Add Financial Transaction
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select the primary account, specify Debit or Credit, choose the offsetting source account, and post.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Balanced Double-Entry Journal</span>
            </div>
          </div>

          <form onSubmit={handleSaveEntry} className="space-y-6">
            {/* Step 1: Target Account Selection */}
            <div className="space-y-3 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Select Primary Account (Who or what is this transaction for?)</span>
                </label>

                {/* Switch between Party Account vs General Account */}
                <div className="inline-flex bg-white dark:bg-slate-900 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setTxnAccountType("PARTY")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      txnAccountType === "PARTY"
                        ? "bg-blue-600 text-white font-black shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    👤 Party Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxnAccountType("GENERAL")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      txnAccountType === "GENERAL"
                        ? "bg-blue-600 text-white font-black shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    🏛️ General Account
                  </button>
                </div>
              </div>

              {txnAccountType === "PARTY" ? (
                <div className="space-y-3 pt-2">
                  <div className="flex gap-2">
                    {(["CUSTOMER", "VENDOR", "EMPLOYEE"] as const).map((pType) => (
                      <button
                        key={pType}
                        type="button"
                        onClick={() => {
                          setTxnPartyType(pType);
                          setTxnTargetPartyId("");
                          setTxnTargetPartyName("");
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          txnPartyType === pType
                            ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500 font-black"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        {pType === "CUSTOMER" ? "Customer" : pType === "VENDOR" ? "Vendor" : "Staff"}
                      </button>
                    ))}
                  </div>

                  <SearchablePartyCombobox
                    label={`Choose ${txnPartyType === "CUSTOMER" ? "Customer" : txnPartyType === "VENDOR" ? "Vendor" : "Staff Member"}`}
                    type={txnPartyType}
                    selectedName={txnTargetPartyName}
                    selectedId={txnTargetPartyId}
                    parties={
                      txnPartyType === "CUSTOMER"
                        ? partiesList.customers || []
                        : txnPartyType === "VENDOR"
                        ? partiesList.vendors || []
                        : partiesList.employees || []
                    }
                    placeholder={`Search ${txnPartyType.toLowerCase()} by name, phone...`}
                    onSelect={(party) => {
                      if (party) {
                        setTxnTargetPartyName(party.name);
                        setTxnTargetPartyId(party.id || "");
                      } else {
                        setTxnTargetPartyName("");
                        setTxnTargetPartyId("");
                      }
                    }}
                    onAddNew={(initialName) => {
                      if (txnPartyType === "CUSTOMER") handleOpenAddCustomer(initialName, "record");
                      else if (txnPartyType === "VENDOR") handleOpenAddVendor(initialName, "record");
                    }}
                  />
                </div>
              ) : (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Select General Ledger Account
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={txnTargetGeneralAccount}
                    onChange={(e) => setTxnTargetGeneralAccount(e.target.value)}
                  >
                    {accountsData.map((acc) => (
                      <option key={acc.name} value={acc.name}>
                        {acc.name} ({acc.type} - Balance: PKR {acc.balance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Step 2: Action / Direction on this Account */}
            <div className="space-y-2 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
              <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>Direction on Primary Account</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setTxnDirection("DEBIT")}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    txnDirection === "DEBIT"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-900 dark:text-emerald-100"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>DEBIT (+ Inflow / Increase Receivable / Expense)</span>
                    </span>
                    {txnDirection === "DEBIT" && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    Charges customer, disburses staff advance, logs expense, or increases asset.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTxnDirection("CREDIT")}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    txnDirection === "CREDIT"
                      ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30 text-blue-900 dark:text-blue-100"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                      <span>CREDIT (- Outflow / Payment Received / Settled)</span>
                    </span>
                    {txnDirection === "CREDIT" && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    Receives customer payment, settles invoice/bill, earns revenue, or reduces balance.
                  </p>
                </button>
              </div>
            </div>

            {/* Step 3: Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Amount (PKR) <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">
                    PKR
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    placeholder="e.g. 50,000"
                    className="w-full pl-12 pr-3.5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-mono font-black text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                    value={txnAmount}
                    onChange={(e) => setTxnAmount(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[10000, 25000, 50000, 100000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTxnAmount(String(amt))}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      +{amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                  {txnAmount && (
                    <button
                      type="button"
                      onClick={() => setTxnAmount("")}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Transaction Date</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-3.5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                  value={txnDate}
                  onChange={(e) => setTxnDate(e.target.value)}
                />
              </div>
            </div>

            {/* Step 4: Source / Offsetting Account */}
            <div className="space-y-3 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>Source / Offsetting Account (Where did funds come from / go to?)</span>
                </label>
                <span className="text-[11px] text-slate-400">Type any custom account or choose below</span>
              </div>

              {/* Real-time Searchable & Editable Combobox Dropdown */}
              <SearchableAccountCombobox
                value={txnSourceGeneralAccount}
                onChange={(val) => {
                  setTxnSourceType("GENERAL");
                  setTxnSourceGeneralAccount(val);
                }}
                placeholder="Type or search account name (e.g. Bank Account, Cash in Hand, Expenses)..."
              />

              {/* Simple Easy Quick-Select Option Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Select:</span>
                {[
                  "Cash in Hand",
                  "Bank Account",
                  "Sales Revenue",
                  "Operating Expenses",
                  "Office Rent & Utilities",
                  "Salary & Wage Expense",
                  "Owner Capital / Equity",
                  "General Expense",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setTxnSourceType("GENERAL");
                      setTxnSourceGeneralAccount(item);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
                      txnSourceGeneralAccount === item
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold ring-1 ring-blue-500"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 5: Narration & Document Linking */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
              <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">5</span>
                <span>Narration & Reference</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Narration / Reason <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Online transfer received for Project Ducting Phase 1"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                    value={txnNarration}
                    onChange={(e) => setTxnNarration(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Cheque / Reference # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CHQ-99120 or Online Ref / TXN-ID"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                    value={txnReferenceNumber}
                    onChange={(e) => setTxnReferenceNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* FORM ACTIONS */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTxnAmount("");
                  setTxnReferenceNumber("");
                  setTxnNarration("");
                }}
                className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={isSubmittingEntry || !txnAmount || Number(txnAmount) <= 0}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-98 cursor-pointer"
              >
                {isSubmittingEntry ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{isSubmittingEntry ? "Posting Transaction..." : "✓ Save & Post Transaction"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: UNIVERSAL GENERAL LEDGER & SIMPLE LEDGER                            */}
      {/* ========================================================================= */}
      {activeSection === "entries" && (
        <div className="space-y-5 animate-fadeIn">
          {/* Quick Metrics Bar for Simple View */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Transactions
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-white">
                {simpleStats.count} <span className="text-xs font-medium text-slate-400">entries</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Total Debits (+ Inflow / Billed)</span>
              </span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                PKR {Math.round(simpleStats.totalDebits).toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs">
              <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Total Credits (- Outflow / Settled)</span>
              </span>
              <span className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">
                PKR {Math.round(simpleStats.totalCredits).toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Net Balance Position
              </span>
              <span
                className={`text-xl font-black font-mono ${
                  simpleStats.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {simpleStats.net >= 0 ? "+" : ""}PKR {Math.round(simpleStats.net).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Filter, Search & View Switcher Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search party, narration, ref, account..."
                  className="pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium w-64 focus:ring-2 focus:ring-blue-500"
                  value={glSearch}
                  onChange={(e) => setGlSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchGeneralLedger()}
                />
              </div>

              {/* Source Type Filter */}
              <select
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                value={glSourceType}
                onChange={(e) => {
                  setGlSourceType(e.target.value);
                  setTimeout(fetchGeneralLedger, 50);
                }}
              >
                <option value="">All Categories</option>
                <option value="INVOICE">Invoices</option>
                <option value="VOUCHER">Vouchers (Payment/Receipt)</option>
                <option value="GRN">Purchases (GRN)</option>
                <option value="PAYROLL">Payroll</option>
                <option value="MANUAL">Manual Entries</option>
              </select>

              {/* Direction Filter Pills */}
              <div className="inline-flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => setGlDirectionFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    glDirectionFilter === "ALL"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setGlDirectionFilter("DEBIT")}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    glDirectionFilter === "DEBIT"
                      ? "bg-emerald-500 text-white shadow-2xs font-black"
                      : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  }`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>Debits (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGlDirectionFilter("CREDIT")}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    glDirectionFilter === "CREDIT"
                      ? "bg-blue-600 text-white shadow-2xs font-black"
                      : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Credits (-)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* View Switcher: Simple vs Double-Entry */}
              <div className="inline-flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLedgerViewMode("simple")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    ledgerViewMode === "simple"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Simple Ledger</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerViewMode("accounting")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    ledgerViewMode === "accounting"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Scale className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Double-Entry View</span>
                </button>
              </div>

              <button
                type="button"
                onClick={fetchGeneralLedger}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
                title="Refresh Ledger"
              >
                <RefreshCw className={`w-4 h-4 ${glLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => setActiveSection("record")}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer transform active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add Entry</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* VIEW 1: SUPER SIMPLE LEDGER TABLE                          */}
          {/* ========================================================= */}
          {ledgerViewMode === "simple" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 w-36">Date & Time</th>
                      <th className="p-3.5">Party / Account</th>
                      <th className="p-3.5">Type & Reference</th>
                      <th className="p-3.5 max-w-sm">Narration / Reason</th>
                      <th className="p-3.5 text-center">Type</th>
                      <th className="p-3.5 text-right">Amount (PKR)</th>
                      <th className="p-3.5 text-center w-16">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {glLoading ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                          Loading ledger transactions...
                        </td>
                      </tr>
                    ) : displayedLedgerList.length > 0 ? (
                      displayedLedgerList.map(({ entry, details }) => {
                        const isExpanded = expandedEntryId === entry.id;
                        return (
                          <React.Fragment key={entry.id}>
                            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                              {/* Date & Time */}
                              <td className="p-3.5 whitespace-nowrap align-middle">
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {details.dateStr}
                                </div>
                                <div className="text-[10.5px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                  <span>🕒 {details.timeStr}</span>
                                </div>
                              </td>

                              {/* Party / Account */}
                              <td className="p-3.5 align-middle">
                                {details.partyName ? (
                                  <div>
                                    <div className="font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                                      <span>{details.partyName}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                      {details.partyType || "Party Account"} • <span className="font-mono">{details.mainAccount}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-bold text-slate-700 dark:text-slate-200">
                                      {details.mainAccount}
                                    </div>
                                    <div className="text-[10px] text-slate-400">General Ledger Account</div>
                                  </div>
                                )}
                              </td>

                              {/* Type & Reference */}
                              <td className="p-3.5 align-middle">
                                <div className="flex flex-col gap-1">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border w-fit ${details.sourceBadgeBg}`}>
                                    {details.sourceLabel}
                                  </span>
                                  {entry.sourceId && (
                                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]" title={entry.sourceId}>
                                      #{entry.sourceId.substring(0, 14)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Narration */}
                              <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-sm align-middle leading-relaxed">
                                {entry.narration}
                              </td>

                              {/* Type (Debit vs Credit) */}
                              <td className="p-3.5 text-center align-middle">
                                {details.direction === "DEBIT" ? (
                                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 inline-flex items-center gap-1 shadow-2xs">
                                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Debit</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 inline-flex items-center gap-1 shadow-2xs">
                                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Credit</span>
                                  </span>
                                )}
                              </td>

                              {/* Amount */}
                              <td className="p-3.5 text-right font-mono font-black text-sm align-middle whitespace-nowrap">
                                <span className={details.direction === "DEBIT" ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}>
                                  {details.direction === "DEBIT" ? "+" : "-"} PKR {Math.round(details.amount).toLocaleString()}
                                </span>
                              </td>

                              {/* Expand Breakdown */}
                              <td className="p-3.5 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                  title="View Account Breakdown"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Accounting Breakdown Accordion */}
                            {isExpanded && (
                              <tr className="bg-slate-50/80 dark:bg-slate-950/60">
                                <td colSpan={7} className="p-4 pl-10">
                                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                                      <span>Double-Entry Account Breakdown</span>
                                      <span className="text-emerald-600">✓ Balanced Double-Entry</span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {entry.lines?.map((line: any) => (
                                        <div key={line.id} className="flex items-center justify-between text-xs font-mono">
                                          <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            <span>• {line.accountName}</span>
                                            {line.partyName && (
                                              <span className="text-[10px] font-sans px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold">
                                                {line.partyName}
                                              </span>
                                            )}
                                          </span>
                                          <div className="flex items-center gap-4">
                                            {line.debit > 0 && (
                                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                Dr: PKR {line.debit.toLocaleString()}
                                              </span>
                                            )}
                                            {line.credit > 0 && (
                                              <span className="text-blue-600 dark:text-blue-400 font-bold">
                                                Cr: PKR {line.credit.toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          No transactions found matching your filters. Click <strong>"+ Add Entry"</strong> to record one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 2: TRADITIONAL ACCOUNTING DOUBLE-ENTRY TABLE          */}
          {/* ========================================================= */}
          {ledgerViewMode === "accounting" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Source / Ref</th>
                      <th className="p-3.5">Narration / Description</th>
                      <th className="p-3.5">Account & Party Lines</th>
                      <th className="p-3.5 text-right text-emerald-600 dark:text-emerald-400">Debit (PKR)</th>
                      <th className="p-3.5 text-right text-blue-600 dark:text-blue-400">Credit (PKR)</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {glLoading ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                          Loading general ledger transactions...
                        </td>
                      </tr>
                    ) : generalLedgerEntries.length > 0 ? (
                      generalLedgerEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-mono whitespace-nowrap text-slate-600 dark:text-slate-400 align-top">
                            {new Date(entry.entryDate).toLocaleDateString("en-GB").replace(/\//g, "-")}
                          </td>
                          <td className="p-3.5 align-top">
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 block w-fit mb-1">
                              {entry.sourceType}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 truncate block max-w-[120px]" title={entry.sourceId || ""}>
                              {entry.sourceId ? `#${entry.sourceId.substring(0, 10)}` : "-"}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-xs align-top">
                            {entry.narration}
                          </td>
                          <td className="p-3.5 align-top space-y-1.5">
                            {entry.lines?.map((line: any) => (
                              <div key={line.id} className="flex items-center justify-between gap-3 text-[11px] font-mono">
                                <span className="text-slate-700 dark:text-slate-300">
                                  {line.accountName}
                                  {line.partyName && (
                                    <span className="ml-1 text-[10px] font-sans px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold">
                                      {line.partyName}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 align-top space-y-1.5">
                            {entry.lines?.map((line: any) => (
                              <div key={line.id}>
                                {line.debit > 0 ? `PKR ${line.debit.toLocaleString()}` : <span className="text-slate-300 dark:text-slate-700">-</span>}
                              </div>
                            ))}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400 align-top space-y-1.5">
                            {entry.lines?.map((line: any) => (
                              <div key={line.id}>
                                {line.credit > 0 ? `PKR ${line.credit.toLocaleString()}` : <span className="text-slate-300 dark:text-slate-700">-</span>}
                              </div>
                            ))}
                          </td>
                          <td className="p-3.5 text-center align-top">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                              Balanced
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          No general ledger entries found. Click <strong>"+ Add Entry"</strong> to post one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FINANCIAL ACCOUNTS & CHART OF ACCOUNTS                             */}
      {/* ========================================================================= */}
      {activeSection === "accounts" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Party Financial Accounts Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Financial Accounts (Customers, Vendors & Staff)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Dedicated financial accounts for every client, supplier, and employee with running balances.
                </p>
              </div>

              {/* Sub-Tabs: All | Customers | Vendors | Staff */}
              <div className="inline-flex bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl text-xs font-bold gap-1">
                {(["all", "customers", "vendors", "employees"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPartyAccountTab(tab)}
                    className={`px-3 py-1.5 rounded-xl transition-all capitalize font-bold ${
                      partyAccountTab === tab
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {tab === "all" ? "All Accounts" : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Search */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search party financial accounts by name, phone..."
                  className="pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium w-full focus:ring-2 focus:ring-blue-500"
                  value={partyAccountSearch}
                  onChange={(e) => setPartyAccountSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Accounts Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Account / Party Name</th>
                    <th className="p-3.5">Party Type</th>
                    <th className="p-3.5">Contact / Phone</th>
                    <th className="p-3.5 text-right text-rose-600 dark:text-rose-400">Total Debits (PKR)</th>
                    <th className="p-3.5 text-right text-emerald-600 dark:text-emerald-400">Total Credits (PKR)</th>
                    <th className="p-3.5 text-right font-black">Running Balance (PKR)</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {((partyAccountTab === "all"
                    ? partyAccountsList.all
                    : partyAccountTab === "customers"
                    ? partyAccountsList.customers
                    : partyAccountTab === "vendors"
                    ? partyAccountsList.vendors
                    : partyAccountsList.employees) || [])
                    .filter((p: any) =>
                      !partyAccountSearch ||
                      p.name.toLowerCase().includes(partyAccountSearch.toLowerCase()) ||
                      (p.phone && p.phone.includes(partyAccountSearch))
                    )
                    .map((party: any) => (
                      <tr key={party.id || party.name} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {party.name}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              party.partyType === "CUSTOMER"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : party.partyType === "VENDOR"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            }`}
                          >
                            {party.partyType}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {party.phone || "-"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {party.totalDebit > 0 ? `PKR ${party.totalDebit.toLocaleString()}` : "-"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {party.totalCredit > 0 ? `PKR ${party.totalCredit.toLocaleString()}` : "-"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-white">
                          PKR {party.balance.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-bold ${
                              party.balance > 0
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : party.balance < 0
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {party.statusLabel || "Settled"}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const token = localStorage.getItem("token") || "";
                                const url = `/api/pdf?type=soa&partyType=${party.partyType}&partyId=${party.id || ""}&partyName=${encodeURIComponent(
                                  party.name
                                )}&startDate=2024-01-01&endDate=${new Date().toISOString().split("T")[0]}&inline=true&token=${token}`;
                                window.open(url, "_blank");
                              }}
                              title="Download Official Statement PDF"
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-500" />
                              <span>PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPartyType(party.partyType);
                                setSelectedPartyName(party.name);
                                setSelectedPartyId(party.id);
                                fetchPartyLedger(party.name, party.id);
                                setActiveSection("statements");
                              }}
                              className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 font-bold rounded-lg text-xs transition-colors"
                            >
                              View Statement ➔
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FINANCIAL ANALYTICS & INSIGHTS                                     */}
      {/* ========================================================================= */}
      {activeSection === "overview" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Controls Bar: Timeframe Presets */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Financial Performance & Cash Flow Analytics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect operating metrics, revenue timeline, and double-entry cash movements across time.
              </p>
            </div>

            {/* Timeframe Presets Dock */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl text-xs font-bold border border-slate-200/60 dark:border-slate-700/60 gap-1">
                {[
                  { key: "30d", label: "Last 30 Days" },
                  { key: "this_month", label: "This Month" },
                  { key: "quarter", label: "This Quarter" },
                  { key: "ytd", label: "Year to Date" },
                  { key: "all", label: "All Time" },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyTimeframe(preset.key as any)}
                    className={`px-3 py-1.5 rounded-xl transition-all font-bold ${
                      timeframe === preset.key
                        ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm font-black"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => fetchFinancials(true)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                title="Refresh Analytics"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Top 4 KPI Metrics with Variance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Gross Revenue</span>
                <Receipt className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                PKR {formatCompact(kpis?.grossRevenue?.value || 0)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                <span>Invoiced: PKR {(kpis?.grossRevenue?.value || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">Cash Inflow</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                PKR {formatCompact(kpis?.cashInflow?.value || 0)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                <span>Collected: PKR {(kpis?.cashInflow?.value || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block">Cash Outflow</span>
                <ArrowUpRight className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                PKR {formatCompact(kpis?.cashOutflow?.value || 0)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                <span>Disbursements: PKR {(kpis?.cashOutflow?.value || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest block">Net Profit</span>
                <Coins className="w-4 h-4 text-purple-500" />
              </div>
              <div className={`text-2xl font-black font-mono ${(kpis?.netProfit?.value || 0) >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600"}`}>
                PKR {formatCompact(kpis?.netProfit?.value || 0)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                <span>Net margin: {kpis?.netMarginPct?.value || 0}%</span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs for Different Analytics Views */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => setAnalyticsTab("cashflow")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    analyticsTab === "cashflow"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  <span>Cash Flow Timeline</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAnalyticsTab("revenue")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    analyticsTab === "revenue"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Revenue & Profitability</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAnalyticsTab("expenses")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    analyticsTab === "expenses"
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <PieChartIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>Expense Breakdown</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAnalyticsTab("aging")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    analyticsTab === "aging"
                      ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  <span>AR Aging (Overdue Invoices)</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">Inflow</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">Outflow</span>
                </div>
              </div>
            </div>

            {/* TAB CONTENT 1: Cash Flow Timeline */}
            {analyticsTab === "cashflow" && (
              <div className="space-y-4">
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        dy={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        domain={[0, "auto"]}
                        allowDecimals={false}
                        tickFormatter={(v) => {
                          if (v === 0) return "0";
                          if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                          if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                          return `${v}`;
                        }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs space-y-2 backdrop-blur-md">
                                <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
                                  <span>{label}</span>
                                  <span className="text-[10px] font-mono text-slate-400">Cash Movements</span>
                                </p>
                                <div className="space-y-1.5 font-mono">
                                  {payload.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between gap-4">
                                      <span className="flex items-center gap-1.5 text-slate-300">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                                        {entry.name}:
                                      </span>
                                      <span className="font-black text-white">PKR {Number(entry.value || 0).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="inflow"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#inflowGrad)"
                        name="Cash Inflow"
                      />
                      <Area
                        type="monotone"
                        dataKey="outflow"
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#outflowGrad)"
                        name="Cash Outflow"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: Revenue vs Profit */}
            {analyticsTab === "revenue" && (
              <div className="space-y-4">
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeline} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={8} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        domain={[0, "auto"]}
                        allowDecimals={false}
                        tickFormatter={(v) => {
                          if (v === 0) return "0";
                          if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                          if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                          return `${v}`;
                        }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs space-y-2 backdrop-blur-md">
                                <p className="font-bold text-slate-300 border-b border-slate-800 pb-1">{label}</p>
                                <div className="space-y-1.5 font-mono">
                                  {payload.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between gap-4">
                                      <span className="flex items-center gap-1.5 text-slate-300">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                                        {entry.name}:
                                      </span>
                                      <span className="font-black text-white">PKR {Number(entry.value || 0).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Invoiced Revenue" />
                      <Bar dataKey="cogs" fill="#f97316" radius={[6, 6, 0, 0]} name="Cost of Goods (COGS)" />
                      <Bar dataKey="expenses" fill="#a855f7" radius={[6, 6, 0, 0]} name="Operating Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: Expense Categories */}
            {analyticsTab === "expenses" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Categorized Operating Expenditures
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(data?.expenseCategories || {}).map(([key, cat]: [string, any], idx) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{cat.label}</span>
                          <span className="text-[10px] text-slate-400">({cat.count} txns)</span>
                        </div>
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          PKR {Number(cat.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-[280px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(data?.expenseCategories || {})
                          .map(([key, cat]: [string, any]) => ({ name: cat.label, value: cat.amount }))
                          .filter((c) => c.value > 0)}
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {Object.entries(data?.expenseCategories || {}).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderRadius: "14px",
                          border: "1px solid #334155",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: "bold",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                        }}
                        itemStyle={{ color: "#ffffff" }}
                        labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                        formatter={(value: any) => [`PKR ${Number(value).toLocaleString()}`, "Amount"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: AR Aging */}
            {analyticsTab === "aging" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Current (0 - 30 Days)</span>
                    <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                      PKR {Number(data?.arAging?.days0To30 || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">31 - 60 Days Overdue</span>
                    <div className="text-lg font-black font-mono text-blue-700 dark:text-blue-400">
                      PKR {Number(data?.arAging?.days31To60 || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">61 - 90 Days Overdue</span>
                    <div className="text-lg font-black font-mono text-amber-700 dark:text-amber-400">
                      PKR {Number(data?.arAging?.days61To90 || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">90+ Days Critical</span>
                    <div className="text-lg font-black font-mono text-rose-700 dark:text-rose-400">
                      PKR {Number(data?.arAging?.days90Plus || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    Total Overdue Receivables Balance:
                  </span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                    PKR {Number(data?.arAging?.totalOutstanding || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT CUSTOMER ACCOUNT MODAL                                */}
      {/* ========================================================================= */}
      {(showAddCustomerModal || showEditCustomerModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  {showEditCustomerModal ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {showEditCustomerModal ? "Edit Customer Account" : "Register Customer Account"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {showEditCustomerModal
                      ? "Update contact and profile details"
                      : "Create a sub-ledger customer record with ledger tracking"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setShowEditCustomerModal(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Required:</strong> Customer Name & Phone Number. All other billing & tax information is optional.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>Customer Name / Company Title *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Madina Cold Storage / Mr. Tariq"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Phone Number *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0300-1234567"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Address (Optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. client@example.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Billing / Delivery Address (Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Suite 402, Trade Center, Karachi"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>NTN / Tax ID (Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7829102-1"
                    value={customerForm.ntn}
                    onChange={(e) => setCustomerForm({ ...customerForm, ntn: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {!showEditCustomerModal && (
                  <div>
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      <span>Opening Balance in PKR (Optional)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={customerForm.openingBalance}
                      onChange={(e) => setCustomerForm({ ...customerForm, openingBalance: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setShowEditCustomerModal(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/25 transition-all flex items-center gap-2"
                >
                  {isSavingCustomer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isSavingCustomer ? "Saving..." : showEditCustomerModal ? "Save Changes" : "Create Customer Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD VENDOR / SUPPLIER MODAL                                      */}
      {/* ========================================================================= */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Register Vendor / Supplier
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Adds vendor to procurement directory and financial payable ledger
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVendorModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Vendor / Company Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dawlance Pakistan Ltd / Gree Commercial"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>Contact Person *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mr. Salman Khan"
                    value={vendorForm.contactPerson}
                    onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Phone Number *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0321-9988776"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Address (Optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. vendor@supplier.com"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>NTN Number (Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 4839201-9"
                    value={vendorForm.ntn}
                    onChange={(e) => setVendorForm({ ...vendorForm, ntn: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Factory / Office Address (Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Plot 12, Sector 15, Korangi Industrial Area, Karachi"
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingVendor}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/25 transition-all flex items-center gap-2"
                >
                  {isSavingVendor ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isSavingVendor ? "Registering..." : "Register Vendor Profile"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinancialsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Accounts & Financials...</div>}>
      <FinancialsPageContent />
    </React.Suspense>
  );
}
