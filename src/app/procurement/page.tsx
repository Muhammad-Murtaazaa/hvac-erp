"use client";

import React, { useState, useEffect } from "react";
import { Plus, ListFilter, Clipboard, AlertCircle, FileText, CheckCircle2, RotateCcw, Printer, BookOpen, ArrowRight, Building2, Phone, Mail, MapPin, Edit2 } from "lucide-react";
import SearchFilter from "@/components/shared/SearchFilter";
import SkeletonTable from "@/components/shared/SkeletonTable";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useToast } from "@/components/shared/ToastProvider";
import { parsePoMetadata } from "@/lib/poHelper";

function ProcurementPageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  let initialTab = searchParams.get("tab") || "pos";
  if (initialTab === "pending_stock") initialTab = "shortages";

  const [activeTab, setActiveTab] = useState(initialTab); // pos, arrivals, shortages, vendors
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let tab = searchParams.get("tab");
    if (tab === "pending_stock") tab = "shortages";
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Detailed Modal states
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGrnOpen, setIsGrnOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);

  // Vendor Ledger state
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerTab, setLedgerTab] = useState("finance"); // finance, po, products, grn
  const [vendorLedgerData, setVendorLedgerData] = useState<any>(null);
  const [vendorLedgerLoading, setVendorLedgerLoading] = useState(false);

  const openVendorStatement = async (vendor: any, tab = "finance") => {
    setSelectedVendor(vendor);
    setIsLedgerOpen(true);
    setLedgerTab(tab);
    setVendorLedgerLoading(true);
    setVendorLedgerData(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/finance/party-ledger?partyType=VENDOR&partyId=${vendor.id || ""}&partyName=${encodeURIComponent(vendor.name)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVendorLedgerData(data);
      }
    } catch (err) {
      console.error("Failed to load vendor ledger:", err);
    } finally {
      setVendorLedgerLoading(false);
    }
  };

  // New Vendor state
  const [isVendorOpen, setIsVendorOpen] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorNtn, setVendorNtn] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorPaymentTerms, setVendorPaymentTerms] = useState("Net 30 Days");
  const [registering, setRegistering] = useState(false);

  // Edit Vendor state
  const [isEditVendorOpen, setIsEditVendorOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState("");
  const [editVendorName, setEditVendorName] = useState("");
  const [editVendorContact, setEditVendorContact] = useState("");
  const [editVendorPhone, setEditVendorPhone] = useState("");
  const [editVendorEmail, setEditVendorEmail] = useState("");
  const [editVendorNtn, setEditVendorNtn] = useState("");
  const [editVendorAddress, setEditVendorAddress] = useState("");
  const [editVendorPaymentTerms, setEditVendorPaymentTerms] = useState("Net 30 Days");
  const [updatingVendor, setUpdatingVendor] = useState(false);

  // New PO state
  const [newPoNumber, setNewPoNumber] = useState("");
  const [newPoVendor, setNewPoVendor] = useState("");
  const [newPoDate, setNewPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [newPoDeliveryDate, setNewPoDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [newPoDeliveryAddress, setNewPoDeliveryAddress] = useState("");
  const [newPoLines, setNewPoLines] = useState<any[]>([
    { productId: "", quantityOrdered: "", unitCost: "" },
  ]);
  const [newPoDiscountType, setNewPoDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [newPoDiscountValue, setNewPoDiscountValue] = useState("0");
  const [newPoIsGst, setNewPoIsGst] = useState(false);
  const [newPoTaxRate, setNewPoTaxRate] = useState(18);
  const [poNotes, setPoNotes] = useState("");

  // Edit PO state
  const [isEditPoOpen, setIsEditPoOpen] = useState(false);
  const [editingPoId, setEditingPoId] = useState("");
  const [editPoNumber, setEditPoNumber] = useState("");
  const [editPoVendor, setEditPoVendor] = useState("");
  const [editPoDate, setEditPoDate] = useState("");
  const [editPoDeliveryDate, setEditPoDeliveryDate] = useState("");
  const [editPoDeliveryAddress, setEditPoDeliveryAddress] = useState("");
  const [editPoLines, setEditPoLines] = useState<any[]>([]);
  const [editPoDiscountType, setEditPoDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [editPoDiscountValue, setEditPoDiscountValue] = useState("0");
  const [editPoIsGst, setEditPoIsGst] = useState(false);
  const [editPoTaxRate, setEditPoTaxRate] = useState(18);
  const [editPoNotes, setEditPoNotes] = useState("");
  const [editPoStatus, setEditPoStatus] = useState("APPROVED");
  const [updatingPo, setUpdatingPo] = useState(false);

  // GRN states
  const [grnLines, setGrnLines] = useState<any[]>([]);
  const [grnNotes, setGrnNotes] = useState("");

  // Shortage Resolve state
  const [selectedPendingItem, setSelectedPendingItem] = useState<any>(null);
  const [resolveQty, setResolveQty] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const vRes = await fetch("/api/procurement/vendors", { headers: { Authorization: `Bearer ${token}` } });
      const pRes = await fetch("/api/inventory/products", { headers: { Authorization: `Bearer ${token}` } });
      const poRes = await fetch("/api/procurement/po", { headers: { Authorization: `Bearer ${token}` } });

      if (vRes.ok) setVendors((await vRes.json()).vendors || []);
      if (pRes.ok) setProducts((await pRes.json()).products || []);
      if (poRes.ok) {
        const poData = await poRes.json();
        setPurchaseOrders(poData.purchaseOrders || []);

        // Filter out unresolved pending items for shortages list
        const pLines: any[] = [];
        (poData.purchaseOrders || []).forEach((po: any) => {
          (po.pendingItems || []).forEach((pi: any) => {
            if (!pi.isResolved) {
              pLines.push({ ...pi, poNumber: po.poNumber || "-", vendorName: po.vendor?.name || "Unknown Vendor" });
            }
          });
        });
        setPendingItems(pLines);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", message: "Failed to load procurement data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setMounted(true);
  }, []);

  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoVendor || newPoLines.some((l) => !l.productId || !l.quantityOrdered || !l.unitCost)) {
      toast({ title: "Missing Information", message: "Please fill out vendor and all PO lines.", type: "warning" });
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/procurement/po", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          poNumber: newPoNumber || undefined,
          vendorId: newPoVendor,
          lineItems: newPoLines,
          status: "APPROVED",
          discountType: newPoDiscountType,
          discountPercent: newPoDiscountType === "PERCENTAGE" ? Number(newPoDiscountValue) : 0,
          discount: newPoDiscountType === "FIXED" ? Number(newPoDiscountValue) : 0,
          isGst: newPoIsGst,
          taxRate: Number(newPoTaxRate),
          poDate: newPoDate,
          deliveryDate: newPoDeliveryDate,
          deliveryAddress: newPoDeliveryAddress,
          notes: poNotes,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to create PO");
      }
      toast({ title: "PO Created", message: "Purchase Order created and approved successfully.", type: "success" });
      setIsCreateOpen(false);
      setNewPoNumber("");
      setNewPoVendor("");
      setNewPoDate(new Date().toISOString().split("T")[0]);
      setNewPoDeliveryDate(new Date().toISOString().split("T")[0]);
      setNewPoDeliveryAddress("");
      setNewPoLines([{ productId: "", quantityOrdered: "", unitCost: "" }]);
      setNewPoDiscountType("FIXED");
      setNewPoDiscountValue("0");
      setNewPoIsGst(false);
      setNewPoTaxRate(18);
      setPoNotes("");
      fetchData();
    } catch (err: any) {
      toast({ title: "PO Creation Failed", message: err.message, type: "error" });
    }
  };

  const openEditPo = (po: any) => {
    const meta = po.meta || parsePoMetadata(po.notes, po);
    setEditingPoId(po.id);
    setEditPoNumber(po.poNumber || "");
    setEditPoVendor(po.vendorId || "");
    setEditPoDate(po.createdAt ? new Date(po.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    const dDate = po.lineItems?.[0]?.expectedDeliveryDate
      ? new Date(po.lineItems[0].expectedDeliveryDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    setEditPoDeliveryDate(dDate);
    setEditPoDeliveryAddress(meta.deliveryAddress || "");
    setEditPoLines(
      (po.lineItems || []).map((l: any) => ({
        productId: l.productId,
        quantityOrdered: String(l.quantityOrdered),
        unitCost: String(l.unitCost),
      }))
    );
    setEditPoIsGst(meta.isGst);
    setEditPoTaxRate(meta.taxRate || 18);
    setEditPoDiscountType(meta.discountType);
    setEditPoDiscountValue(
      meta.discountType === "PERCENTAGE" ? String(meta.discountPercent) : String(meta.discountAmount)
    );
    setEditPoNotes(meta.userNotes || "");
    setEditPoStatus(po.status || "APPROVED");
    setIsEditPoOpen(true);
  };

  const handleUpdatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPoVendor || editPoLines.some((l) => !l.productId || !l.quantityOrdered || !l.unitCost)) {
      toast({ title: "Missing Information", message: "Please fill out the vendor and all PO line details.", type: "warning" });
      return;
    }

    setUpdatingPo(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/procurement/po/${editingPoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          vendorId: editPoVendor,
          lineItems: editPoLines,
          status: editPoStatus,
          discountType: editPoDiscountType,
          discountPercent: editPoDiscountType === "PERCENTAGE" ? Number(editPoDiscountValue) : 0,
          discount: editPoDiscountType === "FIXED" ? Number(editPoDiscountValue) : 0,
          isGst: editPoIsGst,
          taxRate: Number(editPoTaxRate),
          poDate: editPoDate,
          deliveryDate: editPoDeliveryDate,
          deliveryAddress: editPoDeliveryAddress,
          notes: editPoNotes,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update PO");
      }

      toast({ title: "PO Updated", message: `Purchase Order ${editPoNumber} updated successfully.`, type: "success" });
      setIsEditPoOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "PO Update Failed", message: err.message, type: "error" });
    } finally {
      setUpdatingPo(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !vendorContact || !vendorPhone) {
      toast({ title: "Required Fields Missing", message: "Please fill out Name, Contact Person, and Phone.", type: "warning" });
      return;
    }

    setRegistering(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/procurement/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: vendorName,
          contactPerson: vendorContact,
          phone: vendorPhone,
          email: vendorEmail || undefined,
          ntn: vendorNtn || undefined,
          address: vendorAddress,
          paymentTerms: vendorPaymentTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register vendor");

      toast({ title: "Vendor Registered", message: `Vendor "${vendorName}" onboarded successfully.`, type: "success" });
      setIsVendorOpen(false);
      // Clear fields
      setVendorName("");
      setVendorContact("");
      setVendorPhone("");
      setVendorEmail("");
      setVendorNtn("");
      setVendorAddress("");
      setVendorPaymentTerms("Net 30 Days");
      fetchData();
    } catch (err: any) {
      toast({ title: "Registration Failed", message: err.message, type: "error" });
    } finally {
      setRegistering(false);
    }
  };

  const openEditVendor = (vendor: any) => {
    setEditingVendorId(vendor.id);
    setEditVendorName(vendor.name);
    setEditVendorContact(vendor.contactPerson);
    setEditVendorPhone(vendor.phone);
    setEditVendorEmail(vendor.email || "");
    setEditVendorNtn(vendor.ntn || "");
    setEditVendorAddress(vendor.address || "");
    setEditVendorPaymentTerms(vendor.paymentTerms || "Net 30 Days");
    setIsEditVendorOpen(true);
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVendorName || !editVendorContact || !editVendorPhone) {
      toast({ title: "Required Fields Missing", message: "Please fill out Name, Contact Person, and Phone.", type: "warning" });
      return;
    }

    setUpdatingVendor(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/procurement/vendors", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: editingVendorId,
          name: editVendorName,
          contactPerson: editVendorContact,
          phone: editVendorPhone,
          email: editVendorEmail || undefined,
          ntn: editVendorNtn || undefined,
          address: editVendorAddress,
          paymentTerms: editVendorPaymentTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update vendor");

      toast({ title: "Vendor Updated", message: `Vendor "${editVendorName}" details updated successfully.`, type: "success" });
      setIsEditVendorOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Update Failed", message: err.message, type: "error" });
    } finally {
      setUpdatingVendor(false);
    }
  };

  const handlePOAction = async (poId: string, action: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/procurement/po/${poId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) throw new Error("Action failed");
      toast({ title: "PO Updated", message: `PO successfully ${action === "submit" ? "submitted" : "cancelled"}.`, type: "success" });
      setSelectedPO(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Action Failed", message: err.message, type: "error" });
    }
  };

  const openGrnForm = (po: any) => {
    setSelectedPO(po);
    setGrnNotes("");
    setGrnLines(
      (po.lineItems || []).map((line: any) => {
        const qOrdered = Number(line.quantityOrdered) || 0;
        const qReceived = Number(line.quantityReceived) || 0;
        return {
          productId: line.productId,
          sku: line.product?.sku || "-",
          name: line.product?.name || "-",
          quantityOrdered: qOrdered,
          quantityReceived: "", // Start blank so user must manually enter verified count
          remaining: Math.max(0, qOrdered - qReceived),
          unitCost: line.unitCost || "0",
        };
      })
    );
    setIsGrnOpen(true);
  };

  const handleGrnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    // Filter out rows where quantityReceived is 0 or empty
    const itemsToSubmit = grnLines.filter((l) => Number(l.quantityReceived) > 0);

    if (itemsToSubmit.length === 0) {
      toast({ title: "Quantity Required", message: "Please enter a received quantity greater than 0 for at least one item.", type: "warning" });
      return;
    }

    try {
      const res = await fetch("/api/procurement/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          poId: selectedPO.id,
          notes: grnNotes,
          lineItems: itemsToSubmit,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log GRN");

      toast({ title: "GRN Generated", message: `GRN ${data.grn.grnNumber} generated successfully. Stock ledger and accounts updated.`, type: "success" });
      setIsGrnOpen(false);
      setSelectedPO(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "GRN Logging Failed", message: err.message, type: "error" });
    }
  };

  const openResolveForm = (item: any) => {
    setSelectedPendingItem(item);
    setResolveQty(""); // Start blank so user must manually enter verified count
    setIsResolveOpen(true);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(parseInt(resolveQty)) || parseInt(resolveQty) <= 0) {
      toast({ title: "Invalid Quantity", message: "Please enter a valid resolution quantity.", type: "warning" });
      return;
    }

    const token = localStorage.getItem("token");
    const qty = parseInt(resolveQty);
    const outstanding = selectedPendingItem.quantityMissing - selectedPendingItem.quantityResolved;

    if (qty > outstanding) {
      toast({ title: "Exceeds Shortfall", message: `Cannot resolve more than the outstanding shortfall (${outstanding} units).`, type: "error" });
      return;
    }

    try {
      const res = await fetch("/api/procurement/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          poId: selectedPendingItem.poId,
          notes: `Resolving shortfall for product SKU ${selectedPendingItem.product.sku}`,
          lineItems: [
            {
              productId: selectedPendingItem.productId,
              quantityReceived: qty,
              unitCost: selectedPendingItem.product.averageCost, // resolve at current average cost/or seed
              poPendingItemId: selectedPendingItem.id,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log GRN shortage receipt");

      toast({ title: "Shortfall Resolved", message: `Shortage resolved successfully in GRN ${data.grn.grnNumber}.`, type: "success" });
      setIsResolveOpen(false);
      setSelectedPendingItem(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Resolution Failed", message: err.message, type: "error" });
    }
  };

  // Filters
  const filteredPOs = (purchaseOrders || []).filter((po) => {
    const poNum = po.poNumber || "";
    const vName = po.vendor?.name || "";
    const matchesText =
      poNum.toLowerCase().includes((search || "").toLowerCase()) ||
      vName.toLowerCase().includes((search || "").toLowerCase());
    const matchesStatus = status === "" || po.status === status;
    return matchesText && matchesStatus;
  });

  const poStatusOptions = [
    { label: "Draft", value: "DRAFT" },
    { label: "Submitted", value: "SUBMITTED" },
    { label: "Partially Received", value: "PARTIALLY_RECEIVED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  return (
    <div className="space-y-6">
      {/* Dynamic Focused Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeTab === "pos"
                ? "Purchase Orders"
                : activeTab === "arrivals"
                ? "Goods Received Notes (GRN)"
                : activeTab === "shortages"
                ? "Pending Backorders & Shortages"
                : "Suppliers & Vendors"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {activeTab === "pos"
                ? "Issue purchase orders to suppliers, manage vendor bills, and track procurement."
                : activeTab === "arrivals"
                ? "Inspect incoming shipments and check-in verified deliveries into warehouse stock."
                : activeTab === "shortages"
                ? "Track supplier delivery shortfalls and resolve pending item fulfillments."
                : "Manage registered supplier accounts, contact persons, NTN, and payment terms."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "vendors" ? (
              <button
                onClick={() => setIsVendorOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Register Vendor</span>
              </button>
            ) : activeTab === "pos" ? (
              <button
                onClick={() => {
                  setVendorSearch("");
                  setIsCreateOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create Purchase Order</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Clean Pill Tab Navigation */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar text-xs font-bold">
          {[
            { id: "pos", label: `Purchase Orders (${purchaseOrders.length})` },
            { id: "arrivals", label: `Arrivals (${purchaseOrders.filter((po) => po.status === "SUBMITTED").length})` },
            { id: "shortages", label: `Pending Stock (${pendingItems.length})` },
            { id: "vendors", label: `Vendors (${vendors.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch("");
                setStatus("");
              }}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={7} columns={7} />
      ) : error ? (
        <div className="p-8 text-center text-rose-500 font-bold">{error}</div>
      ) : activeTab === "pos" ? (
        /* ==================== PURCHASE ORDERS TAB ==================== */
        <div className="space-y-4">
          <SearchFilter
            placeholder="Search PO number or vendor..."
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            statusOptions={poStatusOptions}
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3">PO Number</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Total Amount (PKR)</th>
                    <th className="p-3">Created At</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                      <td className="p-3 font-bold whitespace-nowrap">{po.poNumber || "-"}</td>
                      <td className="p-3 font-semibold">{po.vendor?.name || "Unknown Vendor"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          po.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : (po.status === "APPROVED" || po.status === "SUBMITTED")
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : po.status === "PARTIALLY_RECEIVED"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : po.status === "DRAFT"
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        }`}>
                          {po.status === "SUBMITTED" ? "APPROVED" : (po.status || "APPROVED")}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">{Number(po.totalAmount || 0).toFixed(2)}</td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "-"}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPO(po)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-[10px] font-bold flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={() => openEditPo(po)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                            title="Edit Purchase Order"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-500" /> Edit
                          </button>
                          <a
                            href={`/procurement/po/${po.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                          >
                            <Printer className="w-3.5 h-3.5" /> PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPOs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">No Purchase Orders found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === "arrivals" ? (
        /* ==================== STOCK ARRIVALS (GRN) TAB ==================== */
        <div className="space-y-4">
          <SearchFilter
            placeholder="Search pending arrivals by PO number or vendor..."
            search={search}
            onSearchChange={setSearch}
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3">PO Number</th>
                    <th className="p-3">Vendor / Supplier</th>
                    <th className="p-3">Delivery Status</th>
                    <th className="p-3 text-right">Total Value (PKR)</th>
                    <th className="p-3">Dispatched Date</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredPOs
                    .filter((po) => po.status === "APPROVED" || po.status === "SUBMITTED" || po.status === "PARTIALLY_RECEIVED")
                    .map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                        <td className="p-3 font-bold whitespace-nowrap">{po.poNumber || "-"}</td>
                        <td className="p-3 font-semibold">{po.vendor?.name || "Unknown Vendor"}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                            Dispatched / Pending
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold">{Number(po.totalAmount || 0).toFixed(2)}</td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "-"}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => openGrnForm(po)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] font-bold flex items-center gap-1 mx-auto shadow-md shadow-blue-500/10"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Check-In 1st Delivery
                          </button>
                        </td>
                      </tr>
                    ))}
                  {filteredPOs.filter((po) => po.status === "SUBMITTED").length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">All 1st deliveries checked in! No pending new arrivals.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === "shortages" ? (
        /* ==================== SHORTAGE RESOLUTION TAB ==================== */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                  <th className="p-3">PO Number</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3">Product SKU</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3 text-right">Shortage Qty</th>
                  <th className="p-3 text-right">Resolved Qty</th>
                  <th className="p-3 text-right font-bold text-rose-500">Outstanding</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {pendingItems.map((item) => {
                  const missing = item.quantityMissing || 0;
                  const resolved = item.quantityResolved || 0;
                  const outstanding = missing - resolved;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                      <td className="p-3 font-bold">{item.poNumber || "-"}</td>
                      <td className="p-3 font-semibold">{item.vendorName || "Unknown Vendor"}</td>
                      <td className="p-3 font-bold">{item.product?.sku || "-"}</td>
                      <td className="p-3">{item.product?.name || "-"}</td>
                      <td className="p-3 text-right text-slate-400 font-semibold">{missing}</td>
                      <td className="p-3 text-right text-emerald-500 font-semibold">{resolved}</td>
                      <td className="p-3 text-right font-black text-rose-500 text-sm">{outstanding}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => openResolveForm(item)}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1 mx-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Receive Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {pendingItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">All procurement shortfalls resolved! No pending stock shortages.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ==================== VENDORS TAB ==================== */
        <div className="space-y-4">
          <SearchFilter
            placeholder="Search vendors by name or email..."
            search={search}
            onSearchChange={setSearch}
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3">Vendor / Supplier Name</th>
                    <th className="p-3">Contact Person</th>
                    <th className="p-3">Contact Phone</th>
                    <th className="p-3">Address</th>
                    <th className="p-3 text-center">Total POs</th>
                    <th className="p-3 text-right">Total Purchases</th>
                    <th className="p-3 text-right">Ledger / Net Payable</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {vendors
                    .filter((v) => {
                      const name = v?.name || "";
                      const email = v?.email || "";
                      const ntn = v?.ntn || "";
                      const contactPerson = v?.contactPerson || "";
                      const text = `${name} ${email} ${ntn} ${contactPerson}`.toLowerCase();
                      return text.includes((search || "").toLowerCase());
                    })
                    .map((vendor) => {
                      const netPayable = vendor.ledgerBalance !== undefined ? vendor.ledgerBalance : 0;
                      return (
                        <tr key={vendor.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{vendor.name}</span>
                              {vendor.ntn && (
                                <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-normal" title={`NTN: ${vendor.ntn}`}>
                                  NTN: {vendor.ntn}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate max-w-xs">{vendor.email || vendor.paymentTerms || "-"}</p>
                          </td>
                          <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{vendor.contactPerson}</td>
                          <td className="p-3 font-mono font-medium whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {vendor.phone}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 max-w-xs truncate" title={vendor.address}>{vendor.address || "-"}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded font-bold font-mono text-[11px]">
                              {vendor.totalPOs || 0}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold">
                            PKR {Number(vendor.totalPurchases || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            <div>
                              <span className={netPayable > 0 ? "text-amber-500" : netPayable < 0 ? "text-blue-500" : "text-emerald-500"}>
                                PKR {Math.abs(netPayable).toLocaleString()}
                              </span>
                              <span className={`block text-[9px] font-bold uppercase tracking-wider ${
                                netPayable > 0 ? "text-amber-600" : netPayable < 0 ? "text-blue-600" : "text-emerald-600"
                              }`}>
                                {netPayable > 0 ? "Payable" : netPayable < 0 ? "Advance Paid" : "Settled"}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedVendor(vendor);
                                  setIsLedgerOpen(true);
                                  setLedgerTab("po");
                                }}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 rounded text-[10px] font-bold text-blue-600 dark:text-blue-400 transition-all flex items-center gap-1"
                                title="View Complete Vendor History & Statement"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Statement</span>
                              </button>
                              <a
                                href={`/financials?tab=ledger&partyType=VENDOR&partyName=${encodeURIComponent(vendor.name)}`}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 rounded text-[10px] font-bold text-emerald-600 dark:text-emerald-400 transition-all flex items-center gap-1"
                                title="Open Full Financial Ledger in Financials"
                              >
                                <BookOpen className="w-3 h-3" />
                                <span>Ledger</span>
                              </a>
                              <button
                                onClick={() => openEditVendor(vendor)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-[10px] font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1"
                                title="Edit Vendor Details"
                              >
                                <span>✏️ Edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {vendors.filter((v) => {
                    const name = v?.name || "";
                    const email = v?.email || "";
                    const ntn = v?.ntn || "";
                    const contactPerson = v?.contactPerson || "";
                    const text = `${name} ${email} ${ntn} ${contactPerson}`.toLowerCase();
                    return text.includes((search || "").toLowerCase());
                  }).length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">No vendors registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATE PO MODAL ==================== */}
      {mounted && isCreateOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-4xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Purchase Order</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Select a vendor and compile items to order from supplier. Submitted POs flag incoming quantities.</p>

            <form onSubmit={handleSubmitPO} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Supplier Vendor</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Type to search and select vendor..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    value={vendorSearch}
                    onFocus={() => setShowVendorSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowVendorSuggestions(false), 200)}
                    onChange={(e) => {
                      setVendorSearch(e.target.value);
                      if (e.target.value === "") {
                        setNewPoVendor("");
                      }
                      setShowVendorSuggestions(true);
                    }}
                  />
                  {showVendorSuggestions && (
                    <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {vendors
                        .filter((v) => {
                          const name = v?.name || "";
                          const contact = v?.contactPerson || "";
                          const phone = v?.phone || "";
                          const email = v?.email || "";
                          const text = `${name} ${contact} ${phone} ${email}`.toLowerCase();
                          return text.includes((vendorSearch || "").toLowerCase());
                        })
                        .map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            className="w-full px-4 py-2.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 flex flex-col gap-0.5"
                            onClick={() => {
                              setNewPoVendor(v.id);
                              setVendorSearch(v.name || "");
                              setShowVendorSuggestions(false);
                            }}
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-100">{v.name || "Unnamed Vendor"}</span>
                            <span className="text-slate-400 text-[10px]">{v.contactPerson || "No contact"} • {v.phone || "No phone"}</span>
                          </button>
                        ))}
                      {vendors.filter((v) => {
                        const name = v?.name || "";
                        const contact = v?.contactPerson || "";
                        const phone = v?.phone || "";
                        const email = v?.email || "";
                        const text = `${name} ${contact} ${phone} ${email}`.toLowerCase();
                        return text.includes((vendorSearch || "").toLowerCase());
                      }).length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">No matching vendors found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PO Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto: PO-1000x"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={newPoNumber}
                    onChange={(e) => setNewPoNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PO Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPoDate}
                    onChange={(e) => setNewPoDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Expected Delivery Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPoDeliveryDate}
                    onChange={(e) => setNewPoDeliveryDate(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Delivery Address <span className="text-slate-400 font-normal normal-case">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Multan Warehouse #2, Site Delivery"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPoDeliveryAddress}
                    onChange={(e) => setNewPoDeliveryAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Dynamic Line items */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Line Items</span>
                  <button
                    type="button"
                    onClick={() => setNewPoLines([...newPoLines, { productId: "", quantityOrdered: "", unitCost: "" }])}
                    className="text-xs text-blue-500 hover:underline font-bold flex items-center gap-1"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-3 border-y border-slate-100 dark:border-slate-800 py-3">
                  {/* Grid Headers */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:grid mb-1">
                    <div className="col-span-5">Product / Item</div>
                    <div className="col-span-3">Quantity</div>
                    <div className="col-span-3">Unit Cost (PKR)</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {newPoLines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl">
                      <div className="col-span-12 sm:col-span-5">
                        <select
                          required
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900"
                          value={line.productId}
                          onChange={(e) => {
                            const updated = [...newPoLines];
                            updated[index].productId = e.target.value;
                            // default unit cost
                            const prod = products.find((p) => p.id === e.target.value);
                            if (prod) updated[index].unitCost = String(prod.averageCost);
                            setNewPoLines(updated);
                          }}
                        >
                          <option value="">Choose item...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-12 sm:col-span-3">
                        <input
                          type="number"
                          required
                          placeholder="Quantity"
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900"
                          value={line.quantityOrdered}
                          onChange={(e) => {
                            const updated = [...newPoLines];
                            updated[index].quantityOrdered = e.target.value;
                            setNewPoLines(updated);
                          }}
                        />
                      </div>

                      <div className="col-span-12 sm:col-span-3">
                        <input
                          type="number"
                          required
                          placeholder="Unit Cost (PKR)"
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900"
                          value={line.unitCost}
                          onChange={(e) => {
                            const updated = [...newPoLines];
                            updated[index].unitCost = e.target.value;
                            setNewPoLines(updated);
                          }}
                        />
                      </div>

                      <div className="col-span-12 sm:col-span-1 text-center">
                        {newPoLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewPoLines(newPoLines.filter((_, i) => i !== index))}
                            className="text-xs text-rose-500 font-bold hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* GST & Discount Settings and Live Calculation Breakdown */}
                {(() => {
                  const subtotal = newPoLines.reduce((acc, l) => acc + (Number(l.quantityOrdered) || 0) * (Number(l.unitCost) || 0), 0);
                  let discountAmount = 0;
                  const discVal = Number(newPoDiscountValue) || 0;
                  if (newPoDiscountType === "PERCENTAGE") {
                    discountAmount = Math.round(subtotal * (discVal / 100));
                  } else {
                    discountAmount = Math.round(discVal);
                  }
                  const taxable = Math.max(0, subtotal - discountAmount);
                  const tax = newPoIsGst ? Math.round(taxable * (Number(newPoTaxRate || 18) / 100)) : 0;
                  const grandTotal = Math.max(0, taxable + tax);

                  return (
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl space-y-4 text-xs border border-slate-100 dark:border-slate-800/80 mt-3">
                      {/* Configuration Row: Discount & GST Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                        {/* Discount Mode */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Discount Type & Value
                          </label>
                          <div className="flex items-center gap-2">
                            <select
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
                              value={newPoDiscountType}
                              onChange={(e) => setNewPoDiscountType(e.target.value as any)}
                            >
                              <option value="FIXED">Fixed (PKR)</option>
                              <option value="PERCENTAGE">Percentage (%)</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              max={newPoDiscountType === "PERCENTAGE" ? "100" : undefined}
                              placeholder={newPoDiscountType === "PERCENTAGE" ? "e.g. 10%" : "e.g. 5000"}
                              className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-right font-semibold font-mono text-xs focus:ring-2 focus:ring-blue-500"
                              value={newPoDiscountValue}
                              onChange={(e) => setNewPoDiscountValue(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* GST / Sales Tax Mode */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Sales Tax (GST) Option
                          </label>
                          <div className="flex items-center gap-2">
                            <select
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold flex-1"
                              value={newPoIsGst ? "GST" : "NON_GST"}
                              onChange={(e) => setNewPoIsGst(e.target.value === "GST")}
                            >
                              <option value="NON_GST">Non-GST (No Sales Tax)</option>
                              <option value="GST">GST (With Sales Tax)</option>
                            </select>
                            {newPoIsGst && (
                              <div className="flex items-center gap-1 w-28">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="Tax %"
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-right font-semibold font-mono text-xs"
                                  value={newPoTaxRate}
                                  onChange={(e) => setNewPoTaxRate(Number(e.target.value) || 0)}
                                />
                                <span className="font-bold text-xs text-slate-400">%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Summary Breakdown */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-slate-500 font-semibold">
                          <span>Subtotal:</span>
                          <span className="font-mono">{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                        </div>

                        {discountAmount > 0 && (
                          <div className="flex justify-between items-center text-rose-500 font-semibold">
                            <span>
                              Discount {newPoDiscountType === "PERCENTAGE" ? `(${newPoDiscountValue}%)` : ""}:
                            </span>
                            <span className="font-mono">-{discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                          </div>
                        )}

                        {newPoIsGst && (
                          <>
                            <div className="flex justify-between items-center text-slate-500 font-semibold">
                              <span>Taxable Amount:</span>
                              <span className="font-mono">{taxable.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                            </div>
                            <div className="flex justify-between items-center text-blue-600 dark:text-blue-400 font-semibold">
                              <span>Sales Tax (GST @ {newPoTaxRate}%):</span>
                              <span className="font-mono">+{tax.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                            </div>
                          </>
                        )}

                        <div className="flex justify-between items-center text-slate-900 dark:text-slate-100 font-black border-t border-slate-200 dark:border-slate-800 pt-2 text-sm">
                          <span>Total Amount:</span>
                          <span className="text-blue-600 dark:text-blue-400 font-mono text-base">{grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* PO Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Purchase Order Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Enter purchase terms, delivery instructions, quality expectations etc..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
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
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Submit & Dispatch PO
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== EDIT PURCHASE ORDER MODAL ==================== */}
      {mounted && isEditPoOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-4xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Modify Existing Order</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Edit Purchase Order {editPoNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditPoOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Update vendor, order items, unit rates, discount settings, GST tax, and delivery dates.</p>

            <form onSubmit={handleUpdatePo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-bold">Select Vendor</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editPoVendor}
                    onChange={(e) => setEditPoVendor(e.target.value)}
                  >
                    <option value="">Choose a vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-bold">PO Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold"
                    value={editPoDate}
                    onChange={(e) => setEditPoDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-bold">Expected Delivery</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold"
                    value={editPoDeliveryDate}
                    onChange={(e) => setEditPoDeliveryDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Order Status & Delivery Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-bold">Order Status</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold"
                    value={editPoStatus}
                    onChange={(e) => setEditPoStatus(e.target.value)}
                  >
                    <option value="APPROVED">Approved (Active for GRN Receiving)</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="PARTIALLY_RECEIVED">Partially Received</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-bold">
                    Delivery Address <span className="text-slate-400 font-normal normal-case">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Multan Warehouse #2"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold"
                    value={editPoDeliveryAddress}
                    onChange={(e) => setEditPoDeliveryAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Line Items</span>
                  <button
                    type="button"
                    onClick={() => setEditPoLines([...editPoLines, { productId: "", quantityOrdered: "", unitCost: "" }])}
                    className="text-xs text-blue-500 hover:underline font-bold flex items-center gap-1"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-3 border-y border-slate-100 dark:border-slate-800 py-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:grid mb-1">
                    <div className="col-span-5">Product / Item</div>
                    <div className="col-span-3">Quantity</div>
                    <div className="col-span-3">Unit Cost (PKR)</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {editPoLines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl">
                      <div className="col-span-12 sm:col-span-5">
                        <select
                          required
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900"
                          value={line.productId}
                          onChange={(e) => {
                            const updated = [...editPoLines];
                            updated[index].productId = e.target.value;
                            const prod = products.find((p) => p.id === e.target.value);
                            if (prod) updated[index].unitCost = String(prod.averageCost);
                            setEditPoLines(updated);
                          }}
                        >
                          <option value="">Choose item...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-12 sm:col-span-3">
                        <input
                          type="number"
                          required
                          placeholder="Quantity"
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900"
                          value={line.quantityOrdered}
                          onChange={(e) => {
                            const updated = [...editPoLines];
                            updated[index].quantityOrdered = e.target.value;
                            setEditPoLines(updated);
                          }}
                        />
                      </div>

                      <div className="col-span-12 sm:col-span-3">
                        <input
                          type="number"
                          required
                          placeholder="Unit Cost (PKR)"
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900"
                          value={line.unitCost}
                          onChange={(e) => {
                            const updated = [...editPoLines];
                            updated[index].unitCost = e.target.value;
                            setEditPoLines(updated);
                          }}
                        />
                      </div>

                      <div className="col-span-12 sm:col-span-1 text-center">
                        {editPoLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEditPoLines(editPoLines.filter((_, i) => i !== index))}
                            className="text-xs text-rose-500 font-bold hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit Calculations Block */}
                {(() => {
                  const subtotal = editPoLines.reduce((acc, l) => acc + (Number(l.quantityOrdered) || 0) * (Number(l.unitCost) || 0), 0);
                  let discountAmount = 0;
                  const discVal = Number(editPoDiscountValue) || 0;
                  if (editPoDiscountType === "PERCENTAGE") {
                    discountAmount = Math.round(subtotal * (discVal / 100));
                  } else {
                    discountAmount = Math.round(discVal);
                  }
                  const taxable = Math.max(0, subtotal - discountAmount);
                  const tax = editPoIsGst ? Math.round(taxable * (Number(editPoTaxRate || 18) / 100)) : 0;
                  const grandTotal = Math.max(0, taxable + tax);

                  return (
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl space-y-4 text-xs border border-slate-100 dark:border-slate-800/80 mt-3">
                      {/* Configuration Row: Discount & GST Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                        {/* Discount Mode */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Discount Type & Value
                          </label>
                          <div className="flex items-center gap-2">
                            <select
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
                              value={editPoDiscountType}
                              onChange={(e) => setEditPoDiscountType(e.target.value as any)}
                            >
                              <option value="FIXED">Fixed (PKR)</option>
                              <option value="PERCENTAGE">Percentage (%)</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              max={editPoDiscountType === "PERCENTAGE" ? "100" : undefined}
                              placeholder={editPoDiscountType === "PERCENTAGE" ? "e.g. 10%" : "e.g. 5000"}
                              className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-right font-semibold font-mono text-xs focus:ring-2 focus:ring-blue-500"
                              value={editPoDiscountValue}
                              onChange={(e) => setEditPoDiscountValue(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* GST / Sales Tax Mode */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Sales Tax (GST) Option
                          </label>
                          <div className="flex items-center gap-2">
                            <select
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold flex-1"
                              value={editPoIsGst ? "GST" : "NON_GST"}
                              onChange={(e) => setEditPoIsGst(e.target.value === "GST")}
                            >
                              <option value="NON_GST">Non-GST (No Sales Tax)</option>
                              <option value="GST">GST (With Sales Tax)</option>
                            </select>
                            {editPoIsGst && (
                              <div className="flex items-center gap-1 w-28">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="Tax %"
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-right font-semibold font-mono text-xs"
                                  value={editPoTaxRate}
                                  onChange={(e) => setEditPoTaxRate(Number(e.target.value) || 0)}
                                />
                                <span className="font-bold text-xs text-slate-400">%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Summary Breakdown */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-slate-500 font-semibold">
                          <span>Subtotal:</span>
                          <span className="font-mono">{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                        </div>

                        {discountAmount > 0 && (
                          <div className="flex justify-between items-center text-rose-500 font-semibold">
                            <span>
                              Discount {editPoDiscountType === "PERCENTAGE" ? `(${editPoDiscountValue}%)` : ""}:
                            </span>
                            <span className="font-mono">-{discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                          </div>
                        )}

                        {editPoIsGst && (
                          <>
                            <div className="flex justify-between items-center text-slate-500 font-semibold">
                              <span>Taxable Amount:</span>
                              <span className="font-mono">{taxable.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                            </div>
                            <div className="flex justify-between items-center text-blue-600 dark:text-blue-400 font-semibold">
                              <span>Sales Tax (GST @ {editPoTaxRate}%):</span>
                              <span className="font-mono">+{tax.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                            </div>
                          </>
                        )}

                        <div className="flex justify-between items-center text-slate-900 dark:text-slate-100 font-black border-t border-slate-200 dark:border-slate-800 pt-2 text-sm">
                          <span>Total Amount:</span>
                          <span className="text-blue-600 dark:text-blue-400 font-mono text-base">{grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* PO Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Purchase Order Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Enter purchase terms, delivery instructions, quality expectations etc..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  value={editPoNotes}
                  onChange={(e) => setEditPoNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditPoOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPo}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {updatingPo ? "Saving Changes..." : "Save & Update PO"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== PO DETAILS MODAL ==================== */}
      {mounted && selectedPO && !isGrnOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-3xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Purchase Order {selectedPO.poNumber || "-"}</h3>
                <span className="text-[10px] text-slate-400">Created: {selectedPO.createdAt ? new Date(selectedPO.createdAt).toLocaleString() : "-"}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <p className="text-slate-400 font-semibold">Supplier Vendor:</p>
                <p className="font-bold text-slate-700 dark:text-slate-200">{selectedPO.vendor?.name || "Unknown Vendor"}</p>
                <p className="text-[10px] text-slate-500">
                  {selectedPO.vendor?.phone || "-"}
                  {selectedPO.vendor?.email ? ` | ${selectedPO.vendor.email}` : ""}
                  {selectedPO.vendor?.ntn ? ` | NTN: ${selectedPO.vendor.ntn}` : ""}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold">PO Status:</p>
                <p className="font-bold capitalize">{selectedPO.status === "SUBMITTED" ? "APPROVED" : (selectedPO.status || "APPROVED")}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold">User ID / Created By:</p>
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  {(() => {
                    const creator = (selectedPO.meta || parsePoMetadata(selectedPO.notes, selectedPO)).createdByName;
                    return creator === "System Admin" || !creator ? "Saleem" : creator;
                  })()}
                </p>
              </div>
            </div>

            {(() => {
              const meta = selectedPO.meta || parsePoMetadata(selectedPO.notes, selectedPO);
              if (!meta.deliveryAddress) return null;
              return (
                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs border border-slate-100 dark:border-slate-800 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Delivery Address</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{meta.deliveryAddress}</span>
                  </div>
                </div>
              );
            })()}

            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Order Line Items</h4>
            <div className="overflow-y-auto max-h-48 border border-slate-200 dark:border-slate-800 rounded-xl mb-6">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="p-2">Item SKU</th>
                    <th className="p-2">Name</th>
                    <th className="p-2 text-right">Ordered</th>
                    <th className="p-2 text-right">Received</th>
                    <th className="p-2 text-right">Unit Cost (PKR)</th>
                    <th className="p-2 text-right">Line Total (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {(selectedPO.lineItems || []).map((line: any, idx: number) => {
                    const lTotal = (Number(line.quantityOrdered || 0) * Number(line.unitCost || 0));
                    return (
                      <tr key={line.id || idx}>
                        <td className="p-2 font-bold">{line.product?.sku || "-"}</td>
                        <td className="p-2">{line.product?.name || "-"}</td>
                        <td className="p-2 text-right font-semibold">{Number(line.quantityOrdered || 0)}</td>
                        <td className="p-2 text-right text-emerald-500 font-bold">{Number(line.quantityReceived || 0)}</td>
                        <td className="p-2 text-right font-mono">{Number(line.unitCost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right font-mono font-bold">{lTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                  {(!selectedPO.lineItems || selectedPO.lineItems.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">No line items in this purchase order.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            {(() => {
              const meta = selectedPO.meta || parsePoMetadata(selectedPO.notes, selectedPO);
              const subtotal = meta.subtotalAmount || (selectedPO.lineItems || []).reduce((acc: number, line: any) => acc + Number(line.quantityOrdered || 0) * Number(line.unitCost || 0), 0);
              const discount = meta.discountAmount ?? Number(selectedPO.discount || 0);
              const isGst = meta.isGst;
              const taxRate = meta.taxRate || 18;
              const salesTax = meta.taxAmount;
              const totalAmount = meta.totalAmount || Number(selectedPO.totalAmount || 0);

              return (
                <div className="border border-slate-100 dark:border-slate-800/85 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl text-xs space-y-2 mb-6">
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Subtotal:</span>
                    <span className="font-mono">{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-500 font-medium">
                      <span>
                        Discount {meta.discountType === "PERCENTAGE" && meta.discountPercent > 0 ? `(${meta.discountPercent}%)` : ""}:
                      </span>
                      <span className="font-mono">-{discount.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                    </div>
                  )}
                  {isGst && (
                    <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium">
                      <span>Sales Tax (GST @ {taxRate}%):</span>
                      <span className="font-mono">+{salesTax.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-800 dark:text-slate-100 font-bold text-sm border-t border-slate-200 dark:border-slate-850 pt-2">
                    <span>Total Amount:</span>
                    <span className="font-mono text-blue-500 text-base">{totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} PKR</span>
                  </div>
                </div>
              );
            })()}

            {/* Notes if present */}
            {(() => {
              const meta = selectedPO.meta || parsePoMetadata(selectedPO.notes, selectedPO);
              return meta.userNotes ? (
                <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes / Instructions:</span>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{meta.userNotes}</p>
                </div>
              ) : null;
            })()}

            {/* GRN Logs list if any */}
            {selectedPO.grns && selectedPO.grns.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Linked Goods Receipts (GRNs)</h4>
                <div className="space-y-1.5">
                  {selectedPO.grns.map((grn: any, idx: number) => (
                    <div key={grn.id || idx} className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-[10px] flex justify-between items-center">
                      <span className="font-bold">{grn.grnNumber || "-"}</span>
                      <span className="text-slate-400">Date: {grn.receivedAt ? new Date(grn.receivedAt).toLocaleDateString() : "-"}</span>
                      <span className="text-slate-400">By: {grn.receivedBy?.name || "Staff"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const poToEdit = selectedPO;
                  setSelectedPO(null);
                  openEditPo(poToEdit);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit this PO
              </button>

              <div className="flex items-center gap-2">
                {selectedPO.id && (
                  <a
                    href={`/procurement/po/${selectedPO.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> View & Print PDF
                  </a>
                )}
                <button
                  onClick={() => setSelectedPO(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== GRN FORM MODAL ==================== */}
      {mounted && isGrnOpen && selectedPO && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-4xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Log Goods Received Note (GRN)</h3>
              <button
                type="button"
                onClick={() => setIsGrnOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Receive stock items against PO {selectedPO.poNumber || "-"}. shortfalls are automatically tracked.</p>

            <form onSubmit={handleGrnSubmit} className="space-y-4">
              <div className="space-y-3">
                {grnLines.map((line, index) => (
                  <div key={line.productId} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl">
                    <div>
                      <span className="block font-bold text-xs">{line.sku}</span>
                      <span className="block text-[10px] text-slate-500">{line.name}</span>
                    </div>
                    <div className="text-center text-xs">
                      <span className="block text-slate-400">Ordered:</span>
                      <span className="font-bold">{line.quantityOrdered}</span>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Received This Shipment</label>
                      <input
                        type="number"
                        required
                        className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded text-xs font-bold text-emerald-500 font-mono"
                        value={line.quantityReceived}
                        max={line.remaining}
                        onChange={(e) => {
                          const updated = [...grnLines];
                          const val = e.target.value === "" ? "" : parseInt(e.target.value) || 0;
                          if (val !== "" && val > line.remaining) {
                            toast({ title: "Exceeds Remaining", message: `Cannot receive more than remaining outstanding quantity (${line.remaining}).`, type: "warning" });
                            updated[index].quantityReceived = line.remaining;
                          } else {
                            updated[index].quantityReceived = val;
                          }
                          setGrnLines(updated);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Unit Cost (PKR)</label>
                      <input
                        type="number"
                        required
                        className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded text-xs"
                        value={line.unitCost}
                        onChange={(e) => {
                          const updated = [...grnLines];
                          updated[index].unitCost = e.target.value;
                          setGrnLines(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Receiving Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Shipment arrived in partial delivery, missing air filters"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={grnNotes}
                  onChange={(e) => setGrnNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGrnOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
                >
                  Confirm & Receive Stock
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== RESOLVE SHORTAGE MODAL ==================== */}
      {mounted && isResolveOpen && selectedPendingItem && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 my-auto mx-auto relative">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Receive Missing Stock</h3>
              <button
                type="button"
                onClick={() => setIsResolveOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Log the arrival of previously shortfall items for PO {selectedPendingItem.poNumber || "-"}.</p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-xs space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Product SKU:</span>
                  <span className="font-bold">{selectedPendingItem.product?.sku || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Missing Qty:</span>
                  <span className="font-bold">{selectedPendingItem.quantityMissing || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Resolved Qty:</span>
                  <span className="font-bold text-emerald-500">{selectedPendingItem.quantityResolved || 0}</span>
                </div>
                <div className="flex justify-between text-rose-500 font-bold border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span>Outstanding:</span>
                  <span>{(selectedPendingItem.quantityMissing || 0) - (selectedPendingItem.quantityResolved || 0)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quantity Received</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-emerald-500 font-mono"
                  value={resolveQty}
                  max={(selectedPendingItem.quantityMissing || 0) - (selectedPendingItem.quantityResolved || 0)}
                  onChange={(e) => {
                    const maxQty = (selectedPendingItem.quantityMissing || 0) - (selectedPendingItem.quantityResolved || 0);
                    const val = parseInt(e.target.value) || 0;
                    if (val > maxQty) {
                      toast({ title: "Exceeds Shortfall", message: `Cannot resolve more than outstanding quantity (${maxQty}).`, type: "warning" });
                      setResolveQty(String(maxQty));
                    } else {
                      setResolveQty(e.target.value);
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResolveOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Log Arrival
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== REGISTER VENDOR MODAL ==================== */}
      {mounted && isVendorOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Register Supplier Vendor</h3>
              <button
                type="button"
                onClick={() => setIsVendorOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Onboard a new supplier vendor to enable dispatching of Purchase Orders.</p>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vendor Name / Business Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Carrier Global Suppliers"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mr. Imran"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={vendorContact}
                    onChange={(e) => setVendorContact(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +923001234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. contact@supplier.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">NTN Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1234567-8"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={vendorNtn}
                    onChange={(e) => setVendorNtn(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Business Address</label>
                <textarea
                  placeholder="e.g. Plot 42-C, Industrial Estate, Karachi"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                />
              </div>



              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVendorOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl text-xs font-bold transition-all"
                >
                  {registering ? "Registering..." : "Onboard Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== EDIT VENDOR MODAL ==================== */}
      {mounted && isEditVendorOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>✏️ Edit Supplier / Vendor Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditVendorOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Update vendor contact information, NTN, address, and payment terms.</p>

            <form onSubmit={handleUpdateVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vendor Name / Business Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Carrier Global Suppliers"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={editVendorName}
                  onChange={(e) => setEditVendorName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mr. Imran"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editVendorContact}
                    onChange={(e) => setEditVendorContact(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +923001234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={editVendorPhone}
                    onChange={(e) => setEditVendorPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. contact@supplier.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editVendorEmail}
                    onChange={(e) => setEditVendorEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">NTN Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1234567-8"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={editVendorNtn}
                    onChange={(e) => setEditVendorNtn(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Business Address</label>
                <textarea
                  placeholder="e.g. Plot 42-C, Industrial Estate, Karachi"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                  value={editVendorAddress}
                  onChange={(e) => setEditVendorAddress(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditVendorOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingVendor}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500/50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  {updatingVendor ? "Saving Changes..." : "Save Vendor Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== VENDOR STATEMENT & LEDGER DIALOG ==================== */}
      {mounted && isLedgerOpen && selectedVendor && createPortal(
        (() => {
          // Calculations
          const vendorPOs = (purchaseOrders || []).filter((po) => po.vendorId === selectedVendor.id);
          
          const productMap: { [productId: string]: { sku: string; name: string; ordered: number; received: number; cost: number } } = {};
          vendorPOs.forEach((po) => {
            (po.lineItems || []).forEach((li: any) => {
              if (!productMap[li.productId]) {
                productMap[li.productId] = {
                  sku: li.product?.sku || "-",
                  name: li.product?.name || "-",
                  ordered: 0,
                  received: 0,
                  cost: Number(li.unitCost || 0),
                };
              }
              productMap[li.productId].ordered += Number(li.quantityOrdered || 0);
              productMap[li.productId].received += Number(li.quantityReceived || 0);
              productMap[li.productId].cost = Number(li.unitCost || 0);
            });
          });
          const productSummaryList = Object.values(productMap);

          const totalOrdered = productSummaryList.reduce((acc, p) => acc + p.ordered, 0);
          const totalReceived = productSummaryList.reduce((acc, p) => acc + p.received, 0);
          const totalPending = totalOrdered - totalReceived;
          const outstandingValuation = productSummaryList.reduce((acc, p) => acc + Math.max(0, p.ordered - p.received) * p.cost, 0);

          const vendorGRNs: any[] = [];
          vendorPOs.forEach((po) => {
            if (po.grns) {
              po.grns.forEach((grn: any) => {
                (grn.lineItems || []).forEach((li: any) => {
                  vendorGRNs.push({
                    grnNumber: grn.grnNumber,
                    receivedAt: grn.receivedAt,
                    sku: li.product?.sku || "-",
                    name: li.product?.name || "-",
                    quantity: Number(li.quantityReceived || 0),
                    cost: Number(li.unitCost || 0),
                  });
                });
              });
            }
          });
          vendorGRNs.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

          return (
            <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-4xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedVendor.name || "Vendor"} - Procurement Statement</h3>
                    <p className="text-xs text-slate-500 mt-1">Full purchase order tracking, shipment receipts, and pending balances ledger.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLedgerOpen(false);
                      setSelectedVendor(null);
                    }}
                    className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Total Ordered</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">{totalOrdered} Units</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Total Received</span>
                    <span className="text-lg font-black text-emerald-500 font-mono">{totalReceived} Units</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Outstanding Balance</span>
                    <span className="text-lg font-black text-amber-500 font-mono">{totalPending} Units</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Pending Valuation</span>
                    <span className="text-lg font-black text-blue-500 font-mono">PKR {outstandingValuation.toFixed(2)}</span>
                  </div>
                </div>

                {/* Tabs selector */}
                <div className="flex border-b border-slate-100 dark:border-slate-800/80 gap-1 mb-4 overflow-x-auto">
                  {[
                    { id: "finance", label: `Financial Ledger & Debit/Credit (${vendorLedgerData?.transactions?.length || 0})` },
                    { id: "po", label: `Purchase Orders (${vendorPOs.length})` },
                    { id: "products", label: `Items Ledger (${productSummaryList.length})` },
                    { id: "grn", label: `Received Shipments (${vendorGRNs.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setLedgerTab(tab.id)}
                      className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                        ledgerTab === tab.id
                          ? "border-blue-500 text-blue-600 dark:text-blue-400"
                          : "border-transparent text-slate-400"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab 0: Financial Ledger & Debit/Credit */}
                {ledgerTab === "finance" && (
                  <div className="space-y-4">
                    {/* Top Summary Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Purchases (Credits)</span>
                          <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                            PKR {Number(vendorLedgerData?.summary?.totalCredit || selectedVendor.ledgerCredits || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
                        <div>
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Total Paid (Debits)</span>
                          <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                            PKR {Number(vendorLedgerData?.summary?.totalDebit || selectedVendor.ledgerDebits || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
                        <div>
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Net Balance</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-sm font-black font-mono text-amber-500">
                              PKR {Math.abs(Number(vendorLedgerData?.summary?.closingBalance !== undefined ? vendorLedgerData?.summary?.closingBalance : selectedVendor.ledgerBalance || 0)).toLocaleString()}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              (vendorLedgerData?.summary?.closingBalance || selectedVendor.ledgerBalance || 0) > 0
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60"
                                : (vendorLedgerData?.summary?.closingBalance || selectedVendor.ledgerBalance || 0) < 0
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60"
                            }`}>
                              {(vendorLedgerData?.summary?.closingBalance || selectedVendor.ledgerBalance || 0) > 0 ? "Payable" : (vendorLedgerData?.summary?.closingBalance || selectedVendor.ledgerBalance || 0) < 0 ? "Advance Paid" : "Settled"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <a
                        href={`/financials?tab=ledger&partyType=VENDOR&partyName=${encodeURIComponent(selectedVendor.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Open Full Party Ledger in Financials</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </a>
                    </div>

                    {/* Financial Ledger Table */}
                    {vendorLedgerLoading ? (
                      <div className="p-8 text-center text-slate-400">Loading vendor financial ledger...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Doc / Voucher Ref</th>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5">Description</th>
                              <th className="p-2.5 text-right">Debit (Paid)</th>
                              <th className="p-2.5 text-right">Credit (Bill)</th>
                              <th className="p-2.5 text-right">Running Balance (PKR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {vendorLedgerData?.transactions?.map((tx: any, index: number) => {
                              const isDebit = Number(tx.debit) > 0;
                              const isCredit = Number(tx.credit) > 0;
                              return (
                                <tr key={tx.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                                  <td className="p-2.5 text-slate-500 whitespace-nowrap font-mono">
                                    {new Date(tx.date).toLocaleDateString()}
                                  </td>
                                  <td className="p-2.5 font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                                    {tx.voucherNumber || tx.referenceNumber || "-"}
                                  </td>
                                  <td className="p-2.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      tx.docType === "GRN" || tx.docType === "PURCHASE"
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60"
                                        : tx.docType === "PAYMENT" || tx.docType === "CPV" || tx.docType === "BPV"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60"
                                        : tx.docType === "RETURN"
                                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60"
                                        : "bg-slate-100 text-slate-700 dark:bg-slate-800"
                                    }`}>
                                      {tx.docType}
                                    </span>
                                  </td>
                                  <td className="p-2.5 max-w-sm truncate text-slate-700 dark:text-slate-300 font-medium" title={tx.description}>
                                    {tx.description}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold">
                                    {isDebit ? (
                                      <span className="text-emerald-500">{Number(tx.debit).toLocaleString()}</span>
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-700">-</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold">
                                    {isCredit ? (
                                      <span className="text-slate-900 dark:text-white">{Number(tx.credit).toLocaleString()}</span>
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-700">-</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold">
                                    <span className={tx.runningBalance > 0 ? "text-amber-500" : tx.runningBalance < 0 ? "text-blue-500" : "text-slate-400"}>
                                      {Math.abs(Number(tx.runningBalance)).toLocaleString()} {tx.runningBalance > 0 ? "Cr (Payable)" : tx.runningBalance < 0 ? "Dr (Adv)" : ""}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            {(!vendorLedgerData?.transactions || vendorLedgerData.transactions.length === 0) && (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400">
                                  No ledger transactions or vouchers found for this vendor.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 1: PO List */}
                {ledgerTab === "po" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                          <th className="p-2.5">PO Number</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 text-right">Value (PKR)</th>
                          <th className="p-2.5 text-center">Items Ordered</th>
                          <th className="p-2.5 text-center">Items Received</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {vendorPOs.map((po) => {
                          const oQty = (po.lineItems || []).reduce((acc: number, l: any) => acc + Number(l.quantityOrdered || 0), 0);
                          const rQty = (po.lineItems || []).reduce((acc: number, l: any) => acc + Number(l.quantityReceived || 0), 0);
                          return (
                            <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                              <td className="p-2.5 font-bold font-mono">{po.poNumber || "-"}</td>
                              <td className="p-2.5 text-slate-500">{po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "-"}</td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  po.status === "COMPLETED"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : po.status === "PARTIALLY_RECEIVED"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                }`}>
                                  {po.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-bold font-mono">{Number(po.totalAmount || 0).toFixed(2)}</td>
                              <td className="p-2.5 text-center font-mono">{oQty}</td>
                              <td className="p-2.5 text-center font-mono">{rQty}</td>
                            </tr>
                          );
                        })}
                        {vendorPOs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">No Purchase Orders logged for this vendor.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab 2: Product Ledger */}
                {ledgerTab === "products" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                          <th className="p-2.5">SKU / Code</th>
                          <th className="p-2.5">Product Name</th>
                          <th className="p-2.5 text-center">Ordered</th>
                          <th className="p-2.5 text-center">Received</th>
                          <th className="p-2.5 text-center">Pending</th>
                          <th className="p-2.5 text-right">Unit Rate (PKR)</th>
                          <th className="p-2.5 text-right">Outstanding Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {productSummaryList.map((prod, index) => {
                          const pending = Math.max(0, prod.ordered - prod.received);
                          const value = pending * prod.cost;
                          return (
                            <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                              <td className="p-2.5 font-bold font-mono">{prod.sku}</td>
                              <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-200">{prod.name}</td>
                              <td className="p-2.5 text-center font-mono">{prod.ordered}</td>
                              <td className="p-2.5 text-center font-mono text-emerald-500">{prod.received}</td>
                              <td className={`p-2.5 text-center font-mono ${pending > 0 ? "text-amber-500 font-bold" : "text-slate-400"}`}>{pending}</td>
                              <td className="p-2.5 text-right font-mono">{prod.cost.toFixed(2)}</td>
                              <td className="p-2.5 text-right font-bold font-mono text-blue-500">{value.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                        {productSummaryList.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">No items ordered from this vendor.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab 3: Receipt History */}
                {ledgerTab === "grn" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                          <th className="p-2.5">GRN Number</th>
                          <th className="p-2.5">Received Date</th>
                          <th className="p-2.5">Product SKU</th>
                          <th className="p-2.5">Product Name</th>
                          <th className="p-2.5 text-right">Units Received</th>
                          <th className="p-2.5 text-right">Unit Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {vendorGRNs.map((grn, index) => (
                          <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                            <td className="p-2.5 font-bold font-mono text-blue-500">{grn.grnNumber}</td>
                            <td className="p-2.5 text-slate-500">{grn.receivedAt ? new Date(grn.receivedAt).toLocaleDateString() : "-"}</td>
                            <td className="p-2.5 font-bold font-mono">{grn.sku}</td>
                            <td className="p-2.5 text-slate-700 dark:text-slate-300">{grn.name}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-500 font-mono">{grn.quantity}</td>
                            <td className="p-2.5 text-right font-mono">{grn.cost.toFixed(2)}</td>
                          </tr>
                        ))}
                        {vendorGRNs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">No shipments received from this vendor yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}

export default function ProcurementPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Procurement...</div>}>
      <ProcurementPageContent />
    </React.Suspense>
  );
}
