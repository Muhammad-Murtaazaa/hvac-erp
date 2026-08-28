"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Calendar,
  User,
  Phone,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building,
} from "lucide-react";
import { SkeletonDocument } from "@/components/shared/SkeletonTable";
import { useToast } from "@/components/shared/ToastProvider";

export default function DeliveryConfirmationPage() {
  const params = useParams();
  const rawId = (params?.id as string) || "";
  const doId = decodeURIComponent(rawId);
  const { toast } = useToast();

  const [deliveryOrder, setDeliveryOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);

  useEffect(() => {
    if (doId) {
      fetchDODetails();
    }
  }, [doId]);

  const fetchDODetails = async () => {
    if (!doId) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/delivery/confirm?id=${encodeURIComponent(doId)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Delivery Order not found");
      }

      setDeliveryOrder(data.deliveryOrder);
      if (data.deliveryOrder.status === "DELIVERED") {
        setConfirmedSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load Delivery Order details");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName.trim()) {
      toast({
        title: "Receiver Name Required",
        message: "Please enter the name of the person receiving this shipment.",
        type: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/delivery/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: doId,
          receiverName: receiverName.trim(),
          receiverPhone: receiverPhone.trim(),
          remarks: remarks.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to confirm delivery.");
      }

      toast({
        title: "Delivery Confirmed",
        message: "Delivery Order marked as DELIVERED successfully.",
        type: "success",
      });
      setConfirmedSuccess(true);
      if (data.deliveryOrder) {
        setDeliveryOrder(data.deliveryOrder);
      }
    } catch (err: any) {
      toast({
        title: "Confirmation Error",
        message: err.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 flex items-center justify-center">
        <SkeletonDocument />
      </div>
    );
  }

  if (error || !deliveryOrder) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 text-rose-500 rounded-full mb-4">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delivery Verification</h2>
        <p className="text-xs text-slate-500 max-w-sm mb-4">
          {error || "Could not find a valid Delivery Order matching this QR code."}
        </p>
        <button
          onClick={fetchDODetails}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  const formattedDN = deliveryOrder.doNumber
    ? deliveryOrder.doNumber.replace("DO-", "TCE/")
    : deliveryOrder.doNumber || "DO";

  const isDelivered = confirmedSuccess || deliveryOrder.status === "DELIVERED";

  const formattedDate = deliveryOrder.date
    ? new Date(deliveryOrder.date).toLocaleDateString("en-GB")
    : deliveryOrder.createdAt
    ? new Date(deliveryOrder.createdAt).toLocaleDateString("en-GB")
    : "Recent";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 font-sans flex flex-col justify-between">
      <div className="max-w-lg mx-auto w-full space-y-4">
        {/* Brand Header */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
          <div className="flex justify-center items-center mb-3">
            <img
              src="/logo.png"
              alt="Technicool Engineering"
              className="h-12 w-auto object-contain"
              onError={(e: any) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
            Delivery Order Confirmation
          </h1>
          <p className="text-[11px] text-slate-500">
            Technicool Engineering • Official Electronic Receiving Gateway
          </p>
        </div>

        {/* Status Banner */}
        {isDelivered ? (
          <div className="bg-emerald-600 text-white p-5 rounded-2xl text-center space-y-2 shadow-lg shadow-emerald-600/20 animate-fadeIn">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-1">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-base font-bold">Delivery Successfully Confirmed!</h2>
            <p className="text-xs text-emerald-100 leading-relaxed">
              This shipment has been acknowledged and marked as <strong>DELIVERED</strong>. Thank you for your confirmation.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-4 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300">
            <Clock className="w-5 h-5 shrink-0 text-amber-500" />
            <div className="text-xs">
              <span className="font-bold">Awaiting Receipt Confirmation.</span> Please inspect the delivered goods and sign off below.
            </div>
          </div>
        )}

        {/* DO Details Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Challan / DO #</span>
              <div className="text-base font-black text-slate-900 dark:text-white">{formattedDN}</div>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                isDelivered
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
              }`}
            >
              {isDelivered ? "DELIVERED" : deliveryOrder.status || "DISPATCHED"}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
              <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Customer / Client: </span>
                {deliveryOrder.clientName || "Direct Client"}
              </div>
            </div>

            {deliveryOrder.clientPhone && (
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Phone: </span>
                  {deliveryOrder.clientPhone}
                </div>
              </div>
            )}

            {deliveryOrder.deliveryAddress && (
              <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Delivery Site: </span>
                  {deliveryOrder.deliveryAddress}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Dispatched Date: </span>
                {formattedDate}
              </div>
            </div>
          </div>

          {/* Line Items List */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              Delivered Inventory Items:
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3">
              {deliveryOrder.lineItems && deliveryOrder.lineItems.length > 0 ? (
                deliveryOrder.lineItems.map((item: any, idx: number) => (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center text-xs gap-3">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {item.description || item.product?.name || item.product?.sku || "HVAC Equipment / Spare"}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 font-mono shadow-2xs">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No item breakdown attached.</p>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Form (Only shown if not already delivered) */}
        {!isDelivered && (
          <form
            onSubmit={handleConfirmDelivery}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Receiver Sign-Off & Verification
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Received By (Full Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Ali / Site Incharge"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Receiver Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0300-1234567"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Remarks / Package Condition (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Inspected and verified in full quantity."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {submitting ? (
                <span>Confirming Receipt...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Delivery & Sign Off</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-400">
            Technicool Engineering • Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan
          </p>
        </div>
      </div>
    </div>
  );
}
