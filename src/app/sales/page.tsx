"use client";

import React, { useState, useEffect } from "react";
import { Plus, ListFilter, ClipboardCheck, ArrowUpRight, ArrowDownRight, Layers, FileText, CheckCircle2, DollarSign, RefreshCw, Undo2, QrCode } from "lucide-react";
import SearchFilter from "@/components/shared/SearchFilter";
import SkeletonTable from "@/components/shared/SkeletonTable";
import BulkActionBar from "@/components/shared/BulkActionBar";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "invoices"); // invoices, dos, customer_returns, vendor_returns, sales_setup
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { toast } = useToast();
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

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
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [invLines, setInvLines] = useState<any[]>([
    { productId: "", description: "", quantity: "1", salesPrice: "", extraFields: {} },
  ]);
  const [notes, setNotes] = useState("");
  const [subjectHeading, setSubjectHeading] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [immediatePayment, setImmediatePayment] = useState(false);
  const [payMethod, setPayMethod] = useState("CASH");

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

      if (invRes.ok) setInvoices((await invRes.json()).invoices || []);
      if (doRes.ok) setDeliveryOrders((await doRes.json()).deliveryOrders || []);
      if (pRes.ok) setProducts((await pRes.json()).products || []);
      if (retRes.ok) setCustomerReturns((await retRes.json()).returns || []);
      if (vrRes.ok) setVendorReturns((await vrRes.json()).vendorReturns || []);
      if (vRes.ok) setVendors((await vRes.json()).vendors || []);

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
      alert("Sales tax percentage updated successfully.");
      fetchData();
    } catch (err: any) {
      alert(err.message);
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
      alert("Product sales price updated in catalog.");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedLines = invLines.map((l) => {
      if (l.isCustom) {
        return {
          productId: null,
          description: l.customName + (l.description ? " - " + l.description : ""),
          quantity: l.quantity,
          salesPrice: l.salesPrice,
        };
      }
      return {
        productId: l.productId || null,
        description: l.description,
        quantity: l.quantity,
        salesPrice: l.salesPrice,
      };
    });

    if (!clientName || formattedLines.some((l) => !l.description || !l.quantity || !l.salesPrice)) {
      alert("Please enter client details and fill out all item lines.");
      return;
    }

    const token = localStorage.getItem("token");
    const payload = {
      clientName,
      clientPhone,
      clientAddress,
      lineItems: formattedLines,
      payments: immediatePayment ? [{ amountPaid: Math.round(formattedLines.reduce((acc, l) => acc + Number(l.quantity) * Number(l.salesPrice), 0) * (isGst ? (1 + salesTaxRate / 100) : 1)), method: payMethod }] : [],
      notes,
      subjectHeading,
      subjectDescription,
      isGst,
    };

    try {
      const res = await fetch("/api/sales/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create Invoice");
      alert("Invoice created and ledger balances written successfully.");
      setIsInvoiceOpen(false);
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setNotes("");
      setSubjectHeading("");
      setSubjectDescription("");
      setIsGst(true);
      setInvLines([{ productId: "", description: "", quantity: "1", salesPrice: "", extraFields: {} }]);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedLines = doLines
      .filter((l) => l.productId || (l.description && l.description.trim()))
      .map((l) => ({
        productId: l.productId || null,
        description: l.description ? l.description.trim() : null,
        quantity: isNaN(parseInt(l.quantity)) ? 1 : Math.max(1, parseInt(l.quantity)),
        salesPrice: isNaN(Number(l.salesPrice)) || !l.salesPrice ? "0" : l.salesPrice,
      }));

    if (!doClientName.trim() || !doClientPhone.trim() || !doAddress.trim() || formattedLines.length === 0) {
      alert("Please enter client name, phone, delivery address, and at least one valid product line.");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/sales/do", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientName: doClientName.trim(),
          clientPhone: doClientPhone.trim(),
          deliveryAddress: doAddress.trim(),
          notes: doNotes,
          through: doThrough,
          vehicle: doVehicle,
          lineItems: formattedLines,
          poNumber: doPoNumber.trim() || undefined,
          status: "DISPATCHED", // Dispatch directly to deduct stock
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create Delivery Order");
      }
      alert("Delivery Order created and stock dispatched.");
      setIsDoOpen(false);
      setDoClientName("");
      setDoClientPhone("");
      setDoAddress("");
      setDoNotes("");
      setDoThrough("");
      setDoVehicle("");
      setDoPoNumber("");
      setDoLines([{ productId: "", description: "", quantity: "1", salesPrice: "" }]);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      alert("Please enter a valid payment amount.");
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

      alert("Payment transaction logged. Client balance updated.");
      setIsPaymentOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
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
      alert("Enter return quantity greater than 0 for at least one item.");
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

      alert(`Customer Return logged successfully. Ledger reversed.`);
      setIsReturnOpen(false);
      setReturnInvoiceId("");
      setReturnLines([]);
      setReturnReason("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(Number(refundAmount)) || Number(refundAmount) <= 0) {
      alert("Enter a valid refund amount.");
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

      alert("Cash refund payout registered successfully.");
      setIsRefundOpen(false);
      setSelectedReturn(null);
      setRefundAmount("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVendorReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const activeLines = vReturnLines.filter((l) => l.quantity > 0);

    if (activeLines.length === 0) {
      alert("Enter return quantity greater than 0.");
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

      alert(`Vendor Return ${data.vendorReturn.vendorReturnNumber} logged. Defective stock returned.`);
      setIsVendorReturnOpen(false);
      setSelectedVendorId("");
      setGrnLineItems([]);
      setVReturnLines([]);
      setVReturnReason("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
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

  return (
    <div className="space-y-6">
      {/* Selection Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Sales & Returns Hub</h2>
            <p className="text-xs text-slate-500 mt-1">Issue dispatches, generate billing invoices, and log stock returns</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsInvoiceOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
            <button
              onClick={() => setIsDoOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
            >
              <Plus className="w-4 h-4" />
              New Delivery Order
            </button>
            <button
              onClick={() => setIsReturnOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-rose-500/10"
            >
              <Undo2 className="w-4 h-4" />
              Customer Return
            </button>
            <button
              onClick={() => setIsVendorReturnOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-slate-700/10"
            >
              <Undo2 className="w-4 h-4" />
              Vendor Return
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/80 gap-1 pt-4 overflow-x-auto no-scrollbar">
          {[
            { id: "invoices", label: `Invoices (${invoices.length})` },
            { id: "dos", label: `Delivery Orders (${deliveryOrders.length})` },
            { id: "customer_returns", label: `Customer Returns (${customerReturns.length})` },
            { id: "vendor_returns", label: `Vendor Returns (${vendorReturns.length})` },
            { id: "sales_setup", label: "Sales Setup" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-500 dark:text-blue-400"
                  : "border-transparent text-slate-500"
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
          <SearchFilter placeholder="Search lists by code or client name..." search={search} onSearchChange={setSearch} />

          {/* 1. INVOICES LIST */}
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
                                      alert("Please enter a valid price");
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
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Client Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Smith"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Client Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +923331234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Client Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Phase 6 DHA, Karachi"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Invoice Type</label>
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
                      onClick={() => setInvLines([...invLines, { productId: "", description: "", quantity: "1", salesPrice: "", isCustom: false, extraFields: {} }])}
                      className="text-xs text-blue-500 hover:underline font-bold"
                    >
                      + Add Catalog Row
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvLines([...invLines, { productId: "", description: "", quantity: "1", salesPrice: "", isCustom: true, extraFields: {} }])}
                      className="text-xs text-emerald-500 hover:underline font-bold"
                    >
                      + Add Custom Row
                    </button>
                  </div>
                </div>

                <div className="space-y-3 border-y border-slate-100 dark:border-slate-800 py-3">
                  {/* Grid Headers */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 px-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:grid mb-1">
                    <div>Catalog Product</div>
                    <div>Description / Service</div>
                    <div>Quantity</div>
                    <div>Price (PKR)</div>
                    <div className="text-center">Action</div>
                  </div>

                  {invLines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl">
                      {/* Catalog Select OR Custom Item Name */}
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
                        <select
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                          value={line.productId}
                          onChange={(e) => {
                            const updated = [...invLines];
                            updated[index].productId = e.target.value;
                            const p = products.find((pr) => pr.id === e.target.value);
                            if (p) {
                              updated[index].description = p.name;
                              updated[index].salesPrice = Number(p.salesPrice) > 0 ? String(p.salesPrice) : String(Number(p.averageCost) * 1.25);
                            } else {
                              updated[index].description = "";
                              updated[index].salesPrice = "";
                            }
                            setInvLines(updated);
                          }}
                        >
                          <option value="">Choose Catalog Product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                          ))}
                        </select>
                      )}

                      {/* Manual Description */}
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

                      <input
                        type="number"
                        placeholder="Qty"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                        value={line.quantity}
                        onChange={(e) => {
                          const updated = [...invLines];
                          updated[index].quantity = e.target.value;
                          setInvLines(updated);
                        }}
                      />

                      <input
                        type="number"
                        placeholder="Price (PKR)"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                        value={line.salesPrice}
                        onChange={(e) => {
                          const updated = [...invLines];
                          updated[index].salesPrice = e.target.value;
                          setInvLines(updated);
                        }}
                      />

                      <div className="flex items-center justify-between">
                        {/* Custom Columns JSON Placeholder info */}
                        <span className="text-[10px] text-slate-400">{line.isCustom ? "Custom Row" : "Standard columns"}</span>
                        {invLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setInvLines(invLines.filter((_, i) => i !== index))}
                            className="text-xs text-rose-500 font-bold hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                onClick={() => setIsDoOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">Create delivery orders. Catalog items deduct stock immediately on dispatch.</p>

            <form onSubmit={handleDoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div>
                  <label className="flex items-end text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 min-h-[32px]">Client Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={doClientName}
                    onChange={(e) => setDoClientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-end text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 min-h-[32px]">Client Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +923331112222"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={doClientPhone}
                    onChange={(e) => setDoClientPhone(e.target.value)}
                  />
                </div>
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
                <div>
                  <label className="flex items-end text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 min-h-[32px]">Link PO (Optional)</label>
                  <input
                    type="text"
                    list="po-options"
                    placeholder="Type or select PO number..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono"
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
                  {doLines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl">
                      <select
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                        value={line.productId}
                        onChange={(e) => {
                          const updated = [...doLines];
                          updated[index].productId = e.target.value;
                          const p = products.find((pr) => pr.id === e.target.value);
                          if (p) updated[index].description = p.name;
                          setDoLines(updated);
                        }}
                      >
                        <option value="">Choose Catalog Product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                        ))}
                      </select>

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
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
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
                            className="text-xs text-rose-500 font-bold hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
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
                  onClick={() => setIsDoOpen(false)}
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
                      alert(`Payment amount cannot exceed outstanding balance (${maxAmount.toLocaleString("en-US")} PKR).`);
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
