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

function FinancialsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Top Section Mode: "statements" | "record" | "entries" | "accounts" | "overview"
  const [activeSection, setActiveSection] = useState<"statements" | "record" | "entries" | "accounts" | "overview">("statements");

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

  // ================= ENTRIES LIST STATE =================
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [voucherFilterType, setVoucherFilterType] = useState("");
  const [voucherSearch, setVoucherSearch] = useState("");

  // ================= RECORD ENTRY FORM STATE =================
  const [entryCategory, setEntryCategory] = useState<
    "RECEIVE_CUSTOMER" | "RECEIVE_VENDOR" | "PAY_VENDOR" | "EMPLOYEE_ADVANCE" | "TRANSFER_BANK" | "CUSTOM_JOURNAL"
  >("RECEIVE_CUSTOMER");
  const [vEntryDate, setVEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [vPartyId, setVPartyId] = useState("");
  const [vPartyName, setVPartyName] = useState("");
  const [vPaymentAccount, setVPaymentAccount] = useState("Cash in Hand");
  const [vTransferToAccount, setVTransferToAccount] = useState("Bank Account (Meezan Bank)");
  const [vCustomDebitAccount, setVCustomDebitAccount] = useState("Office Rent & Utilities");
  const [vCustomCreditAccount, setVCustomCreditAccount] = useState("Cash in Hand");
  const [vAmount, setVAmount] = useState("");
  const [vPaymentMethod, setVPaymentMethod] = useState("CASH");
  const [vChequeNumber, setVChequeNumber] = useState("");
  const [vDescription, setVDescription] = useState("");
  const [vIsAdvance, setVIsAdvance] = useState(true);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

  // ================= CHART OF ACCOUNTS & LINKED DOCS STATE =================
  const [accountsData, setAccountsData] = useState<any[]>([]);
  const [partiesList, setPartiesList] = useState<any>({ customers: [], vendors: [], employees: [] });
  const [documentsList, setDocumentsList] = useState<any>({ invoices: [], purchaseOrders: [], deliveryOrders: [], complaints: [] });
  const [accountsLoading, setAccountsLoading] = useState(false);

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
  const [modalContext, setModalContext] = useState<"statement" | "record">("statement");

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
      let parties: any = { customers: [], vendors: [], employees: [] };
      let docs: any = { invoices: [], purchaseOrders: [], deliveryOrders: [], complaints: [] };

      if (accRes.ok) {
        const accJson = await accRes.json();
        accounts = accJson.accounts || [];
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
      setPartiesList(parties);
      setDocumentsList(docs);
    } catch (err) {
      console.error("Failed to load accounts and documents:", err);
    } finally {
      setAccountsLoading(false);
    }
  };

  // Quick Open Modal Handlers
  const handleOpenAddCustomer = (initialName = "", ctx: "statement" | "record" = "statement") => {
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

  const handleOpenAddVendor = (initialName = "", ctx: "statement" | "record" = "statement") => {
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
      toast({ title: "Customer Name Required", message: "Please enter the customer name.", type: "warning" });
      return;
    }
    if (!customerForm.phone.trim()) {
      toast({ title: "Phone Number Required", message: "Phone number is compulsory.", type: "warning" });
      return;
    }

    setIsSavingCustomer(true);
    const token = localStorage.getItem("token");
    try {
      const isEdit = showEditCustomerModal;
      const res = await fetch("/api/finance/customers", {
        method: isEdit ? "PUT" : "POST",
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
      } else {
        setVPartyName(customerForm.name);
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
      } else {
        setVPartyId(created?.id || "");
        setVPartyName(created?.name || vendorForm.name);
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

  const fetchPartyLedger = async (explicitPartyName?: string, explicitPartyId?: string) => {
    const pName = explicitPartyName !== undefined ? explicitPartyName : selectedPartyName;
    const pId = explicitPartyId !== undefined ? explicitPartyId : selectedPartyId;

    if (!pName && !pId) {
      toast({ title: "Select a Party", message: "Please choose a customer, vendor or staff member.", type: "warning" });
      return;
    }
    setSoaLoading(true);
    const token = localStorage.getItem("token");
    try {
      const url = `/api/finance/party-ledger?partyType=${partyType}&partyId=${pId}&partyName=${encodeURIComponent(pName)}&startDate=${soaStartDate}&endDate=${soaEndDate}`;
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

  useEffect(() => {
    fetchFinancials();
    fetchAccountsAndParties();
  }, [startDate, endDate]);

  useEffect(() => {
    if (activeSection === "entries") {
      fetchVouchers();
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
    let voucherType = "JV";
    let debitAccount = "Cash in Hand";
    let creditAccount = "Customer Advance Deposits";
    let typeLabel = "Customer Advance Payment";

    if (entryCategory === "RECEIVE_CUSTOMER") {
      voucherType = vPaymentMethod === "CASH" ? "CRV" : "BRV";
      debitAccount = vPaymentAccount;
      creditAccount = vIsAdvance ? "Customer Advance Deposits" : "Accounts Receivable (Trade Debtors)";
      typeLabel = vIsAdvance ? "Customer Advance Inward" : "Invoice Settlement Inward";
    } else if (entryCategory === "RECEIVE_VENDOR") {
      voucherType = vPaymentMethod === "CASH" ? "CRV" : "BRV";
      debitAccount = vPaymentAccount;
      creditAccount = "Accounts Payable (Trade Creditors)";
      typeLabel = "Vendor Advance / Refund Received";
    } else if (entryCategory === "PAY_VENDOR") {
      voucherType = vPaymentMethod === "CASH" ? "CPV" : "BPV";
      debitAccount = vIsAdvance ? "Vendor Advance Payments" : "Accounts Payable (Trade Creditors)";
      creditAccount = vPaymentAccount;
      typeLabel = vIsAdvance ? "Vendor Advance Outward" : "Vendor Bill Payment";
    } else if (entryCategory === "EMPLOYEE_ADVANCE") {
      voucherType = "EAV";
      debitAccount = "Employee Advances & Staff Loans";
      creditAccount = vPaymentAccount;
      typeLabel = "Staff Advance / Loan Disbursed";
    } else if (entryCategory === "TRANSFER_BANK") {
      voucherType = "CV";
      debitAccount = vTransferToAccount;
      creditAccount = vPaymentAccount;
      typeLabel = "Contra Account Transfer";
    } else {
      voucherType = "JV";
      debitAccount = vCustomDebitAccount;
      creditAccount = vCustomCreditAccount;
      typeLabel = "General Journal Entry";
    }

    return { voucherType, debitAccount, creditAccount, typeLabel };
  }, [
    entryCategory,
    vPaymentMethod,
    vPaymentAccount,
    vTransferToAccount,
    vCustomDebitAccount,
    vCustomCreditAccount,
    vIsAdvance,
  ]);

  // Key Balance Aggregates for Header Bar
  const keyMetrics = useMemo(() => {
    const cashAcc = accountsData.find((a) => a.name === "Cash in Hand");
    const meezanAcc = accountsData.find((a) => a.name === "Bank Account (Meezan Bank)");
    const hblAcc = accountsData.find((a) => a.name === "Bank Account (HBL)");
    const arAcc = accountsData.find((a) => a.name?.includes("Receivable"));
    const apAcc = accountsData.find((a) => a.name?.includes("Payable"));

    const totalLiquidCash = (cashAcc?.balance || 0) + (meezanAcc?.balance || 0) + (hblAcc?.balance || 0);
    const totalAR = arAcc?.balance || 0;
    const totalAP = apAcc?.balance || 0;

    return {
      liquidCash: totalLiquidCash,
      receivables: totalAR,
      payables: totalAP,
      cashInHand: cashAcc?.balance || 0,
      bankBalance: (meezanAcc?.balance || 0) + (hblAcc?.balance || 0),
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
    if (!vAmount || Number(vAmount) <= 0) {
      toast({ title: "Validation Error", message: "Please specify a valid transaction amount.", type: "warning" });
      return;
    }
    if (!vDescription) {
      toast({ title: "Validation Error", message: "Please provide a clear narration or reason.", type: "warning" });
      return;
    }

    setIsSubmittingEntry(true);
    const token = localStorage.getItem("token");

    let partyTypeValue = "GENERAL";
    if (entryCategory === "RECEIVE_CUSTOMER") partyTypeValue = "CUSTOMER";
    else if (entryCategory === "RECEIVE_VENDOR" || entryCategory === "PAY_VENDOR") partyTypeValue = "VENDOR";
    else if (entryCategory === "EMPLOYEE_ADVANCE") partyTypeValue = "EMPLOYEE";

    try {
      const res = await fetch("/api/finance/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          voucherType: journalPreview.voucherType,
          entryDate: vEntryDate,
          debitAccount: journalPreview.debitAccount,
          creditAccount: journalPreview.creditAccount,
          amount: Number(vAmount),
          partyType: partyTypeValue,
          partyId: vPartyId || undefined,
          partyName: vPartyName || undefined,
          paymentMethod: vPaymentMethod,
          chequeNumber: vChequeNumber || undefined,
          description: linkedDocNumber ? `[Linked ${linkedDocType}: ${linkedDocNumber}] ${vDescription}` : vDescription,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record transaction");

      toast({
        title: "Transaction Posted Successfully",
        message: `${json.voucher.voucherNumber} logged into general ledger.`,
        type: "success",
      });

      // Clear & Refresh
      setVAmount("");
      setVChequeNumber("");
      setVDescription("");
      setLinkedDocType("NONE");
      setLinkedDocId("");
      setLinkedDocNumber("");
      fetchVouchers();
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

          {/* Quick Action & Balance Highlights */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <PiggyBank className="w-4 h-4 text-emerald-500" />
              <div>
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block leading-none">
                  Available Liquidity
                </span>
                <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                  PKR {formatCompact(keyMetrics.liquidCash)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveSection("record");
                setEntryCategory("RECEIVE_CUSTOMER");
                setVDescription("Customer advance payment received");
                setVIsAdvance(true);
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
              onClick={() => {
                setActiveSection("statements");
                if (partiesList.customers?.length > 0 && !selectedPartyName) {
                  setSelectedPartyName(partiesList.customers[0].name);
                }
              }}
              className={`px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                activeSection === "statements"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-black shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Customer & Vendor Statements</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                SOA
              </span>
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
              <span>All Ledger Entries</span>
              {vouchers.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {vouchers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSection("accounts")}
              className={`px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                activeSection === "accounts"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-black shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Landmark className="w-4 h-4 text-emerald-500" />
              <span>Bank & Cash Balances</span>
            </button>

            <button
              onClick={() => setActiveSection("overview")}
              className={`px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                activeSection === "overview"
                  ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 font-black shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span>Analytics & Insights</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CUSTOMER & VENDOR STATEMENTS (SOA)                                */}
      {/* ========================================================================= */}
      {activeSection === "statements" && (
        <div className="space-y-6">
          {/* Controls & Filter Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Statement of Account (Sub-Ledger)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select a party type and account name to generate clean running balances with debit/credit entries.
                </p>
              </div>

              {/* Party Type Switcher */}
              <div className="inline-flex bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl text-xs font-bold border border-slate-200/60 dark:border-slate-700/60">
                <button
                  onClick={() => {
                    setPartyType("CUSTOMER");
                    if (partiesList.customers?.length > 0) setSelectedPartyName(partiesList.customers[0].name);
                    setSelectedPartyId("");
                    setSoaData(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    partyType === "CUSTOMER"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span>Customers / Clients</span>
                  <span className="text-[10px] text-slate-400">({partiesList.customers?.length || 0})</span>
                </button>

                <button
                  onClick={() => {
                    setPartyType("VENDOR");
                    if (partiesList.vendors?.length > 0) {
                      setSelectedPartyId(partiesList.vendors[0].id);
                      setSelectedPartyName(partiesList.vendors[0].name);
                    }
                    setSoaData(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    partyType === "VENDOR"
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Vendors / Suppliers</span>
                  <span className="text-[10px] text-slate-400">({partiesList.vendors?.length || 0})</span>
                </button>

                <button
                  onClick={() => {
                    setPartyType("EMPLOYEE");
                    if (partiesList.employees?.length > 0) {
                      setSelectedPartyId(partiesList.employees[0].id);
                      setSelectedPartyName(partiesList.employees[0].name);
                    }
                    setSoaData(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    partyType === "EMPLOYEE"
                      ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  <span>Staff & Technicians</span>
                  <span className="text-[10px] text-slate-400">({partiesList.employees?.length || 0})</span>
                </button>
              </div>
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Party Selection Box with Real-time Search & Quick Actions */}
              <div className="md:col-span-4">
                <SearchablePartyCombobox
                  label={`Select ${partyType === "CUSTOMER" ? "Customer" : partyType === "VENDOR" ? "Vendor" : "Staff Member"}`}
                  type={partyType}
                  selectedName={selectedPartyName}
                  selectedId={selectedPartyId}
                  parties={
                    partyType === "CUSTOMER"
                      ? partiesList.customers || []
                      : partyType === "VENDOR"
                      ? partiesList.vendors || []
                      : partiesList.employees || []
                  }
                  placeholder={`Search ${partyType.toLowerCase()} by name, phone...`}
                  onSelect={(party) => {
                    if (party) {
                      setSelectedPartyName(party.name);
                      setSelectedPartyId(party.id || "");
                      fetchPartyLedger(party.name, party.id || "");
                    } else {
                      setSelectedPartyName("");
                      setSelectedPartyId("");
                      setSoaData(null);
                    }
                  }}
                  onAddNew={(initialName) => {
                    if (partyType === "CUSTOMER") handleOpenAddCustomer(initialName, "statement");
                    else if (partyType === "VENDOR") handleOpenAddVendor(initialName, "statement");
                  }}
                  onEdit={(party) => {
                    if (partyType === "CUSTOMER") handleOpenEditCustomer(party);
                  }}
                  onViewLedger={(party) => {
                    fetchPartyLedger(party.name, party.id || "");
                  }}
                />
              </div>

              {/* Date Presets and Pickers */}
              <div className="md:col-span-5 space-y-1.5">
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
              <div className="md:col-span-3 flex items-center gap-2">
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
                  <Sparkles className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Record New Financial Transaction
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select transaction nature below. The ERP automatically generates balanced double-entry accounting journals.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Real-Time Audit Logged</span>
            </div>
          </div>

          {/* Transaction Type Cards Grid */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
              1. Choose Transaction Flow
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Customer Received */}
              <button
                type="button"
                onClick={() => {
                  setEntryCategory("RECEIVE_CUSTOMER");
                  setVDescription("Customer advance payment received");
                  setVIsAdvance(true);
                }}
                className={`group relative p-4 rounded-2xl text-left transition-all duration-200 border ${
                  entryCategory === "RECEIVE_CUSTOMER"
                    ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:border-emerald-300 hover:bg-emerald-50/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className={`p-2.5 rounded-xl transition-transform ${
                      entryCategory === "RECEIVE_CUSTOMER"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-110"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  {entryCategory === "RECEIVE_CUSTOMER" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </div>
                <div className="font-black text-xs text-slate-900 dark:text-white group-hover:text-emerald-600">
                  Customer Inflow
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Advance / Invoice receipt
                </div>
              </button>

              {/* Vendor Advance In */}
              <button
                type="button"
                onClick={() => {
                  setEntryCategory("RECEIVE_VENDOR");
                  setVDescription("Vendor advance payment received / supplier refund");
                  setVIsAdvance(true);
                }}
                className={`group relative p-4 rounded-2xl text-left transition-all duration-200 border ${
                  entryCategory === "RECEIVE_VENDOR"
                    ? "bg-teal-50/90 dark:bg-teal-950/40 border-teal-500 shadow-md shadow-teal-500/10 ring-2 ring-teal-500/30"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:border-teal-300 hover:bg-teal-50/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className={`p-2.5 rounded-xl transition-transform ${
                      entryCategory === "RECEIVE_VENDOR"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 group-hover:scale-110"
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                  </div>
                  {entryCategory === "RECEIVE_VENDOR" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
                  )}
                </div>
                <div className="font-black text-xs text-slate-900 dark:text-white group-hover:text-teal-600">
                  Vendor Refund / In
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Supplier refund or DO advance
                </div>
              </button>

              {/* Vendor Paid Out */}
              <button
                type="button"
                onClick={() => {
                  setEntryCategory("PAY_VENDOR");
                  setVDescription("Advance payment to supplier");
                  setVIsAdvance(true);
                }}
                className={`group relative p-4 rounded-2xl text-left transition-all duration-200 border ${
                  entryCategory === "PAY_VENDOR"
                    ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/30"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:border-amber-300 hover:bg-amber-50/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className={`p-2.5 rounded-xl transition-transform ${
                      entryCategory === "PAY_VENDOR"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 group-hover:scale-110"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  {entryCategory === "PAY_VENDOR" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  )}
                </div>
                <div className="font-black text-xs text-slate-900 dark:text-white group-hover:text-amber-600">
                  Vendor Outflow
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Supplier advance or PO bill
                </div>
              </button>

              {/* Staff Advance */}
              <button
                type="button"
                onClick={() => {
                  setEntryCategory("EMPLOYEE_ADVANCE");
                  setVDescription("Staff advance loan disbursement");
                }}
                className={`group relative p-4 rounded-2xl text-left transition-all duration-200 border ${
                  entryCategory === "EMPLOYEE_ADVANCE"
                    ? "bg-purple-50/90 dark:bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10 ring-2 ring-purple-500/30"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:border-purple-300 hover:bg-purple-50/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className={`p-2.5 rounded-xl transition-transform ${
                      entryCategory === "EMPLOYEE_ADVANCE"
                        ? "bg-purple-500 text-white shadow-sm"
                        : "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 group-hover:scale-110"
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                  </div>
                  {entryCategory === "EMPLOYEE_ADVANCE" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                  )}
                </div>
                <div className="font-black text-xs text-slate-900 dark:text-white group-hover:text-purple-600">
                  Staff Loan / Advance
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Technician loan disbursement
                </div>
              </button>

              {/* Bank Transfer */}
              <button
                type="button"
                onClick={() => {
                  setEntryCategory("TRANSFER_BANK");
                  setVDescription("Cash transfer to bank account");
                }}
                className={`group relative p-4 rounded-2xl text-left transition-all duration-200 border ${
                  entryCategory === "TRANSFER_BANK"
                    ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/30"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:border-blue-300 hover:bg-blue-50/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className={`p-2.5 rounded-xl transition-transform ${
                      entryCategory === "TRANSFER_BANK"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 group-hover:scale-110"
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  {entryCategory === "TRANSFER_BANK" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  )}
                </div>
                <div className="font-black text-xs text-slate-900 dark:text-white group-hover:text-blue-600">
                  Bank Transfer
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Cash deposit or inter-bank
                </div>
              </button>

              {/* Custom Journal Entry */}
              <button
                type="button"
                onClick={() => {
                  setEntryCategory("CUSTOM_JOURNAL");
                  setVDescription("General debit/credit adjustment");
                }}
                className={`group relative p-4 rounded-2xl text-left transition-all duration-200 border ${
                  entryCategory === "CUSTOM_JOURNAL"
                    ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/30"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 hover:bg-indigo-50/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className={`p-2.5 rounded-xl transition-transform ${
                      entryCategory === "CUSTOM_JOURNAL"
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110"
                    }`}
                  >
                    <Scale className="w-4 h-4" />
                  </div>
                  {entryCategory === "CUSTOM_JOURNAL" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  )}
                </div>
                <div className="font-black text-xs text-slate-900 dark:text-white group-hover:text-indigo-600">
                  Custom JV
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Expense, asset, or adjustment
                </div>
              </button>
            </div>
          </div>

          {/* Main Structured Form */}
          <form onSubmit={handleSaveEntry} className="space-y-5">
            {/* SECTION 1: Transaction Meta (Date, Method, Channel) */}
            <div className="bg-slate-50/80 dark:bg-slate-950/70 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">
                2. Date, Mode & Channel Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Transaction Date */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>Transaction Date</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setVEntryDate(new Date().toISOString().split("T")[0])}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Today
                    </button>
                  </div>
                  <input
                    type="date"
                    required
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                    value={vEntryDate}
                    onChange={(e) => setVEntryDate(e.target.value)}
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs mb-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Payment Method</span>
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                    value={vPaymentMethod}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVPaymentMethod(val);
                      if (val === "CASH") setVPaymentAccount("Cash in Hand");
                      else if (val === "ONLINE") setVPaymentAccount("Bank Account (HBL)");
                      else setVPaymentAccount("Bank Account (Meezan Bank)");
                    }}
                  >
                    <option value="CASH">💵 Cash</option>
                    <option value="BANK_TRANSFER">🏛️ Bank Transfer</option>
                    <option value="CHEQUE">📝 Cheque</option>
                    <option value="ONLINE">💳 Online Transfer</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Party Selector Grid */}
              {entryCategory === "RECEIVE_CUSTOMER" && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <SearchablePartyCombobox
                    label="Customer / Client Name"
                    type="CUSTOMER"
                    selectedName={vPartyName}
                    parties={partiesList.customers || []}
                    placeholder="Type or search customer by name, phone..."
                    required={true}
                    onSelect={(p) => setVPartyName(p ? p.name : "")}
                    onAddNew={(name) => handleOpenAddCustomer(name, "record")}
                    onEdit={(p) => handleOpenEditCustomer(p)}
                    onViewLedger={(p) => handleJumpToStatement("CUSTOMER", p.name)}
                  />
                </div>
              )}

              {/* Vendor Inflow */}
              {entryCategory === "RECEIVE_VENDOR" && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <SearchablePartyCombobox
                    label="Vendor / Supplier (Payer)"
                    type="VENDOR"
                    selectedId={vPartyId}
                    selectedName={vPartyName}
                    parties={partiesList.vendors || []}
                    placeholder="Type or search vendor name..."
                    required={true}
                    onSelect={(p) => {
                      setVPartyId(p ? p.id : "");
                      setVPartyName(p ? p.name : "");
                    }}
                    onAddNew={(name) => handleOpenAddVendor(name, "record")}
                    onViewLedger={(p) => handleJumpToStatement("VENDOR", p.name, p.id)}
                  />
                </div>
              )}

              {/* Vendor Outflow */}
              {entryCategory === "PAY_VENDOR" && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <SearchablePartyCombobox
                    label="Vendor / Supplier (Payee)"
                    type="VENDOR"
                    selectedId={vPartyId}
                    selectedName={vPartyName}
                    parties={partiesList.vendors || []}
                    placeholder="Type or search vendor name..."
                    required={true}
                    onSelect={(p) => {
                      setVPartyId(p ? p.id : "");
                      setVPartyName(p ? p.name : "");
                    }}
                    onAddNew={(name) => handleOpenAddVendor(name, "record")}
                    onViewLedger={(p) => handleJumpToStatement("VENDOR", p.name, p.id)}
                  />
                </div>
              )}

              {/* Staff Advance */}
              {entryCategory === "EMPLOYEE_ADVANCE" && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <SearchablePartyCombobox
                    label="Staff Member / Employee"
                    type="EMPLOYEE"
                    selectedId={vPartyId}
                    selectedName={vPartyName}
                    parties={partiesList.employees || []}
                    placeholder="Type or search employee name..."
                    required={true}
                    onSelect={(p) => {
                      setVPartyId(p ? p.id : "");
                      setVPartyName(p ? p.name : "");
                    }}
                    onAddNew={() => {}}
                    onViewLedger={(p) => handleJumpToStatement("EMPLOYEE", p.name, p.id)}
                  />
                </div>
              )}

              {/* Transfer Bank */}
              {entryCategory === "TRANSFER_BANK" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <div>
                    <label className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs mb-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                      <span>Transfer From (Source)</span>
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                      value={vPaymentAccount}
                      onChange={(e) => setVPaymentAccount(e.target.value)}
                    >
                      <option value="Cash in Hand">💵 Cash in Hand Counter</option>
                      <option value="Bank Account (Meezan Bank)">🏛️ Meezan Bank</option>
                      <option value="Bank Account (HBL)">🏛️ Habib Bank (HBL)</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs mb-1.5">
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Transfer To (Destination)</span>
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                      value={vTransferToAccount}
                      onChange={(e) => setVTransferToAccount(e.target.value)}
                    >
                      <option value="Bank Account (Meezan Bank)">🏛️ Meezan Bank</option>
                      <option value="Bank Account (HBL)">🏛️ Habib Bank (HBL)</option>
                      <option value="Cash in Hand">💵 Cash in Hand Counter</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Custom Journal */}
              {entryCategory === "CUSTOM_JOURNAL" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <div>
                    <label className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs mb-1.5">
                      <Scale className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Debit Account (Receiving / Expense)</span>
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                      value={vCustomDebitAccount}
                      onChange={(e) => setVCustomDebitAccount(e.target.value)}
                    >
                      {accountsData.map((acc) => (
                        <option key={acc.name} value={acc.name}>
                          {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs mb-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                      <span>Credit Account (Payment Source)</span>
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                      value={vCustomCreditAccount}
                      onChange={(e) => setVCustomCreditAccount(e.target.value)}
                    >
                      {accountsData.map((acc) => (
                        <option key={acc.name} value={acc.name}>
                          {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: Document Linker (Optional) */}
            {(entryCategory === "RECEIVE_CUSTOMER" || entryCategory === "RECEIVE_VENDOR" || entryCategory === "PAY_VENDOR") && (
              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[11px]">
                    <Link2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Link to Specific Invoice, DO or Purchase Order (Optional)</span>
                  </label>
                  {linkedDocNumber && (
                    <span className="text-[10px] font-black bg-blue-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                      Linked: {linkedDocNumber}
                    </span>
                  )}
                </div>

                <select
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                  value={linkedDocId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLinkedDocId(val);
                    if (!val) {
                      setLinkedDocType("NONE");
                      setLinkedDocNumber("");
                      return;
                    }
                    const [docType, id] = val.split(":");
                    if (docType === "INV") {
                      const inv = documentsList.invoices?.find((i: any) => i.id === id);
                      if (inv) {
                        setLinkedDocType("INVOICE");
                        setLinkedDocNumber(inv.number);
                        setVPartyName(inv.clientName);
                        if (inv.due > 0) setVAmount(String(inv.due));
                        setVDescription(`Payment for Invoice ${inv.number}${inv.doNumber ? ` (DO: ${inv.doNumber})` : ""}`);
                        setVIsAdvance(false);
                      }
                    } else if (docType === "DO") {
                      const d = documentsList.deliveryOrders?.find((i: any) => i.id === id);
                      if (d) {
                        setLinkedDocType("DO");
                        setLinkedDocNumber(d.number);
                        setVPartyName(d.clientName);
                        setVDescription(`Payment against Delivery Order ${d.number}`);
                      }
                    } else if (docType === "PO") {
                      const po = documentsList.purchaseOrders?.find((p: any) => p.id === id);
                      if (po) {
                        setLinkedDocType("PO");
                        setLinkedDocNumber(po.number);
                        setVPartyId(po.vendorId);
                        setVPartyName(po.vendorName);
                        if (po.total > 0) setVAmount(String(po.total));
                        setVDescription(`Payment against Purchase Order ${po.number}`);
                      }
                    } else if (docType === "SRV") {
                      const c = documentsList.complaints?.find((i: any) => i.id === id);
                      if (c) {
                        setLinkedDocType("COMPLAINT");
                        setLinkedDocNumber(c.number);
                        setVPartyName(c.customerName);
                        if (c.amount > 0) setVAmount(String(c.amount));
                        setVDescription(`Service payment for Complaint ${c.number}`);
                        setVIsAdvance(false);
                      }
                    }
                  }}
                >
                  <option value="">-- No Specific Document Linked (General Advance Deposit) --</option>
                  {entryCategory === "RECEIVE_CUSTOMER" && (
                    <>
                      <optgroup label="Recent Invoices (Unpaid / Partial)">
                        {documentsList.invoices
                          ?.filter((inv: any) => !vPartyName || inv.clientName.toLowerCase().includes(vPartyName.toLowerCase()))
                          .map((inv: any) => (
                            <option key={inv.id} value={`INV:${inv.id}`}>
                              📄 {inv.number} - {inv.clientName} (Total: PKR {inv.total.toLocaleString()} | Due: PKR {inv.due.toLocaleString()})
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Delivery Orders (DO)">
                        {documentsList.deliveryOrders
                          ?.filter((d: any) => !vPartyName || d.clientName.toLowerCase().includes(vPartyName.toLowerCase()))
                          .map((d: any) => (
                            <option key={d.id} value={`DO:${d.id}`}>
                              🚚 {d.number} - {d.clientName} ({d.status})
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Service Complaints">
                        {documentsList.complaints
                          ?.filter((c: any) => !vPartyName || c.customerName.toLowerCase().includes(vPartyName.toLowerCase()))
                          .map((c: any) => (
                            <option key={c.id} value={`SRV:${c.id}`}>
                              🛠️ {c.number} - {c.customerName} ({c.status} | PKR {c.amount.toLocaleString()})
                            </option>
                          ))}
                      </optgroup>
                    </>
                  )}

                  {entryCategory === "PAY_VENDOR" && (
                    <optgroup label="Purchase Orders (PO)">
                      {documentsList.purchaseOrders
                        ?.filter((po: any) => !vPartyId || po.vendorId === vPartyId)
                        .map((po: any) => (
                          <option key={po.id} value={`PO:${po.id}`}>
                            📦 {po.number} - {po.vendorName} (Total: PKR {po.total.toLocaleString()} | Status: {po.status})
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            {/* SECTION 3: Amount, Cheque & Narration */}
            <div className="bg-slate-50/80 dark:bg-slate-950/70 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">
                3. Amount & Narration
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">
                      <Coins className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Amount in PKR</span>
                    </label>
                    {vAmount && Number(vAmount) > 0 && (
                      <span className="text-[10px] font-mono font-bold text-emerald-600">
                        PKR {Number(vAmount).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">
                      PKR
                    </span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 50,000"
                      className="w-full pl-12 pr-3.5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-mono font-black text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                      value={vAmount}
                      onChange={(e) => setVAmount(e.target.value)}
                    />
                  </div>

                  {/* Quick Amount Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[10000, 25000, 50000, 100000, 500000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setVAmount(String(amt))}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
                      >
                        +{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                    {vAmount && (
                      <button
                        type="button"
                        onClick={() => setVAmount("")}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Reference / Cheque # */}
                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cheque / Online Reference # (Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CHQ-99120 or Online Ref / TXN-ID"
                    className="w-full px-3.5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                    value={vChequeNumber}
                    onChange={(e) => setVChequeNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Narration Input */}
              <div>
                <label className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs mb-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  <span>Narration / Reason</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50% advance for 10x Inverter units via bank transfer"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                  value={vDescription}
                  onChange={(e) => setVDescription(e.target.value)}
                />

                {/* Quick Suggestion Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "Advance Payment Received",
                    "Invoice Full Settlement",
                    "Supplier Advance for Raw Materials",
                    "Monthly Office Rent & Utilities",
                    "Staff Fuel & Travel Allowance",
                  ].map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setVDescription(sugg)}
                      className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FORM ACTIONS & BOTTOM SUBMIT CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono font-bold">
                  {journalPreview.voucherType}
                </span>
                <span>
                  Posting: <strong className="text-slate-800 dark:text-slate-200">{journalPreview.debitAccount}</strong> ➔ <strong className="text-slate-800 dark:text-slate-200">{journalPreview.creditAccount}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setVAmount("");
                    setVChequeNumber("");
                    setVDescription("");
                    setLinkedDocId("");
                    setLinkedDocNumber("");
                  }}
                  className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingEntry || !vAmount || Number(vAmount) <= 0}
                  className="flex-1 sm:flex-none px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-98 cursor-pointer"
                >
                  {isSubmittingEntry ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isSubmittingEntry ? "Posting Transaction..." : "✓ Save Entry to Financial Ledger"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ALL LEDGER ENTRIES LIST                                            */}
      {/* ========================================================================= */}
      {activeSection === "entries" && (
        <div className="space-y-5 animate-fadeIn">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search vouchers, parties, accounts..."
                  className="pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium w-64 focus:ring-2 focus:ring-blue-500"
                  value={voucherSearch}
                  onChange={(e) => setVoucherSearch(e.target.value)}
                />
              </div>

              <select
                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                value={voucherFilterType}
                onChange={(e) => setVoucherFilterType(e.target.value)}
              >
                <option value="">All Transaction Types</option>
                <option value="CRV">Cash Receipts (CRV)</option>
                <option value="BRV">Bank Receipts (BRV)</option>
                <option value="CPV">Cash Payments (CPV)</option>
                <option value="BPV">Bank Payments (BPV)</option>
                <option value="EAV">Employee Advances (EAV)</option>
                <option value="CV">Bank Transfers (CV)</option>
                <option value="JV">Journal Vouchers (JV)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchVouchers}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs transition-colors"
                title="Refresh Ledger"
              >
                <RefreshCw className={`w-4 h-4 ${vouchersLoading ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={() => setActiveSection("record")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Record Entry</span>
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Ref #</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Party Name</th>
                    <th className="p-3.5">Debit (Destination)</th>
                    <th className="p-3.5">Credit (Source)</th>
                    <th className="p-3.5 text-right">Amount (PKR)</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Reason / Narration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {vouchersLoading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                        Loading ledger entries...
                      </td>
                    </tr>
                  ) : vouchers.length > 0 ? (
                    vouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {v.voucherNumber || v.referenceId || "ENTRY"}
                        </td>
                        <td className="p-3.5 font-mono whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {new Date(v.entryDate).toLocaleDateString("en-GB").replace(/\//g, "-")}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              v.voucherType?.startsWith("CR") || v.voucherType?.startsWith("BR")
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : v.voucherType?.startsWith("CP") || v.voucherType?.startsWith("BP")
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : v.voucherType === "EAV"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {v.voucherType || v.referenceType}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">{v.partyName || "-"}</td>
                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">{v.debitAccount}</td>
                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">{v.creditAccount}</td>
                        <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                          PKR {Number(v.amount).toLocaleString()}
                        </td>
                        <td className="p-3.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          {v.paymentMethod || "CASH"}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-[240px] truncate" title={v.description}>
                          {v.description}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        No transactions found. Click <strong>"+ Record Entry"</strong> to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BANK & CASH BALANCES (CHART OF ACCOUNTS)                           */}
      {/* ========================================================================= */}
      {activeSection === "accounts" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Visual Bank & Cash Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg shadow-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Cash in Hand</span>
                <PiggyBank className="w-5 h-5 opacity-80" />
              </div>
              <div className="text-2xl font-black font-mono">
                PKR {keyMetrics.cashInHand.toLocaleString()}
              </div>
              <p className="text-[11px] opacity-75">Counter vault & petty cash available</p>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-lg shadow-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Bank Balances (Meezan & HBL)</span>
                <Landmark className="w-5 h-5 opacity-80" />
              </div>
              <div className="text-2xl font-black font-mono">
                PKR {keyMetrics.bankBalance.toLocaleString()}
              </div>
              <p className="text-[11px] opacity-75">Corporate online accounts liquidity</p>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-violet-700 text-white p-6 rounded-3xl shadow-lg shadow-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Receivables (AR)</span>
                <Receipt className="w-5 h-5 opacity-80" />
              </div>
              <div className="text-2xl font-black font-mono">
                PKR {keyMetrics.receivables.toLocaleString()}
              </div>
              <p className="text-[11px] opacity-75">Trade debtors & uncollected invoices</p>
            </div>
          </div>

          {/* Full Chart of Accounts Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600" />
                Chart of Accounts Ledger Summary
              </h3>
              <span className="text-xs text-slate-400 font-medium">Standard Double-Entry Posting</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Account Code & Name</th>
                    <th className="p-3.5">Classification</th>
                    <th className="p-3.5 text-right text-rose-600 dark:text-rose-400">Total Inflow (Debits)</th>
                    <th className="p-3.5 text-right text-emerald-600 dark:text-emerald-400">Total Outflow (Credits)</th>
                    <th className="p-3.5 text-right font-black">Net Available Balance (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {accountsData.map((acc) => (
                    <tr key={acc.name} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <span className="font-mono text-blue-600 mr-2 text-[11px]">#{acc.code || "1000"}</span>
                        {acc.name}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            acc.type === "ASSET"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : acc.type === "LIABILITY"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : acc.type === "REVENUE"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {acc.type}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {acc.totalDebit > 0 ? `PKR ${acc.totalDebit.toLocaleString()}` : "-"}
                      </td>
                      <td className="p-3.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {acc.totalCredit > 0 ? `PKR ${acc.totalCredit.toLocaleString()}` : "-"}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-white">
                        PKR {acc.balance.toLocaleString()}
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
                      <Tooltip formatter={(value: any) => [`PKR ${Number(value).toLocaleString()}`, "Amount"]} />
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
