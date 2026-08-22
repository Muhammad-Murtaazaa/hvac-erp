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
  FileText,
  AlertCircle,
  Clock,
  ShieldCheck,
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName.trim()) {
      toast({ title: "Receiver Required", message: "Please enter the name of the person receiving this delivery.", type: "warning" });
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

      toast({ title: "Delivery Confirmed", message: "Delivery Order marked as DELIVERED successfully.", type: "success" });
      setConfirmedSuccess(true);
      if (data.deliveryOrder) {
        setDeliveryOrder(data.deliveryOrder);
      }
    } catch (err: any) {
      toast({ title: "Confirmation Error", message: err.message, type: "error" });
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
        <p className="text-xs text-slate-500 max-w-sm mb-4">{error || "Could not find a valid Delivery Order matching this QR code."}</p>
        <button
          onClick={fetchDODetails}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  const formattedDN = deliveryOrder.doNumber
    ? deliveryOrder.doNumber.replace("DO-", "TCE/")
    : deliveryOrder.doNumber;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 font-sans">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Brand Header */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
          <div className="w-12 h-12 mx-auto mb-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">Delivery Order Verification</h1>
          <p className="text-xs text-slate-500">Official HVAC ERP Delivery Confirmation</p>
        </div>

        {/* Status Banner */}
        {confirmedSuccess || deliveryOrder.status === "DELIVERED" ? (
          <div className="bg-emerald-500 text-white p-6 rounded-2xl text-center space-y-2 shadow-lg shadow-emerald-500/20">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-1">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-base font-bold">Delivery Successfully Confirmed!</h2>
            <p className="text-xs text-emerald-100 leading-relaxed">
              This shipment has been marked as <strong>DELIVERED</strong>. An automated confirmation email has been dispatched to the management team.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-4 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300">
            <Clock className="w-5 h-5 shrink-0 text-amber-500" />
            <div className="text-xs">
              <span className="font-bold">Awaiting Receipt Confirmation.</span> Please review the items below and sign off.
            </div>
          </div>
        )}

        {/* DO Details Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Challan / DO #</span>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">{formattedDN}</div>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                confirmedSuccess || deliveryOrder.status === "DELIVERED"
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
              }`}
            >
              {confirmedSuccess || deliveryOrder.status === "DELIVERED" ? "DELIVERED" : deliveryOrder.status}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Recipient / Client: </span>
                {deliveryOrder.clientName}
              </div>
            </div>

            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Delivery Address: </span>
                {deliveryOrder.deliveryAddress}
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Dispatched Date: </span>
                {new Date(deliveryOrder.date).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Line Items List */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              Delivered Package Items:
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3">
              {deliveryOrder.lineItems && deliveryOrder.lineItems.length > 0 ? (
                deliveryOrder.lineItems.map((item: any, idx: number) => (
                  <div key={idx} className="py-2 first:pt-0 last:pb-0 flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {item.description || item.product?.name || "HVAC Equipment"}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No item list attached.</p>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Form (Only shown if not already delivered) */}
        {!confirmedSuccess && deliveryOrder.status !== "DELIVERED" && (
          <form
            onSubmit={handleConfirmDelivery}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Receiver Sign-Off
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Received By (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe / Store Manager"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Package Condition / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. All boxes intact, inspected and accepted."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {submitting ? "Confirming Delivery..." : "✓ Confirm Delivery & Sign Off"}
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-slate-400">
          HVAC ERP Automated Delivery Verification • Powered by TECHNICOOL
        </p>
      </div>
    </div>
  );
}
