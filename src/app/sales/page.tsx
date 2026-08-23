"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, ListFilter, ClipboardCheck, ArrowUpRight, ArrowDownRight, Layers, FileText, CheckCircle2, DollarSign, RefreshCw, Undo2, QrCode, AlertCircle, AlertTriangle, Users, Phone, MapPin, Mail, Edit2, Trash2, Eye, History, User, Building2, Check, Wrench, Receipt, BookOpen, ArrowRight } from "lucide-react";
import SearchFilter from "@/components/shared/SearchFilter";
import SkeletonTable from "@/components/shared/SkeletonTable";
import BulkActionBar from "@/components/shared/BulkActionBar";
import CustomerSelect from "@/components/shared/CustomerSelect";
import ProductSelect from "@/components/shared/ProductSelect";
import { useToast } from "@/components/shared/ToastProvider";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";

function SalesPageContent() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
  const [customerReturns, setCustomerReturns] = useState<any[]>([]);
  const [vendorReturns, setVendorReturns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "invoices"); // invoices, customers, dos, customer_returns, vendor_returns, sales_setup
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { toast } = useToast();
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Customer Management States
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isCustomerDossierOpen, setIsCustomerDossierOpen] = useState(false);
  const [selectedCustomerDossier, setSelectedCustomerDossier] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierTab, setDossierTab] = useState<"invoices" | "complaints" | "dos" | "statement" | "ledger">("invoices");

  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custNtn, setCustNtn] = useState("");
  const [custCnic, setCustCnic] = useState("");
  const [custNotes, setCustNotes] = useState("");
  const [custOpeningBalance, setCustOpeningBalance] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState("");
  const [submittingCustomer, setSubmittingCustomer] = useState(false);

  const handleBulkInvoiceStatus = async (newStatus: string) => {
    if (selectedInvoiceIds.length === 0) return;
    try {
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_INVOICE_STATUS",
          ids: selectedInvoiceIds,
          data: { status: newStatus },
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Invoices Updated", message: json.message, type: "success" });
        setSelectedInvoiceIds([]);
        fetchData();
      } else {
        toast({ title: "Update Failed", message: json.error, type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", message: e.message, type: "error" });
    }
  };

  const handleBulkExportInvoices = () => {
    const selected = invoices.filter((i) => selectedInvoiceIds.includes(i.id));
    if (selected.length === 0) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Invoice #,Client,Phone,Status,Total Amount,Amount Paid,Date"]
        .concat(
          selected.map(
            (i) =>
              `"${i.invoiceNumber}","${i.clientName}","${i.clientPhone || ""}","${i.status}",${i.totalAmount},${i.amountPaid},"${new Date(i.date).toISOString().split("T")[0]}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Selected_Invoices_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", message: `Exported ${selected.length} invoices to CSV.`, type: "info" });
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Modals Toggles
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isDoOpen, setIsDoOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isVendorReturnOpen, setIsVendorReturnOpen] = useState(false);

  // Sales Tax & Pricing Setup states
  const [salesTaxRate, setSalesTaxRate] = useState(18);

  // Standalone Invoice State
  const [clientName, setClientName] = useState("");
  const [isGst, setIsGst] = useState(true);
  const [postingOption, setPostingOption] = useState<"CUSTOMER_LEDGER" | "GENERAL_LEDGER" | "NO_LEDGER">("CUSTOMER_LEDGER");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [selectedComplaintId, setSelectedComplaintId] = useState("");
  const [complaints, setComplaints] = useState<any[]>([]);
  const [invLines, setInvLines] = useState<any[]>([
    { productId: "", description: "", quantity: "1", salesPrice: "", unit: "Nos", isCustom: false, extraFields: {} },
  ]);

  const availableUnits = useMemo(() => {
    const defaults = ["Nos", "Mtr", "Rft", "Ft", "Coil", "Kg", "Ltr", "Box", "Set", "Ton", "Pcs", "Sqft", "Job", "Lot", "Trip", "Hrs", "Days", "Month", "Bundle", "Packet", "Cylinder", "Drum", "Roll", "Bag"];
    const invUnits = (products || []).map((p: any) => p.unit).filter((u: any) => Boolean(u) && typeof u === "string" && u.trim().length > 0);
    return Array.from(new Set([...invUnits, ...defaults]));
  }, [products]);
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [discountValue, setDiscountValue] = useState("0");
  const [subjectHeading, setSubjectHeading] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [immediatePayment, setImmediatePayment] = useState(false);
  const [payMethod, setPayMethod] = useState("CASH");
  const [applyAdvance, setApplyAdvance] = useState(false);
  const [advanceToApply, setAdvanceToApply] = useState("");

  // Delivery Order Creation State
  const [doClientName, setDoClientName] = useState("");
  const [doClientPhone, setDoClientPhone] = useState("");
  const [doAddress, setDoAddress] = useState("");
  const [doNotes, setDoNotes] = useState("");
  const [doThrough, setDoThrough] = useState("");
  const [doVehicle, setDoVehicle] = useState("");
  const [doLines, setDoLines] = useState<any[]>([
    { productId: "", description: "", quantity: "1", salesPrice: "0" },
  ]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [doPoNumber, setDoPoNumber] = useState("");
  const [selectedDoInvoiceId, setSelectedDoInvoiceId] = useState("");

  // Edit Delivery Order State
  const [isEditDoOpen, setIsEditDoOpen] = useState(false);
  const [editingDo, setEditingDo] = useState<any>(null);
  const [editDoClientName, setEditDoClientName] = useState("");
  const [editDoClientPhone, setEditDoClientPhone] = useState("");
  const [editDoAddress, setEditDoAddress] = useState("");
  const [editDoNotes, setEditDoNotes] = useState("");
  const [editDoThrough, setEditDoThrough] = useState("");
  const [editDoVehicle, setEditDoVehicle] = useState("");
  const [editDoPoNumber, setEditDoPoNumber] = useState("");
  const [editDoStatus, setEditDoStatus] = useState("DISPATCHED");
  const [editDoLines, setEditDoLines] = useState<any[]>([]);
  const [editDoError, setEditDoError] = useState("");

  // Payment State
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Customer Return States
  const [returnInvoiceId, setReturnInvoiceId] = useState("");
  const [returnLines, setReturnLines] = useState<any[]>([]);
  const [returnReason, setReturnReason] = useState("");

  // Refund States
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");

  // Vendor Return States
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [grnLineItems, setGrnLineItems] = useState<any[]>([]); // active receipt list
  const [vReturnLines, setVReturnLines] = useState<any[]>([]);
  const [vReturnReason, setVReturnReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const invRes = await fetch("/api/sales/invoice", { headers: { Authorization: `Bearer ${token}` } });
      const doRes = await fetch("/api/sales/do", { headers: { Authorization: `Bearer ${token}` } });
      const pRes = await fetch("/api/inventory/products", { headers: { Authorization: `Bearer ${token}` } });
      const retRes = await fetch("/api/sales/returns", { headers: { Authorization: `Bearer ${token}` } });
      const vrRes = await fetch("/api/procurement/vendor-return", { headers: { Authorization: `Bearer ${token}` } });
      const vRes = await fetch("/api/procurement/vendors", { headers: { Authorization: `Bearer ${token}` } });
      const cRes = await fetch("/api/sales/customers", { headers: { Authorization: `Bearer ${token}` } });
      const compRes = await fetch("/api/support/complaints", { headers: { Authorization: `Bearer ${token}` } });

      if (invRes.ok) setInvoices((await invRes.json()).invoices || []);
      if (doRes.ok) setDeliveryOrders((await doRes.json()).deliveryOrders || []);
      if (pRes.ok) setProducts((await pRes.json()).products || []);
      if (retRes.ok) setCustomerReturns((await retRes.json()).returns || []);
      if (vrRes.ok) setVendorReturns((await vrRes.json()).vendorReturns || []);
      if (vRes.ok) setVendors((await vRes.json()).vendors || []);
      if (cRes.ok) setCustomers((await cRes.json()).customers || []);
      if (compRes.ok) setComplaints((await compRes.json()).complaints || []);

      const taxRes = await fetch("/api/sales/settings", { headers: { Authorization: `Bearer ${token}` } });
      if (taxRes.ok) {
        setSalesTaxRate((await taxRes.json()).salesTaxRate);
      }
      
      const poRes = await fetch("/api/procurement/po", { headers: { Authorization: `Bearer ${token}` } });
      if (poRes.ok) {
        setPurchaseOrders((await poRes.json()).purchaseOrders || []);
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

  // Open Full 360 Dossier
  const openCustomerDossier = async (customer: any) => {
    setSelectedCustomerDossier(null);
    setIsCustomerDossierOpen(true);
    setDossierLoading(true);
    setDossierTab("invoices");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/customers/${customer.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load customer profile history");
      const data = await res.json();
      setSelectedCustomerDossier(data.customer);
    } catch (err: any) {
      toast({ title: "Error", message: err.message, type: "error" });
    } finally {
      setDossierLoading(false);
    }
  };

  const openCreateCustomer = () => {
    setCustName("");
    setCustPhone("");
    setCustEmail("");
    setCustAddress("");
    setCustNtn("");
    setCustCnic("");
    setCustNotes("");
    setCustOpeningBalance("");
    setIsCreateCustomerOpen(true);
  };

  const openEditCustomer = (customer: any) => {
    setEditingCustomerId(customer.id);
    setCustName(customer.name || "");
    setCustPhone(customer.phone || "");
    setCustEmail(customer.email || "");
    setCustAddress(customer.address || "");
    setCustNtn(customer.ntn || "");
    setCustCnic(customer.cnic || "");
    setCustNotes(customer.notes || "");
    setIsEditCustomerOpen(true);
  };

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) {
      toast({ title: "Missing Fields", message: "Customer name and phone number are required.", type: "warning" });
      return;
    }

    setSubmittingCustomer(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/sales/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: custName.trim(),
          phone: custPhone.trim(),
          email: custEmail.trim() || null,
          address: custAddress.trim() || null,
          ntn: custNtn.trim() || null,
          cnic: custCnic.trim() || null,
          notes: custNotes.trim() || null,
          openingBalance: custOpeningBalance ? Number(custOpeningBalance) : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");

      toast({ title: "Customer Registered", message: `Customer "${custName}" added successfully with linked financial ledger.`, type: "success" });
      setIsCreateCustomerOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Registration Failed", message: err.message, type: "error" });
    } finally {
      setSubmittingCustomer(false);
    }
  };

  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomerId || !custName.trim() || !custPhone.trim()) {
      toast({ title: "Missing Fields", message: "Customer name and phone number are required.", type: "warning" });
      return;
    }

    setSubmittingCustomer(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/sales/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: editingCustomerId,
          name: custName.trim(),
          phone: custPhone.trim(),
          email: custEmail.trim() || null,
          address: custAddress.trim() || null,
          ntn: custNtn.trim() || null,
          cnic: custCnic.trim() || null,
          notes: custNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update customer");

      toast({ title: "Customer Updated", message: `Customer "${custName}" updated successfully.`, type: "success" });
      setIsEditCustomerOpen(false);
      fetchData();
      if (selectedCustomerDossier && selectedCustomerDossier.id === editingCustomerId) {
        openCustomerDossier({ id: editingCustomerId });
      }
    } catch (err: any) {
      toast({ title: "Update Failed", message: err.message, type: "error" });
    } finally {
      setSubmittingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (customer: any) => {
    if (!confirm(`Are you sure you want to delete customer "${customer.name}"? Past invoices and DOs will be preserved.`)) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/customers?id=${customer.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete customer");

      toast({ title: "Customer Deleted", message: data.message, type: "success" });
      if (isCustomerDossierOpen && selectedCustomerDossier?.id === customer.id) {
        setIsCustomerDossierOpen(false);
      }
      fetchData();
    } catch (err: any) {
      toast({ title: "Delete Failed", message: err.message, type: "error" });
    }
  };

  // Fetch GRN lines for a vendor return
  const handleVendorSelect = async (vId: string) => {
    setSelectedVendorId(vId);
    if (!vId) {
      setGrnLineItems([]);
      return;
    }
    const token = localStorage.getItem("token");
    // Fetch POs for that vendor to pull their GRN line items
    const poRes = await fetch(`/api/procurement/po?vendorId=${vId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (poRes.ok) {
      const poData = await poRes.json();
      const lines: any[] = [];
      poData.purchaseOrders.forEach((po: any) => {
        po.grns.forEach((grn: any) => {
          grn.lineItems.forEach((gl: any) => {
            lines.push({
              ...gl,
              grnNumber: grn.grnNumber,
              grnDate: grn.receivedAt,
            });
          });
        });
      });
      setGrnLineItems(lines);
    }
  };

  const handleUpdateTaxRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/sales/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salesTaxRate: Number(salesTaxRate) }),
      });
      if (!res.ok) throw new Error("Failed to update sales tax rate");
      toast({ title: "Tax Rate Updated", message: "Sales tax percentage updated successfully.", type: "success" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Update Failed", message: err.message, type: "error" });
    }
  };

  const handleUpdateSalesPrice = async (prodId: string, price: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/inventory/products/${prodId}/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salesPrice: price }),
      });
      if (!res.ok) throw new Error("Failed to update product sales price");
      toast({ title: "Price Updated", message: "Product sales price updated in catalog.", type: "success" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Price Update Failed", message: err.message, type: "error" });
    }
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedLines = invLines.map((l) => {
      const lineUnit = (l.unit || "Nos").trim();
      const extraFieldsObj = typeof l.extraFields === "object" && l.extraFields !== null ? { ...l.extraFields } : {};
      extraFieldsObj.unit = lineUnit;

      if (l.isCustom) {
        return {
          productId: null,
          description: l.customName + (l.description ? " - " + l.description : ""),
          quantity: l.quantity,
          salesPrice: l.salesPrice,
          unit: lineUnit,
          extraFields: extraFieldsObj,
        };
      }
      return {
        productId: l.productId || null,
        description: l.description,
        quantity: l.quantity,
        salesPrice: l.salesPrice,
        unit: lineUnit,
        extraFields: extraFieldsObj,
      };
    });

    if (!clientName || formattedLines.some((l) => !l.description || !l.quantity || !l.salesPrice)) {
      toast({ title: "Missing Information", message: "Please enter client details and fill out all item lines.", type: "warning" });
      return;
    }

    const subtotal = formattedLines.reduce((acc, l) => acc + Number(l.quantity) * Number(l.salesPrice), 0);
    let discountAmount = 0;
    const discVal = Number(discountValue) || 0;
    if (discountType === "PERCENTAGE") {
      discountAmount = Math.round(subtotal * (discVal / 100));
    } else {
      discountAmount = Math.round(discVal);
    }
    discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
    const taxable = Math.max(0, subtotal - discountAmount);
    const taxAmount = isGst ? Math.round(taxable * (salesTaxRate / 100)) : 0;
    const grandTotal = Math.round(taxable + taxAmount);

    const token = localStorage.getItem("token");
    const paymentsList: any[] = [];
    if (applyAdvance && Number(advanceToApply) > 0) {
      paymentsList.push({ amountPaid: Number(advanceToApply), method: "CUSTOMER_ADVANCE" });
    }
    if (immediatePayment) {
      const remaining = Math.max(0, grandTotal - (applyAdvance ? Number(advanceToApply) : 0));
      if (remaining > 0) {
        paymentsList.push({ amountPaid: remaining, method: payMethod });
      }
    }

    const payload = {
      customerId: selectedCustomerId || null,
      complaintId: selectedComplaintId || undefined,
      clientName,
      clientPhone,
      clientAddress,
      lineItems: formattedLines,
      payments: paymentsList,
      notes,
      subjectHeading,
      subjectDescription,
      isGst,
      postingOption,
      discountType,
      discountPercent: discountType === "PERCENTAGE" ? Number(discountValue) : 0,
      discountAmount: discountType === "FIXED" ? Number(discountValue) : discountAmount,
      taxRate: salesTaxRate,
    };

    try {
      const res = await fetch("/api/sales/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create Invoice");
      toast({ title: "Invoice Created", message: "Invoice created and ledger balances written successfully.", type: "success" });
      setIsInvoiceOpen(false);
      setSelectedCustomerId(null);
      setSelectedComplaintId("");
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setNotes("");
      setDiscountType("FIXED");
      setDiscountValue("0");
      setSubjectHeading("");
      setSubjectDescription("");
      setIsGst(true);
      setPostingOption("CUSTOMER_LEDGER");
      setInvLines([{ productId: "", description: "", quantity: "1", salesPrice: "", unit: "Nos", isCustom: false, extraFields: {} }]);
      fetchData();
    } catch (err: any) {
      toast({ title: "Invoice Creation Failed", message: err.message, type: "error" });
    }
  };

  const [doError, setDoError] = useState("");

  const handleDoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDoError("");

    const formattedLines = doLines
      .filter((l) => l.productId || (l.description && l.description.trim()))
      .map((l) => ({
        productId: l.productId || null,
        description: l.description ? l.description.trim() : null,
        quantity: isNaN(parseInt(l.quantity)) ? 1 : Math.max(1, parseInt(l.quantity)),
        salesPrice: isNaN(Number(l.salesPrice)) || !l.salesPrice ? "0" : l.salesPrice,
      }));

    if (!doClientName.trim() || !doClientPhone.trim() || !doAddress.trim() || formattedLines.length === 0) {
      const msg = "Please enter client name, phone, delivery address, and at least one valid product line.";
      setDoError(msg);
      toast({ title: "Incomplete Details", message: msg, type: "warning" });
      return;
    }

    // Client-side stock validation check
    for (const line of formattedLines) {
      if (line.productId) {
        const prod = products.find((p) => p.id === line.productId);
        if (prod && Number(prod.onHandQty ?? 0) < Number(line.quantity)) {
          const msg = `Insufficient stock for "${prod.sku} - ${prod.name}". Available in stock: ${prod.onHandQty ?? 0} ${prod.unit || "Nos"}, Requested: ${line.quantity}.`;
          setDoError(msg);
          toast({ title: "Insufficient Stock", message: msg, type: "error" });
          return;
        }
      }
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/sales/do", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerId: selectedCustomerId || null,
          clientName: doClientName.trim(),
          clientPhone: doClientPhone.trim(),
          deliveryAddress: doAddress.trim(),
          notes: doNotes,
          through: doThrough,
          vehicle: doVehicle,
          lineItems: formattedLines,
          poNumber: doPoNumber.trim() || undefined,
          invoiceId: selectedDoInvoiceId || undefined,
          status: "DISPATCHED", // Dispatch directly to deduct stock
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errMsg = data.error || "Failed to create Delivery Order";
        setDoError(errMsg);
        throw new Error(errMsg);
      }
      toast({ title: "Delivery Order Created", message: "Delivery Order created and stock dispatched.", type: "success" });
      setIsDoOpen(false);
      setSelectedCustomerId(null);
      setDoError("");
      setDoClientName("");
      setDoClientPhone("");
      setDoAddress("");
      setDoNotes("");
      setDoThrough("");
      setDoVehicle("");
      setDoPoNumber("");
      setSelectedDoInvoiceId("");
      setDoLines([{ productId: "", description: "", quantity: "1", salesPrice: "" }]);
      fetchData();
    } catch (err: any) {
      setDoError(err.message);
      toast({ title: "DO Creation Failed", message: err.message, type: "error" });
    }
  };

  const handleOpenEditDo = (doRec: any) => {
    setEditingDo(doRec);
    setEditDoClientName(doRec.clientName || "");
    setEditDoClientPhone(doRec.clientPhone || "");
    setEditDoAddress(doRec.deliveryAddress || "");
    setEditDoNotes(doRec.notes || "");
    setEditDoThrough(doRec.through || "");
    setEditDoVehicle(doRec.vehicle || "");
    setEditDoPoNumber(doRec.poNumber || "");
    setEditDoStatus(doRec.status || "DISPATCHED");
    if (doRec.lineItems && doRec.lineItems.length > 0) {
      setEditDoLines(
        doRec.lineItems.map((l: any) => ({
          productId: l.productId || "",
          description: l.description || "",
          quantity: String(l.quantity || 1),
          salesPrice: String(l.salesPrice || 0),
        }))
      );
    } else {
      setEditDoLines([{ productId: "", description: "", quantity: "1", salesPrice: "0" }]);
    }
    setEditDoError("");
    setIsEditDoOpen(true);
  };

  const handleEditDoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDo) return;
    setEditDoError("");

    const formattedLines = editDoLines
      .filter((l) => l.productId || (l.description && l.description.trim()))
      .map((l) => ({
        productId: l.productId || null,
        description: l.description || "",
        quantity: parseInt(l.quantity) || 1,
        salesPrice: Number(l.salesPrice) || 0,
      }));

    if (formattedLines.length === 0) {
      const errMsg = "Please add at least one line item with a catalog product or description.";
      setEditDoError(errMsg);
      toast({ title: "Line Items Required", message: errMsg, type: "warning" });
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/sales/do/${editingDo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientName: editDoClientName.trim(),
          clientPhone: editDoClientPhone.trim(),
          deliveryAddress: editDoAddress.trim(),
          notes: editDoNotes,
          through: editDoThrough,
          vehicle: editDoVehicle,
          poNumber: editDoPoNumber.trim() || undefined,
          status: editDoStatus,
          lineItems: formattedLines,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errMsg = data.error || "Failed to update Delivery Order";
        setEditDoError(errMsg);
        throw new Error(errMsg);
      }

      toast({ title: "Delivery Order Updated", message: "Delivery Order updated and stock reconciled.", type: "success" });
      setIsEditDoOpen(false);
      setEditingDo(null);
      setEditDoError("");
      fetchData();
    } catch (err: any) {
      setEditDoError(err.message);
      toast({ title: "Update Failed", message: err.message, type: "error" });
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      toast({ title: "Invalid Amount", message: "Please enter a valid payment amount.", type: "warning" });
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/sales/invoice/${selectedInvoice.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amountPaid: Number(paymentAmount),
          method: paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log payment");

      toast({ title: "Payment Recorded", message: "Payment transaction logged. Client balance updated.", type: "success" });
      setIsPaymentOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Payment Failed", message: err.message, type: "error" });
    }
  };

  const handleInvoiceSelectForReturn = (invId: string) => {
    setReturnInvoiceId(invId);
    const invoice = invoices.find((i) => i.id === invId);
    if (!invoice) {
      setReturnLines([]);
      return;
    }
    setReturnLines(
      invoice.lineItems.map((item: any) => {
        // Calculate remaining units
        let returned = 0;
        invoice.returns.forEach((ret: any) => {
          ret.lineItems.forEach((rl: any) => {
            if (rl.invoiceLineItemId === item.id) returned += rl.quantity;
          });
        });
        return {
          invoiceLineItemId: item.id,
          productId: item.productId,
          sku: item.product?.sku || "Service",
          name: item.product?.name || item.description,
          purchasedQty: item.quantity,
          previouslyReturned: returned,
          quantityToReturn: 0,
          refundPrice: item.salesPrice,
        };
      })
    );
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const activeLines = returnLines.filter((l) => l.quantityToReturn > 0);

    if (activeLines.length === 0) {
      toast({ title: "Invalid Quantity", message: "Enter return quantity greater than 0 for at least one item.", type: "warning" });
      return;
    }

    try {
      const res = await fetch("/api/sales/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          invoiceId: returnInvoiceId,
          reason: returnReason,
          lineItems: activeLines.map((l) => ({
            invoiceLineItemId: l.invoiceLineItemId,
            quantity: l.quantityToReturn,
            refundPrice: l.refundPrice,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit customer return");

      toast({ title: "Customer Return Logged", message: "Customer Return logged successfully. Ledger reversed.", type: "success" });
      setIsReturnOpen(false);
      setReturnInvoiceId("");
      setReturnLines([]);
      setReturnReason("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Return Failed", message: err.message, type: "error" });
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(Number(refundAmount)) || Number(refundAmount) <= 0) {
      toast({ title: "Invalid Amount", message: "Enter a valid refund amount.", type: "warning" });
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/sales/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          returnId: selectedReturn.id,
          amountRefunded: Number(refundAmount),
          method: refundMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed");

      toast({ title: "Refund Processed", message: "Cash refund payout registered successfully.", type: "success" });
      setIsRefundOpen(false);
      setSelectedReturn(null);
      setRefundAmount("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Refund Failed", message: err.message, type: "error" });
    }
  };

  const handleVendorReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const activeLines = vReturnLines.filter((l) => l.quantity > 0);

    if (activeLines.length === 0) {
      toast({ title: "Invalid Quantity", message: "Enter return quantity greater than 0.", type: "warning" });
      return;
    }

    try {
      const res = await fetch("/api/procurement/vendor-return", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          vendorId: selectedVendorId,
          reason: vReturnReason,
          lineItems: activeLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process vendor return");

      toast({ title: "Vendor Return Logged", message: `Vendor Return ${data.vendorReturn.vendorReturnNumber} logged. Defective stock returned.`, type: "success" });
      setIsVendorReturnOpen(false);
      setSelectedVendorId("");
      setGrnLineItems([]);
      setVReturnLines([]);
      setVReturnReason("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Vendor Return Failed", message: err.message, type: "error" });
    }
  };

  // Filter lists
  const filteredInvoices = invoices.filter((i) => {
    const text = i.invoiceNumber.toLowerCase() + i.clientName.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const filteredDOs = deliveryOrders.filter((d) => {
    const text = d.doNumber.toLowerCase() + d.clientName.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const filteredCustomers = customers.filter((c) => {
    const text = (c.name || "") + " " + (c.phone || "") + " " + (c.email || "") + " " + (c.address || "") + " " + (c.ntn || "") + " " + (c.cnic || "");
    return text.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Dynamic Focused Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeTab === "invoices"
                ? "Commercial Invoices"
                : activeTab === "customers"
                ? "Customer Directory & 360° History"
                : activeTab === "dos"
                ? "Delivery Orders & Dispatches"
                : activeTab === "customer_returns"
                ? "Customer Returns"
                : activeTab === "vendor_returns"
                ? "Vendor Returns"
                : "Sales & Tax Configuration"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {activeTab === "invoices"
                ? "Generate customer billing invoices, record payments, and track tax ledgers."
                : activeTab === "customers"
                ? "Manage customer accounts, view 360° track records (invoices, service tickets, DOs), and edit contact profiles."
                : activeTab === "dos"
                ? "Issue warehouse dispatch orders, carrier logistics, and delivery notes."
                : activeTab === "customer_returns"
                ? "Log products returned by customers into warehouse stock."
                : activeTab === "vendor_returns"
                ? "Return defective components or warranty RMA back to suppliers."
                : "Configure sales tax rates, billing terms, and ledger settings."}
            </p>
          </div>

          {/* Context-Specific Action Button (Only show what belongs to current view) */}
          <div className="flex items-center gap-2">
            {activeTab === "invoices" && (
              <button
                onClick={() => setIsInvoiceOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Invoice</span>
              </button>
            )}

            {activeTab === "customers" && (
              <button
                onClick={openCreateCustomer}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Customer</span>
              </button>
            )}

            {activeTab === "dos" && (
              <button
                onClick={() => setIsDoOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Delivery Order</span>
              </button>
            )}

            {activeTab === "customer_returns" && (
              <button
                onClick={() => setIsReturnOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/20 active:scale-95"
              >
                <Undo2 className="w-4 h-4" />
                <span>Log Customer Return</span>
              </button>
            )}

            {activeTab === "vendor_returns" && (
              <button
                onClick={() => setIsVendorReturnOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-900/20 active:scale-95"
              >
                <Undo2 className="w-4 h-4" />
                <span>Log Vendor Return</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Pill Tab Navigation */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar text-xs font-bold">
          {[
            { id: "invoices", label: `Invoices (${invoices.length})` },
            { id: "customers", label: `Customers (${customers.length})` },
            { id: "dos", label: `Delivery Orders (${deliveryOrders.length})` },
            { id: "customer_returns", label: `Customer Returns (${customerReturns.length})` },
            { id: "vendor_returns", label: `Vendor Returns (${vendorReturns.length})` },
            { id: "sales_setup", label: "Sales Setup" },
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
      ) : (
        /* ==================== LIST RENDERERS ==================== */
        <div className="space-y-4">
          <SearchFilter placeholder="Search lists by customer name, phone, invoice code..." search={search} onSearchChange={setSearch} />

          {/* 0. CUSTOMERS DIRECTORY LIST */}
          {activeTab === "customers" && (
            <div className="space-y-6">
              {/* Customer Stats Cards */}
              {(() => {
                const totalCustomers = customers.length;
                const totalActive = customers.filter((c) => c.totalInvoices > 0).length;
                const totalReceivables = customers.reduce((acc, c) => acc + (c.outstandingBalance || 0), 0);
                const totalOpenTickets = customers.reduce((acc, c) => acc + (c.openComplaints || 0), 0);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Registered Customers</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{totalCustomers}</span>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-3">{totalActive} clients with commercial invoices</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Active Billed Clients</span>
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{totalActive}</span>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-3">{totalCustomers > 0 ? Math.round((totalActive / totalCustomers) * 100) : 0}% client conversion</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Outstanding Receivables</span>
                          <span className="text-2xl font-black font-mono text-amber-500 mt-1 block">PKR {totalReceivables.toLocaleString()}</span>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                          <DollarSign className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-3">Total unpaid customer balance</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Open Service Tickets</span>
                          <span className="text-2xl font-black text-rose-500 mt-1 block">{totalOpenTickets}</span>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                          <Wrench className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-3">Complaints requiring field resolution</p>
                    </div>
                  </div>
                );
              })()}

              {/* Customer Directory Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                        <th className="p-3">Customer / Company Name</th>
                        <th className="p-3">Phone Number</th>
                        <th className="p-3">Premises Address</th>
                        <th className="p-3 text-center">Invoices</th>
                        <th className="p-3 text-right">Total Billed</th>
                        <th className="p-3 text-right">Ledger / Net Position</th>
                        <th className="p-3 text-center">Tickets</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredCustomers.map((cust) => {
                        const netBal = cust.ledgerBalance !== undefined ? cust.ledgerBalance : cust.outstandingBalance;
                        return (
                          <tr key={cust.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{cust.name}</span>
                                {cust.ntn && (
                                  <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-normal" title={`NTN: ${cust.ntn}`}>
                                    NTN: {cust.ntn}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate max-w-xs">{cust.email || cust.notes || "-"}</p>
                            </td>
                            <td className="p-3 font-mono font-medium whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {cust.phone}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={cust.address || ""}>
                              {cust.address ? (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{cust.address}</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded font-bold font-mono text-[11px]">
                                {cust.totalInvoices ?? 0}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-semibold">
                              PKR {Number(cust.totalSpent || 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono font-bold">
                              <div>
                                <span className={netBal > 0 ? "text-amber-500" : netBal < 0 ? "text-blue-500" : "text-emerald-500"}>
                                  PKR {Math.abs(netBal).toLocaleString()}
                                </span>
                                <span className={`block text-[9px] font-bold uppercase tracking-wider ${
                                  netBal > 0 ? "text-amber-600" : netBal < 0 ? "text-blue-600" : "text-emerald-600"
                                }`}>
                                  {netBal > 0 ? "Receivable" : netBal < 0 ? "Advance Held" : "Settled"}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {cust.openComplaints > 0 ? (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 rounded font-bold font-mono text-[10px]">
                                  {cust.openComplaints} Open
                                </span>
                              ) : cust.totalComplaints > 0 ? (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded font-bold font-mono text-[10px]">
                                  {cust.totalComplaints} Logged
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 text-xs">0</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openCustomerDossier(cust)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm"
                                  title="View 360° History, Invoices, Complaints & Ledger"
                                >
                                  <History className="w-3 h-3" />
                                  <span>360° History</span>
                                </button>
                                <a
                                  href={`/financials?tab=ledger&partyType=CUSTOMER&partyName=${encodeURIComponent(cust.name)}`}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 rounded-lg text-[10px] font-bold text-emerald-600 dark:text-emerald-400 transition-all flex items-center gap-1"
                                  title="Open Full Party Ledger in Financials"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span>Ledger</span>
                                </a>
                                <button
                                  onClick={() => openEditCustomer(cust)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1"
                                  title="Edit Customer Profile"
                                >
                                  <Edit2 className="w-3 h-3 text-slate-500" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomer(cust)}
                                  className="p-1 text-slate-400 hover:text-rose-500 rounded transition-all"
                                  title="Delete Customer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCustomers.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            No customers found matching the search criteria. Click &quot;Add New Customer&quot; above to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === "invoices" && (
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
                            checked={filteredInvoices.length > 0 && selectedInvoiceIds.length === filteredInvoices.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedInvoiceIds(filteredInvoices.map((i) => i.id));
                              } else {
                                setSelectedInvoiceIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="p-3">Invoice Number</th>
                        <th className="p-3">Client</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Billing Total (PKR)</th>
                        <th className="p-3 text-right">Amount Paid</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredInvoices.map((inv) => {
                        const isSelected = selectedInvoiceIds.includes(inv.id);
                        const isFullyPaid = Math.round(Number(inv.amountPaid)) >= Math.round(Number(inv.totalAmount));
                        const displayStatus = isFullyPaid ? "PAID" : inv.status;
                        return (
                          <tr
                            key={inv.id}
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
                                    setSelectedInvoiceIds((prev) => [...prev, inv.id]);
                                  } else {
                                    setSelectedInvoiceIds((prev) => prev.filter((id) => id !== inv.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="p-3 font-bold whitespace-nowrap">{inv.invoiceNumber}</td>
                            <td className="p-3 font-semibold">{inv.clientName}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                displayStatus === "PAID"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : displayStatus === "PARTIALLY_PAID"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                              }`}>
                                {displayStatus}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold">{Math.round(Number(inv.totalAmount)).toLocaleString("en-US")}</td>
                            <td className="p-3 text-right text-emerald-500 font-semibold">{Math.round(Number(inv.amountPaid)).toLocaleString("en-US")}</td>
                            <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(inv.date).toLocaleDateString()}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <a
                                  href={`/sales/invoice/${inv.id}/pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 rounded text-blue-500 transition-all"
                                  title="Print PDF"
                                >
                                  <FileText className="w-4 h-4" />
                                </a>
                                {!isFullyPaid && displayStatus !== "PAID" && (
                                  <button
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      const outstanding = Math.round(Number(inv.totalAmount) - Number(inv.amountPaid));
                                      setPaymentAmount(String(outstanding));
                                      setIsPaymentOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-0.5"
                                  >
                                    <DollarSign className="w-3.5 h-3.5" /> Pay
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredInvoices.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">No matching invoices found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sticky Bulk Action Bar for Invoices */}
              <BulkActionBar
                selectedCount={selectedInvoiceIds.length}
                onClear={() => setSelectedInvoiceIds([])}
                onStatusChange={handleBulkInvoiceStatus}
                onBulkExport={handleBulkExportInvoices}
                statusOptions={[
                  { label: "Set Paid", value: "PAID" },
                  { label: "Set Partially Paid", value: "PARTIALLY_PAID" },
                  { label: "Set Unpaid", value: "UNPAID" },
                  { label: "Set Cancelled", value: "CANCELLED" },
                ]}
              />
            </div>
          )}

          {/* 2. DELIVERY ORDERS LIST */}
          {activeTab === "dos" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                      <th className="p-3">DO Number</th>
                      <th className="p-3">Ref PO</th>
                      <th className="p-3">Client</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Address</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredDOs.map((doRec) => (
                      <tr key={doRec.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                        <td className="p-3 font-bold whitespace-nowrap">{doRec.doNumber}</td>
                        <td className="p-3 font-semibold text-slate-500 whitespace-nowrap">{doRec.poNumber || "-"}</td>
                        <td className="p-3 font-semibold">{doRec.clientName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doRec.status === "DELIVERED"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40"
                          }`}>
                            {doRec.status}
                          </span>
                        </td>
                        <td className="p-3 truncate max-w-xs">{doRec.deliveryAddress}</td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(doRec.date).toLocaleDateString()}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDo(doRec)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 rounded text-amber-600 dark:text-amber-400 transition-all"
                              title="Edit Delivery Order"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <a
                              href={`/sales/do/${doRec.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 rounded text-blue-500 transition-all"
                              title="Print Challan & QR Sticker"
                            >
                              <FileText className="w-4 h-4" />
                            </a>
                            <a
                              href={`/delivery/confirm/${doRec.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 rounded text-emerald-600 transition-all"
                              title="Open Public Delivery Confirmation / QR Target"
                            >
                              <QrCode className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. CUSTOMER RETURNS LIST */}
          {activeTab === "customer_returns" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                      <th className="p-3">Return ID</th>
                      <th className="p-3">Invoice Number</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3 text-right">Reversed Amount (PKR)</th>
                      <th className="p-3 text-right">Refunded Payout</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-center">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {customerReturns.map((ret) => {
                      const refunded = ret.refunds.reduce((acc: number, r: any) => acc + Number(r.amountRefunded), 0);
                      const isFullyRefunded = refunded >= Number(ret.totalAmount);
                      return (
                        <tr key={ret.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                          <td className="p-3 font-bold whitespace-nowrap">{ret.returnNumber}</td>
                          <td className="p-3 font-semibold">{ret.invoice.invoiceNumber}</td>
                          <td className="p-3 truncate max-w-[150px]">{ret.reason}</td>
                          <td className="p-3 text-right font-bold text-rose-500">({Math.round(Number(ret.totalAmount)).toLocaleString("en-US")})</td>
                          <td className="p-3 text-right text-emerald-500 font-bold">{Math.round(refunded).toLocaleString("en-US")}</td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(ret.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 text-center">
                            {!isFullyRefunded && (
                              <button
                                onClick={() => {
                                  setSelectedReturn(ret);
                                  setRefundAmount(String(Math.round(Number(ret.totalAmount) - refunded)));
                                  setIsRefundOpen(true);
                                }}
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1 mx-auto"
                              >
                                <DollarSign className="w-3 h-3" /> Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. VENDOR RETURNS LIST */}
          {activeTab === "vendor_returns" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                      <th className="p-3">Vendor Return ID</th>
                      <th className="p-3">Vendor</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3 text-right">Debit AP Total (PKR)</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {vendorReturns.map((vr) => (
                      <tr key={vr.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                        <td className="p-3 font-bold whitespace-nowrap">{vr.vendorReturnNumber}</td>
                        <td className="p-3 font-semibold">{vr.vendor.name}</td>
                        <td className="p-3 truncate max-w-xs">{vr.reason}</td>
                        <td className="p-3 text-right font-bold text-rose-500">({Math.round(Number(vr.totalAmount)).toLocaleString("en-US")})</td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(vr.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. SALES SETUP (PRICING & TAX) */}
          {activeTab === "sales_setup" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm p-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-4">Set Catalog Sales Pricing</span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                        <th className="p-3">Product SKU</th>
                        <th className="p-3">Name</th>
                        <th className="p-3 text-right">Avg Purchase Cost (PKR)</th>
                        <th className="p-3 text-right">Current Sales Price (PKR)</th>
                        <th className="p-3 text-center">New Sales Price</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {products
                        .filter((p) => {
                          const txt = p.sku.toLowerCase() + p.name.toLowerCase();
                          return txt.includes(search.toLowerCase());
                        })
                        .map((prod) => {
                          return (
                            <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                              <td className="p-3 font-bold whitespace-nowrap">{prod.sku}</td>
                              <td className="p-3 font-semibold">{prod.name}</td>
                              <td className="p-3 text-right font-mono">{Math.round(Number(prod.averageCost)).toLocaleString("en-US")}</td>
                              <td className="p-3 text-right font-bold text-blue-500 font-mono">{Math.round(Number(prod.salesPrice)).toLocaleString("en-US")}</td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  placeholder="New Price"
                                  defaultValue={prod.salesPrice || ""}
                                  id={`price-${prod.id}`}
                                  className="w-28 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-right font-bold text-emerald-500 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => {
                                    const inputVal = (document.getElementById(`price-${prod.id}`) as HTMLInputElement)?.value;
                                    if (inputVal && !isNaN(Number(inputVal))) {
                                      handleUpdateSalesPrice(prod.id, Number(inputVal));
                                    } else {
                                      toast({ title: "Invalid Price", message: "Please enter a valid price number.", type: "warning" });
                                    }
                                  }}
                                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold"
                                >
                                  Update Price
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm self-start">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">Configure Sales Tax Rate</h3>
                <p className="text-xs text-slate-500 mb-6">Set the default sales tax percentage applied dynamically to all standalone invoices.</p>

                <form onSubmit={handleUpdateTaxRate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sales Tax Rate (%)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-blue-500 font-mono"
                      value={salesTaxRate}
                      onChange={(e) => setSalesTaxRate(parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                       type="submit"
                       className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
                     >
                       Save Settings
                     </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== CREATE STANDALONE INVOICE MODAL ==================== */}
      {mounted && isInvoiceOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-4xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Issue Billing Invoice</h3>
              <button
                type="button"
                onClick={() => setIsInvoiceOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Create standalone billing records for walk-in trading clients or custom service scopes.</p>

            <form onSubmit={handleInvoiceSubmit} className="space-y-4">
              {/* Optional Complaint / Repair Ticket Link */}
              <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-3.5 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-blue-500" />
                    <span>Link Support Complaint / Repair Job (Optional)</span>
                  </label>
                  {selectedComplaintId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedComplaintId("");
                      }}
                      className="text-[10px] text-rose-500 hover:text-rose-600 font-bold self-start sm:self-auto"
                    >
                      ✕ Clear Link
                    </button>
                  )}
                </div>
                <select
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedComplaintId}
                  onChange={(e) => {
                    const compId = e.target.value;
                    setSelectedComplaintId(compId);
                    if (!compId) return;
                    const comp = complaints.find((c) => c.id === compId);
                    if (comp) {
                      if (comp.customerName) setClientName(comp.customerName);
                      if (comp.customerPhone) setClientPhone(comp.customerPhone);
                      if (comp.customerAddress) setClientAddress(comp.customerAddress);
                      if (comp.customerId) setSelectedCustomerId(comp.customerId);
                      setSubjectHeading(`Service & Repair Work (${comp.complaintNumber})`);
                      setSubjectDescription(comp.description || "");
                      if (Number(comp.amount || 0) > 0) {
                        setInvLines([
                          {
                            productId: "",
                            description: `Service Charges (Ticket ${comp.complaintNumber}): ${comp.description}`,
                            quantity: "1",
                            salesPrice: String(comp.amount),
                            unit: "Job",
                            isCustom: true,
                            extraFields: {},
                          },
                        ]);
                      }
                    }
                  }}
                >
                  <option value="">-- No linked complaint ticket (Standard Sale) --</option>
                  {complaints
                    .filter((c) => !c.invoice || c.id === selectedComplaintId)
                    .map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.complaintNumber} - {comp.customerName} - {comp.description.slice(0, 40)}... (PKR {Number(comp.amount || 0).toLocaleString()}) [{comp.status}]
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                  Selecting a complaint auto-fills customer details, job description, repair cost, and syncs the ledger.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
                <div className="sm:col-span-2">
                  <CustomerSelect
                    label="Customer / Client"
                    value={clientName}
                    phoneValue={clientPhone}
                    addressValue={clientAddress}
                    includeVendors={true}
                    onChange={(c) => {
                      setClientName(c.name);
                      if (c.phone) setClientPhone(c.phone);
                      if (c.address) setClientAddress(c.address);
                      setSelectedCustomerId(c.id || null);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Client Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0300-1234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Invoice Type</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold"
                    value={isGst ? "GST" : "NON_GST"}
                    onChange={(e) => setIsGst(e.target.value === "GST")}
                  >
                    <option value="GST">GST (With Sales Tax)</option>
                    <option value="NON_GST">Non-GST (No Sales Tax)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Client Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Phase 6 DHA, Karachi"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* 3-Way Ledger Posting Selector */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  📊 Financial Ledger Posting Choice
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPostingOption("CUSTOMER_LEDGER")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      postingOption === "CUSTOMER_LEDGER"
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 font-bold ring-1 ring-blue-500"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between mb-0.5">
                      <span>👤 Customer Ledger</span>
                      {postingOption === "CUSTOMER_LEDGER" && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-mono">Default</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal">
                      Posts to client's financial account and general ledger.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPostingOption("GENERAL_LEDGER")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      postingOption === "GENERAL_LEDGER"
                        ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-bold ring-1 ring-amber-500"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-bold mb-0.5">🏢 General Ledger Only</div>
                    <p className="text-[10px] text-slate-500 font-normal">
                      Updates company totals without affecting customer's balance.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPostingOption("NO_LEDGER")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      postingOption === "NO_LEDGER"
                        ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 font-bold ring-1 ring-rose-500"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-bold mb-0.5">📄 No Ledger Posting</div>
                    <p className="text-[10px] text-slate-500 font-normal">
                      Paperwork / Formality only. Zero accounting entries.
                    </p>
                  </button>
                </div>
              </div>

              {/* Subject Heading & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subject Heading</label>
                  <input
                    type="text"
                    placeholder="e.g. AC Installation Services"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={subjectHeading}
                    onChange={(e) => setSubjectHeading(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subject Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Complete execution of ducting, copper piping and mounting of outdoor/indoor units."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={subjectDescription}
                    onChange={(e) => setSubjectDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Invoice Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Invoice Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Enter invoice terms, warranty details, payment schedule etc..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Dynamic Invoice rows */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Lines</span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setInvLines([...invLines, { productId: "", description: "", quantity: "1", salesPrice: "", unit: "Nos", isCustom: false, extraFields: {} }])}
                      className="text-xs text-blue-500 hover:underline font-bold"
                    >
                      + Add Catalog Row
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvLines([...invLines, { productId: "", description: "", quantity: "1", salesPrice: "", unit: "Nos", isCustom: true, extraFields: {} }])}
                      className="text-xs text-emerald-500 hover:underline font-bold"
                    >
                      + Add Custom Row
                    </button>
                  </div>
                </div>

                <datalist id="inv-unit-options">
                  {availableUnits.map((u: string) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </datalist>

                <div className="space-y-3 border-y border-slate-100 dark:border-slate-800 py-3">
                  {/* Grid Headers */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:grid mb-1">
                    <div className="sm:col-span-3">Catalog / Custom Item</div>
                    <div className="sm:col-span-3">Description / Service</div>
                    <div className="sm:col-span-2">Unit</div>
                    <div className="sm:col-span-1">Qty</div>
                    <div className="sm:col-span-2">Price (PKR)</div>
                    <div className="sm:col-span-1 text-center">Action</div>
                  </div>

                  {invLines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl">
                      {/* Catalog Select OR Custom Item Name */}
                      <div className="sm:col-span-3">
                        {line.isCustom ? (
                          <input
                            type="text"
                            required
                            placeholder="Custom Item Name"
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                            value={line.customName || ""}
                            onChange={(e) => {
                              const updated = [...invLines];
                              updated[index].customName = e.target.value;
                              updated[index].description = e.target.value;
                              setInvLines(updated);
                            }}
                          />
                        ) : (
                          <ProductSelect
                            products={products}
                            value={line.productId}
                            placeholder="Search product name or SKU..."
                            onChange={(p) => {
                              const updated = [...invLines];
                              updated[index].productId = p ? p.id : "";
                              if (p) {
                                updated[index].description = p.name;
                                updated[index].unit = p.unit || "Nos";
                                const defPrice = Number(p.salesPrice) > 0 ? Number(p.salesPrice) : Number(p.averageCost || 0);
                                updated[index].salesPrice = defPrice > 0 ? String(defPrice) : "";
                              } else {
                                updated[index].description = "";
                                updated[index].unit = "Nos";
                                updated[index].salesPrice = "";
                              }
                              setInvLines(updated);
                            }}
                          />
                        )}
                      </div>

                      {/* Manual Description */}
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Description (Service name)"
                          required={!line.isCustom}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                          value={line.isCustom ? (line.description === line.customName ? "" : line.description) : line.description}
                          onChange={(e) => {
                            const updated = [...invLines];
                            updated[index].description = e.target.value;
                            setInvLines(updated);
                          }}
                        />
                      </div>

                      {/* Unit */}
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          list="inv-unit-options"
                          placeholder="Unit (e.g. Nos, Mtr)"
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={line.unit ?? ""}
                          onChange={(e) => {
                            const updated = [...invLines];
                            updated[index].unit = e.target.value;
                            setInvLines(updated);
                          }}
                        />
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-1">
                        <input
                          type="number"
                          placeholder="Qty"
                          required
                          min="1"
                          step="any"
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={line.quantity}
                          onChange={(e) => {
                            const updated = [...invLines];
                            updated[index].quantity = e.target.value;
                            setInvLines(updated);
                          }}
                        />
                      </div>

                      {/* Price */}
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          placeholder="Price (PKR)"
                          required
                          min="0"
                          step="any"
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={line.salesPrice}
                          onChange={(e) => {
                            const updated = [...invLines];
                            updated[index].salesPrice = e.target.value;
                            setInvLines(updated);
                          }}
                        />
                      </div>

                      {/* Action */}
                      <div className="sm:col-span-1 flex items-center justify-between sm:justify-center">
                        <span className="text-[10px] text-slate-400 sm:hidden">{line.isCustom ? "Custom Row" : "Catalog"}</span>
                        {invLines.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => setInvLines(invLines.filter((_, i) => i !== index))}
                            className="text-xs text-rose-500 font-bold hover:underline"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 hidden sm:inline">{line.isCustom ? "Custom" : "Catalog"}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GST & Discount Settings and Live Calculation Breakdown */}
              {(() => {
                const subtotal = invLines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.salesPrice) || 0), 0);
                let discountAmount = 0;
                const discVal = Number(discountValue) || 0;
                if (discountType === "PERCENTAGE") {
                  discountAmount = Math.round(subtotal * (discVal / 100));
                } else {
                  discountAmount = Math.round(discVal);
                }
                discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
                const taxable = Math.max(0, subtotal - discountAmount);
                const tax = isGst ? Math.round(taxable * (salesTaxRate / 100)) : 0;
                const grandTotal = Math.max(0, taxable + tax);

                return (
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl space-y-4 text-xs border border-slate-100 dark:border-slate-800/80">
                    {/* Configuration Row: Discount & GST Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                      {/* Discount Mode */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Discount (Flat PKR or %)
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as any)}
                          >
                            <option value="FIXED">Flat (PKR)</option>
                            <option value="PERCENTAGE">Percentage (%)</option>
                          </select>
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="0"
                              max={discountType === "PERCENTAGE" ? "100" : undefined}
                              placeholder={discountType === "PERCENTAGE" ? "e.g. 10%" : "e.g. 5000"}
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-right font-semibold font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={discountValue}
                              onChange={(e) => setDiscountValue(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* GST / Sales Tax Mode */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Sales Tax (GST) Option
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold flex-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={isGst ? "GST" : "NON_GST"}
                            onChange={(e) => setIsGst(e.target.value === "GST")}
                          >
                            <option value="GST">GST Registered ({salesTaxRate}% Tax)</option>
                            <option value="NON_GST">Non-GST (No Sales Tax)</option>
                          </select>
                          {isGst && (
                            <div className="flex items-center gap-1 w-28">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Tax %"
                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-right font-semibold font-mono text-xs focus:ring-2 focus:ring-blue-500"
                                value={salesTaxRate}
                                onChange={(e) => setSalesTaxRate(Number(e.target.value) || 0)}
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
                        <span>Gross Line Total (Subtotal):</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">PKR {subtotal.toLocaleString()}</span>
                      </div>

                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-rose-500 font-semibold">
                          <span>
                            Discount ({discountType === "PERCENTAGE" ? `${discountValue}%` : "Flat"}):
                          </span>
                          <span className="font-mono font-bold">- PKR {discountAmount.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 font-semibold">
                        <span>Net Taxable Subtotal:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">PKR {taxable.toLocaleString()}</span>
                      </div>

                      {isGst && (
                        <div className="flex justify-between items-center text-slate-500 font-semibold">
                          <span>Sales Tax ({salesTaxRate}% GST):</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100">PKR {tax.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-sm font-black text-blue-600 dark:text-blue-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span>Final Invoice Total:</span>
                        <span className="font-mono">PKR {grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Apply Customer Advance Deposit */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-emerald-400 focus:ring-emerald-500 text-emerald-600"
                    checked={applyAdvance}
                    onChange={(e) => setApplyAdvance(e.target.checked)}
                  />
                  <span>💰 Apply Customer Advance Deposit to this Invoice</span>
                </label>
                {applyAdvance && (
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-400 mb-1">Advance Amount to Apply (PKR)</label>
                    <input
                      type="number"
                      placeholder="e.g. 40000"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300"
                      value={advanceToApply}
                      onChange={(e) => setAdvanceToApply(e.target.value)}
                    />
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                      This will automatically offset the advance from the customer's ledger account and show remaining balance due on the invoice.
                    </p>
                  </div>
                )}
              </div>

              {/* Immediate Payment collection toggle */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 focus:ring-blue-500"
                    checked={immediatePayment}
                    onChange={(e) => setImmediatePayment(e.target.checked)}
                  />
                  Collect Immediate Full Payment
                </label>

                {immediatePayment && (
                  <select
                    className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    <option value="CASH">CASH</option>
                    <option value="CARD">CARD</option>
                    <option value="BANK">BANK</option>
                  </select>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInvoiceOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
                >
                  Submit Invoice
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== CREATE DELIVERY ORDER MODAL ==================== */}
      {mounted && isDoOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-4xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Delivery Order Challan</h3>
              <button
                type="button"
                onClick={() => {
                  setIsDoOpen(false);
                  setDoError("");
                }}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Create delivery orders. Catalog items deduct stock immediately on dispatch.</p>

            {/* Prominent Inline Error Alert Banner */}
            {doError && (
              <div className="bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200 p-4 rounded-xl flex items-start gap-3 text-xs mb-5 shadow-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm text-rose-900 dark:text-rose-100">Insufficient Stock / Dispatch Warning</p>
                  <p className="mt-1 font-semibold leading-relaxed">{doError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDoError("")}
                  className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 text-base font-black px-1"
                  title="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleDoSubmit} className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                <div className="sm:col-span-2">
                  <CustomerSelect
                    label="Recipient Customer / Client"
                    value={doClientName}
                    phoneValue={doClientPhone}
                    addressValue={doAddress}
                    includeVendors={true}
                    onChange={(c) => {
                      setDoClientName(c.name);
                      if (c.phone) setDoClientPhone(c.phone);
                      if (c.address) setDoAddress(c.address);
                      setSelectedCustomerId(c.id || null);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Client Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +923331112222"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono"
                    value={doClientPhone}
                    onChange={(e) => setDoClientPhone(e.target.value)}
                  />
                </div>
              </div>
              {/* Delivery Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start mt-4">
                <div>
                  <label className="flex items-end text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 min-h-[32px]">Delivery Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Warehouse 14, Karachi"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={doAddress}
                    onChange={(e) => setDoAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-end text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 min-h-[32px]">Through (Transport)</label>
                  <input
                    type="text"
                    placeholder="e.g. BUS, Cargo, Courier"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={doThrough}
                    onChange={(e) => setDoThrough(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-end text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 min-h-[32px]">Vehicle / Carrier</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota Hilux, Bus"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={doVehicle}
                    onChange={(e) => setDoVehicle(e.target.value)}
                  />
                </div>
              </div>
              {/* Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start mt-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="flex items-end text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 min-h-[32px]">Link Invoice (Optional)</label>
                  <select
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm shadow-sm"
                    value={selectedDoInvoiceId}
                    onChange={(e) => {
                      const invId = e.target.value;
                      setSelectedDoInvoiceId(invId);
                      if (invId) {
                        const inv = invoices.find((i) => i.id === invId);
                        if (inv) {
                          setDoClientName(inv.clientName);
                          setDoClientPhone(inv.clientPhone || "");
                          setDoAddress(inv.clientAddress || "");
                          if (inv.customerId) setSelectedCustomerId(inv.customerId);
                          
                          if (inv.lineItems && inv.lineItems.length > 0) {
                            setDoLines(inv.lineItems.map((l: any) => ({
                              productId: l.productId || "",
                              description: l.description || "",
                              quantity: String(l.quantity),
                              salesPrice: String(l.salesPrice),
                            })));
                          }
                        }
                      }
                    }}
                  >
                    <option value="">-- No linked invoice --</option>
                    {invoices.filter((i) => !i.doId).map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.clientName} (PKR {Number(inv.totalAmount).toLocaleString()})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">Select an invoice to auto-fill DO details.</p>
                </div>
                <div>
                  <label className="flex items-end text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 min-h-[32px]">Link PO (Optional)</label>
                  <input
                    type="text"
                    list="po-options"
                    placeholder="Type or select PO number..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono shadow-sm"
                    value={doPoNumber}
                    onChange={(e) => setDoPoNumber(e.target.value)}
                  />
                  <datalist id="po-options">
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.poNumber}>
                        {po.poNumber} ({po.vendor?.name || "No Vendor"})
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* DO Lines */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">DO Line Items</span>
                  <button
                    type="button"
                    onClick={() => setDoLines([...doLines, { productId: "", description: "", quantity: "1", salesPrice: "0" }])}
                    className="text-xs text-emerald-500 hover:underline font-bold"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-3 border-y border-slate-100 dark:border-slate-800 py-3">
                  {doLines.map((line, index) => {
                    const selectedProd = products.find((pr) => pr.id === line.productId);
                    const isOverStock = selectedProd && Number(line.quantity || 0) > Number(selectedProd.onHandQty || 0);

                    return (
                      <div key={index} className={`grid grid-cols-1 sm:grid-cols-3 gap-2 items-start p-3 rounded-xl transition-all ${isOverStock ? "bg-rose-50/70 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800" : "bg-slate-50 dark:bg-slate-950"}`}>
                        <div>
                          <ProductSelect
                            products={products}
                            value={line.productId}
                            placeholder="Search stock item or SKU..."
                            showStockBadge={true}
                            onChange={(p) => {
                              const updated = [...doLines];
                              updated[index].productId = p ? p.id : "";
                              if (p) updated[index].description = p.name;
                              else updated[index].description = "";
                              setDoLines(updated);
                            }}
                          />

                          {selectedProd && (
                            <div className="mt-1 flex items-center justify-between text-[11px] px-1">
                              <span className="text-slate-500">
                                In Stock:{" "}
                                <strong className={isOverStock ? "text-rose-600 dark:text-rose-400 font-extrabold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                                  {selectedProd.onHandQty ?? 0} {selectedProd.unit || "Nos"}
                                </strong>
                              </span>
                              {isOverStock && (
                                <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px] bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded">
                                  ⚠️ Exceeds Available Stock
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="Manual Description"
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                          value={line.description}
                          onChange={(e) => {
                            const updated = [...doLines];
                            updated[index].description = e.target.value;
                            setDoLines(updated);
                          }}
                        />

                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            required
                            min="1"
                            className={`w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold ${
                              isOverStock
                                ? "border-rose-500 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 focus:ring-rose-500"
                                : "border-slate-200 dark:border-slate-800"
                            }`}
                            value={line.quantity}
                            onChange={(e) => {
                              const updated = [...doLines];
                              updated[index].quantity = e.target.value;
                              setDoLines(updated);
                            }}
                          />
                          {doLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDoLines(doLines.filter((_, i) => i !== index))}
                              className="text-xs text-rose-500 font-bold hover:underline shrink-0"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Dispatch Driver / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Shipment dispatched via Suzuki Carry, driver contact: Mr. Asif"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  value={doNotes}
                  onChange={(e) => setDoNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsDoOpen(false);
                    setDoError("");
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
                >
                  Submit & Dispatch DO
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== EDIT DELIVERY ORDER MODAL ==================== */}
      {mounted && isEditDoOpen && editingDo && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-4xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-amber-500" />
                  <span>Edit Delivery Order ({editingDo.doNumber})</span>
                </h3>
                <span className="text-xs font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                  {editingDo.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditDoOpen(false);
                  setEditingDo(null);
                  setEditDoError("");
                }}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Modify delivery details, line items, or status. Changes to catalog items automatically update and reconcile physical stock inventory.
            </p>

            {/* Inline Error Alert Banner */}
            {editDoError && (
              <div className="bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200 p-4 rounded-xl flex items-start gap-3 text-xs mb-5 shadow-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm text-rose-900 dark:text-rose-100">Update Error / Stock Warning</p>
                  <p className="mt-1 font-semibold leading-relaxed">{editDoError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditDoError("")}
                  className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 text-base font-black px-1"
                  title="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleEditDoSubmit} className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                <div className="sm:col-span-2">
                  <CustomerSelect
                    label="Recipient Customer / Client"
                    value={editDoClientName}
                    phoneValue={editDoClientPhone}
                    addressValue={editDoAddress}
                    includeVendors={true}
                    onChange={(c) => {
                      setEditDoClientName(c.name);
                      if (c.phone) setEditDoClientPhone(c.phone);
                      if (c.address) setEditDoAddress(c.address);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Client Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +923331112222"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono"
                    value={editDoClientPhone}
                    onChange={(e) => setEditDoClientPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Delivery Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start mt-4">
                <div>
                  <label className="flex items-end text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 min-h-[32px]">Delivery Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Warehouse 14, Karachi"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={editDoAddress}
                    onChange={(e) => setEditDoAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-end text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 min-h-[32px]">Through (Transport)</label>
                  <input
                    type="text"
                    placeholder="e.g. BUS, Cargo, Courier"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={editDoThrough}
                    onChange={(e) => setEditDoThrough(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-end text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 min-h-[32px]">Vehicle / Carrier</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota Hilux, Bus"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={editDoVehicle}
                    onChange={(e) => setEditDoVehicle(e.target.value)}
                  />
                </div>
              </div>

              {/* Link PO & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start mt-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ref PO Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="Type PO number..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono shadow-sm"
                    value={editDoPoNumber}
                    onChange={(e) => setEditDoPoNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Delivery Order Status</label>
                  <select
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold shadow-sm"
                    value={editDoStatus}
                    onChange={(e) => setEditDoStatus(e.target.value)}
                  >
                    <option value="DISPATCHED">DISPATCHED (Stock deducted)</option>
                    <option value="DELIVERED">DELIVERED (Confirmed at site)</option>
                    <option value="DRAFT">DRAFT (Pending dispatch)</option>
                  </select>
                </div>
              </div>

              {/* DO Lines */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">DO Line Items</span>
                  <button
                    type="button"
                    onClick={() => setEditDoLines([...editDoLines, { productId: "", description: "", quantity: "1", salesPrice: "0" }])}
                    className="text-xs text-emerald-500 hover:underline font-bold"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-3 border-y border-slate-100 dark:border-slate-800 py-3">
                  {editDoLines.map((line, index) => {
                    const selectedProd = products.find((pr) => pr.id === line.productId);
                    return (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start p-3 rounded-xl bg-slate-50 dark:bg-slate-950">
                        <div>
                          <ProductSelect
                            products={products}
                            value={line.productId}
                            placeholder="Search stock item or SKU..."
                            showStockBadge={true}
                            onChange={(p) => {
                              const updated = [...editDoLines];
                              updated[index].productId = p ? p.id : "";
                              if (p) updated[index].description = p.name;
                              else updated[index].description = "";
                              setEditDoLines(updated);
                            }}
                          />

                          {selectedProd && (
                            <div className="mt-1 flex items-center justify-between text-[11px] px-1">
                              <span className="text-slate-500">
                                In Stock:{" "}
                                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {selectedProd.onHandQty ?? 0} {selectedProd.unit || "Nos"}
                                </strong>
                              </span>
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="Manual Description"
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                          value={line.description}
                          onChange={(e) => {
                            const updated = [...editDoLines];
                            updated[index].description = e.target.value;
                            setEditDoLines(updated);
                          }}
                        />

                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            required
                            min="1"
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                            value={line.quantity}
                            onChange={(e) => {
                              const updated = [...editDoLines];
                              updated[index].quantity = e.target.value;
                              setEditDoLines(updated);
                            }}
                          />
                          {editDoLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setEditDoLines(editDoLines.filter((_, i) => i !== index))}
                              className="text-xs text-rose-500 font-bold hover:underline shrink-0"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Dispatch Driver / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Shipment dispatched via Suzuki Carry, driver contact: Mr. Asif"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  value={editDoNotes}
                  onChange={(e) => setEditDoNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditDoOpen(false);
                    setEditingDo(null);
                    setEditDoError("");
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes & Update DO</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== CUSTOMER RETURN MODAL ==================== */}
      {mounted && isReturnOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-3xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Process Customer Return</h3>
              <button
                type="button"
                onClick={() => setIsReturnOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Process product returns against confirmed invoices. Quantities are validated against prior returned counts.</p>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Invoice Reference</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  value={returnInvoiceId}
                  onChange={(e) => handleInvoiceSelectForReturn(e.target.value)}
                >
                  <option value="">Select Invoice...</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber} - {inv.clientName} (PKR {Math.round(Number(inv.totalAmount)).toLocaleString("en-US")})</option>
                  ))}
                </select>
              </div>

              {returnLines.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Return Quantities</span>
                  <div className="space-y-2 border-y border-slate-100 dark:border-slate-800 py-3">
                    {returnLines.map((line, index) => {
                      const outstanding = line.purchasedQty - line.previouslyReturned;
                      return (
                        <div key={line.invoiceLineItemId} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-xs">
                          <div>
                            <span className="block font-bold">{line.sku}</span>
                            <span className="block text-[10px] text-slate-500 truncate max-w-[120px]">{line.name}</span>
                          </div>
                          <div className="text-slate-400">
                            Purchased: {line.purchasedQty} | Prior Returns: {line.previouslyReturned}
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Return Quantity</label>
                            <input
                              type="number"
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded text-xs font-bold text-rose-500"
                              value={line.quantityToReturn}
                              onChange={(e) => {
                                const updated = [...returnLines];
                                updated[index].quantityToReturn = Math.min(outstanding, parseInt(e.target.value) || 0);
                                setReturnLines(updated);
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Refund Price (PKR)</label>
                            <input
                              type="number"
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded text-xs"
                              value={line.refundPrice}
                              onChange={(e) => {
                                const updated = [...returnLines];
                                updated[index].refundPrice = e.target.value;
                                setReturnLines(updated);
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Return Reason</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Defective unit, customer requested swap"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReturnOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/10"
                >
                  Process Return
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== VENDOR RETURN MODAL ==================== */}
      {mounted && isVendorReturnOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-3xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Process Vendor Return</h3>
              <button
                type="button"
                onClick={() => setIsVendorReturnOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Return defective stock to suppliers. Quantities are validated against GRN receipts.</p>

            <form onSubmit={handleVendorReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Supplier Vendor</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  value={selectedVendorId}
                  onChange={(e) => handleVendorSelect(e.target.value)}
                >
                  <option value="">Select Vendor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {grnLineItems.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">GRN Receipts List</span>
                  <div className="space-y-2 border-y border-slate-100 dark:border-slate-800 py-3 overflow-y-auto max-h-48">
                    {grnLineItems.map((line) => {
                      const existing = vReturnLines.find((l) => l.grnLineItemId === line.id);
                      return (
                        <div key={line.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-xs">
                          <div>
                            <span className="block font-bold">{line.product.sku}</span>
                            <span className="block text-[9px] text-slate-500">{line.grnNumber} ({new Date(line.grnDate).toLocaleDateString()})</span>
                          </div>
                          <div className="text-slate-400">
                            Received: {line.quantityReceived} | Cost: {Math.round(Number(line.unitCost)).toLocaleString("en-US")}
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1">Return Qty</label>
                            <input
                              type="number"
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded text-xs font-bold text-rose-500"
                              value={existing?.quantity || "0"}
                              onChange={(e) => {
                                const qty = Math.min(line.quantityReceived, parseInt(e.target.value) || 0);
                                // update lines list
                                const others = vReturnLines.filter((l) => l.grnLineItemId !== line.id);
                                if (qty > 0) {
                                  setVReturnLines([...others, { grnLineItemId: line.id, productId: line.productId, quantity: qty, unitCost: line.unitCost }]);
                                } else {
                                  setVReturnLines(others);
                                }
                              }}
                            />
                          </div>
                          <div className="text-right font-semibold">
                            Total: PKR {Math.round(( (existing?.quantity || 0) * Number(line.unitCost) )).toLocaleString("en-US")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Return Reason</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Defective compressors returned to Supplier Carrier"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  value={vReturnReason}
                  onChange={(e) => setVReturnReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVendorReturnOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/10"
                >
                  Confirm Vendor Return
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== REFUND CASH DIALOG ==================== */}
      {mounted && isRefundOpen && selectedReturn && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Record Customer Refund Payout</h3>
              <button
                type="button"
                onClick={() => setIsRefundOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Log cash refund payouts against Return {selectedReturn.returnNumber}. This updates Cash ledger balances.</p>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Refund Amount (PKR)</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-rose-500"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Payment Method</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                >
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                  <option value="BANK">BANK</option>
                  <option value="CREDIT_NOTE">CREDIT NOTE</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRefundOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== RECORD PAYMENT MODAL ==================== */}
      {mounted && isPaymentOpen && selectedInvoice && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 font-sans">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Record Client Payment</h3>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentOpen(false);
                  setSelectedInvoice(null);
                  setPaymentAmount("");
                }}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Log payments against Invoice {selectedInvoice.invoiceNumber}. Outstanding: PKR {Math.round(Number(selectedInvoice.totalAmount) - Number(selectedInvoice.amountPaid)).toLocaleString("en-US")}</p>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Payment Amount (PKR)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={Math.round(Number(selectedInvoice.totalAmount) - Number(selectedInvoice.amountPaid))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-emerald-500 font-mono"
                  value={paymentAmount}
                  onChange={(e) => {
                    const maxAmount = Math.round(Number(selectedInvoice.totalAmount) - Number(selectedInvoice.amountPaid));
                    const val = Math.round(Number(e.target.value)) || 0;
                    if (val > maxAmount) {
                      toast({ title: "Exceeds Balance", message: `Payment amount cannot exceed outstanding balance (${maxAmount.toLocaleString("en-US")} PKR).`, type: "warning" });
                      setPaymentAmount(String(maxAmount));
                    } else {
                      setPaymentAmount(e.target.value);
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Payment Method</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                  <option value="BANK">BANK</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaymentOpen(false);
                    setSelectedInvoice(null);
                    setPaymentAmount("");
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== CREATE CUSTOMER MODAL ==================== */}
      {mounted && isCreateCustomerOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                <span>Add New Customer</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateCustomerOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Register customer in the central directory. Customer Name and Phone Number are required; other fields are optional.
            </p>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Customer / Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Textile Mill or Ali Ahmed"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
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
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
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
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
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
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
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
                    value={custNtn}
                    onChange={(e) => setCustNtn(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    CNIC / National ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 35202-1234567-1"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={custCnic}
                    onChange={(e) => setCustCnic(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Opening Receivable Balance (PKR) (Debit / Receivable - Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50000 (Initial balance due)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono font-bold text-amber-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={custOpeningBalance}
                  onChange={(e) => setCustOpeningBalance(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  If this customer has an existing balance from prior trading, enter it here. An Opening Balance Voucher (OBV) will be automatically created in the ledger.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Customer Notes / Terms (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Preferred client, Net 15 billing, specialized cooling contract..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateCustomerOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCustomer}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  {submittingCustomer ? "Saving..." : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== EDIT CUSTOMER MODAL ==================== */}
      {mounted && isEditCustomerOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-500" />
                <span>Edit Customer Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditCustomerOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Update contact info, billing address, tax identification, or remarks for this customer.
            </p>

            <form onSubmit={handleEditCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Customer / Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Premises / Delivery Address (Optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    NTN / STRN (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={custNtn}
                    onChange={(e) => setCustNtn(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    CNIC / National ID (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={custCnic}
                    onChange={(e) => setCustCnic(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Customer Notes / Terms (Optional)
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditCustomerOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCustomer}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  {submittingCustomer ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== CUSTOMER 360° HISTORY DOSSIER MODAL ==================== */}
      {mounted && isCustomerDossierOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl w-full max-w-5xl shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[92vh] space-y-5">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {selectedCustomerDossier?.name || "Customer Profile"}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {selectedCustomerDossier?.phone}
                      </span>
                      {selectedCustomerDossier?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {selectedCustomerDossier?.email}
                        </span>
                      )}
                      {selectedCustomerDossier?.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {selectedCustomerDossier?.address}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedCustomerDossier && (
                  <button
                    onClick={() => openEditCustomer(selectedCustomerDossier)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Edit Profile</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCustomerDossierOpen(false)}
                  className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {dossierLoading ? (
              <div className="p-12 text-center text-slate-400">Loading customer history dossier...</div>
            ) : selectedCustomerDossier ? (
              <>
                {/* Metrics Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed Invoices</span>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white block mt-1">
                      {selectedCustomerDossier.invoices?.length || 0} Invoices
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      PKR {Number(selectedCustomerDossier.stats?.totalSpent || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Total Paid Collected</span>
                    <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1 font-mono">
                      PKR {Number(selectedCustomerDossier.stats?.totalPaid || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-600">Settled payments</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Outstanding Balance</span>
                    <span className="text-lg font-extrabold text-amber-500 block mt-1 font-mono">
                      PKR {Number(selectedCustomerDossier.stats?.outstandingBalance || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-amber-600">Pending receivables</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Complaints & Tickets</span>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white block mt-1">
                      {selectedCustomerDossier.complaints?.length || 0} Logged
                    </span>
                    <span className="text-[10px] text-rose-500 font-bold">
                      {selectedCustomerDossier.stats?.openComplaints || 0} Active / Open
                    </span>
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto">
                  <button
                    onClick={() => setDossierTab("invoices")}
                    className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      dossierTab === "invoices"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Invoices ({selectedCustomerDossier.invoices?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDossierTab("ledger")}
                    className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      dossierTab === "ledger"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Financial Ledger & Debit/Credit ({selectedCustomerDossier.ledger?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDossierTab("complaints")}
                    className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      dossierTab === "complaints"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Complaints / Service ({selectedCustomerDossier.complaints?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDossierTab("dos")}
                    className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      dossierTab === "dos"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Delivery Orders ({selectedCustomerDossier.deliveryOrders?.length || 0})</span>
                  </button>
                </div>

                {/* Sub Tab: Invoices */}
                {dossierTab === "invoices" && (
                  <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3">Invoice Number</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Total Amount (PKR)</th>
                            <th className="p-3 text-right">Amount Paid</th>
                            <th className="p-3 text-right">Balance Due</th>
                            <th className="p-3 text-center">PDF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {selectedCustomerDossier.invoices?.map((inv: any) => {
                            const isFullyPaid = Math.round(Number(inv.amountPaid)) >= Math.round(Number(inv.totalAmount));
                            const balanceDue = Math.max(0, Math.round(Number(inv.totalAmount) - Number(inv.amountPaid)));
                            return (
                              <tr key={inv.id} className="hover:bg-white dark:hover:bg-slate-900/60">
                                <td className="p-3 font-bold font-mono text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                                <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(inv.date).toLocaleDateString()}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isFullyPaid
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60"
                                      : inv.status === "PARTIALLY_PAID"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/60"
                                  }`}>
                                    {isFullyPaid ? "PAID" : inv.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono font-bold">{Math.round(Number(inv.totalAmount)).toLocaleString()}</td>
                                <td className="p-3 text-right font-mono text-emerald-500 font-bold">{Math.round(Number(inv.amountPaid)).toLocaleString()}</td>
                                <td className="p-3 text-right font-mono font-bold">
                                  <span className={balanceDue > 0 ? "text-amber-500" : "text-slate-400"}>
                                    {balanceDue.toLocaleString()}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <a
                                    href={`/api/pdf?type=invoice&id=${inv.id}&inline=true`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold inline-flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View</span>
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                          {(!selectedCustomerDossier.invoices || selectedCustomerDossier.invoices.length === 0) && (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-slate-400">
                                No commercial invoices issued for this customer yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub Tab: Financial Ledger & Debit/Credit */}
                {dossierTab === "ledger" && (
                  <div className="space-y-4">
                    {/* Top Summary Bar & Link to Financials */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Debits (Billed)</span>
                          <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                            PKR {Number(selectedCustomerDossier.ledgerTotals?.totalDebit || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
                        <div>
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Total Credits (Paid)</span>
                          <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                            PKR {Number(selectedCustomerDossier.ledgerTotals?.totalCredit || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
                        <div>
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Net Ledger Balance</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-sm font-black font-mono text-amber-500">
                              PKR {Math.abs(Number(selectedCustomerDossier.ledgerTotals?.closingBalance || 0)).toLocaleString()}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              (selectedCustomerDossier.ledgerTotals?.closingBalance || 0) > 0
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60"
                                : (selectedCustomerDossier.ledgerTotals?.closingBalance || 0) < 0
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60"
                            }`}>
                              {selectedCustomerDossier.ledgerTotals?.status || "SETTLED"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <a
                        href={`/financials?tab=ledger&partyType=CUSTOMER&partyName=${encodeURIComponent(selectedCustomerDossier.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Open Full Party Ledger in Financials</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </a>
                    </div>

                    {/* Ledger Transactions Table */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                              <th className="p-3">Date</th>
                              <th className="p-3">Doc / Voucher Ref</th>
                              <th className="p-3">Type</th>
                              <th className="p-3">Particulars / Description</th>
                              <th className="p-3 text-right">Debit (PKR)</th>
                              <th className="p-3 text-right">Credit (PKR)</th>
                              <th className="p-3 text-right">Running Balance (PKR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {selectedCustomerDossier.ledger?.map((tx: any, idx: number) => {
                              const isDebit = Number(tx.debit) > 0;
                              const isCredit = Number(tx.credit) > 0;
                              return (
                                <tr key={tx.id || idx} className="hover:bg-white dark:hover:bg-slate-900/60 font-sans">
                                  <td className="p-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                                    {new Date(tx.date).toLocaleDateString()}
                                  </td>
                                  <td className="p-3 font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                                    {tx.voucherNumber || tx.referenceNumber || "-"}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      tx.docType === "INVOICE"
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60"
                                        : tx.docType === "PAYMENT"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60"
                                        : tx.docType === "CRV" || tx.docType === "BRV"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60"
                                        : tx.docType === "OBV"
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60"
                                        : "bg-slate-100 text-slate-700 dark:bg-slate-800"
                                    }`}>
                                      {tx.docType}
                                    </span>
                                  </td>
                                  <td className="p-3 max-w-sm truncate text-slate-700 dark:text-slate-300 font-medium" title={tx.description}>
                                    {tx.description}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold">
                                    {isDebit ? (
                                      <span className="text-slate-900 dark:text-white">{Number(tx.debit).toLocaleString()}</span>
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-700">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold">
                                    {isCredit ? (
                                      <span className="text-emerald-500">{Number(tx.credit).toLocaleString()}</span>
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-700">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold">
                                    <span className={tx.runningBalance > 0 ? "text-amber-500" : tx.runningBalance < 0 ? "text-blue-500" : "text-slate-400"}>
                                      {Math.abs(Number(tx.runningBalance)).toLocaleString()} {tx.runningBalance > 0 ? "Dr" : tx.runningBalance < 0 ? "Cr" : ""}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            {(!selectedCustomerDossier.ledger || selectedCustomerDossier.ledger.length === 0) && (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                                  No financial ledger entries or voucher transactions recorded for this customer yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub Tab: Complaints */}
                {dossierTab === "complaints" && (
                  <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3">Ticket #</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Problem Description</th>
                            <th className="p-3">Technician</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Service Charges</th>
                            <th className="p-3 text-center">Billing</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {selectedCustomerDossier.complaints?.map((comp: any) => (
                            <tr key={comp.id} className="hover:bg-white dark:hover:bg-slate-900/60">
                              <td className="p-3 font-bold font-mono text-slate-900 dark:text-white">{comp.complaintNumber}</td>
                              <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(comp.date || comp.createdAt).toLocaleDateString()}</td>
                              <td className="p-3 max-w-xs truncate" title={comp.description}>{comp.description}</td>
                              <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                                {comp.technician?.name || <span className="text-slate-400 italic">Unassigned</span>}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  comp.status === "RESOLVED"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40"
                                    : comp.status === "IN_PROGRESS"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40"
                                }`}>
                                  {comp.status}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold">
                                PKR {Number(comp.amount || 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-center">
                                {comp.invoice ? (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-mono font-bold">
                                    {comp.invoice.invoiceNumber}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">{comp.amountStatus || "UNPAID"}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {(!selectedCustomerDossier.complaints || selectedCustomerDossier.complaints.length === 0) && (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-slate-400">
                                No service tickets or complaints logged for this customer.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub Tab: Delivery Orders */}
                {dossierTab === "dos" && (
                  <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3">DO Number</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Items Dispatched</th>
                            <th className="p-3">Destination / Address</th>
                            <th className="p-3 text-center">PDF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {selectedCustomerDossier.deliveryOrders?.map((d: any) => (
                            <tr key={d.id} className="hover:bg-white dark:hover:bg-slate-900/60">
                              <td className="p-3 font-bold font-mono text-slate-900 dark:text-white">{d.doNumber}</td>
                              <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(d.date || d.createdAt).toLocaleDateString()}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-950/40 rounded-full text-[10px] font-bold">
                                  {d.status}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {d.lineItems?.length || 0} product line(s)
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 truncate max-w-xs">{d.deliveryAddress}</td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsCustomerDossierOpen(false);
                                      handleOpenEditDo(d);
                                    }}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded text-[10px] font-bold inline-flex items-center gap-1"
                                    title="Edit Delivery Order"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                  <a
                                    href={`/api/pdf?type=do&id=${d.id}&inline=true`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold inline-flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View</span>
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {(!selectedCustomerDossier.deliveryOrders || selectedCustomerDossier.deliveryOrders.length === 0) && (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400">
                                No warehouse delivery orders dispatched for this customer yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCustomerDossierOpen(false)}
                className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function SalesPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Sales...</div>}>
      <SalesPageContent />
    </React.Suspense>
  );
}
