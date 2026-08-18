"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import { SkeletonDocument } from "@/components/shared/SkeletonTable";

// Number to Words Helper
function numberToWords(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
    if (n < 1000000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + " Million" + (n % 1000000 !== 0 ? " " + convert(n % 1000000) : "");
    return convert(Math.floor(n / 1000000000)) + " Billion" + (n % 1000000000 !== 0 ? " " + convert(n % 1000000000) : "");
  };

  const whole = Math.floor(num);
  if (whole === 0) return "Zero only";
  return convert(whole) + " only";
}

export default function POPdfPage() {
  const params = useParams();
  const router = useRouter();
  const poId = params.id as string;

  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPO = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`/api/procurement/po/${poId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load PO details");
        setPo(data.purchaseOrder);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (poId) fetchPO();
  }, [poId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
        <SkeletonDocument />
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-sm text-rose-500 font-bold mb-4">{error || "Purchase Order not found"}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  // Calculate pricing
  const subtotal = po.lineItems.reduce((acc: number, item: any) => acc + Number(item.quantityOrdered) * Number(item.unitCost), 0);
  const discount = Number(po.discount || 0);
  
  // Calculate 18% sales tax based on the subtotal (after discount is applied)
  const taxableAmount = Math.max(0, subtotal - discount);
  const salesTax = Math.round(taxableAmount * 0.18);
  const totalAmount = taxableAmount + salesTax;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-8 px-4 print:bg-white print:py-0 print:px-0 print:m-0">
      {/* Top control bar */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Procurement
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Invoice Sheet */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-10 shadow-xl print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black font-sans relative overflow-hidden">
        
        {/* Background Logo Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] select-none z-0">
          <img src="/logo.png" alt="Watermark" className="w-[400px] h-[400px] object-contain" />
        </div>

        {/* Brand Header */}
        <div className="flex items-start gap-4 mb-6 relative z-10">
          {/* Static Branding Logo */}
          <div className="w-28 h-28 flex-shrink-0">
            <img src="/logo.png" alt="TCE Logo" className="w-28 h-28 object-contain" />
          </div>

          <div className="flex-grow pt-1">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-1">
              <h1 className="text-3xl font-bold tracking-wider text-sky-950 dark:text-sky-400" style={{ fontFamily: "Arial, sans-serif" }}>
                Technicool Engineering
              </h1>
              <span className="text-[10px] font-black italic text-slate-600 dark:text-slate-400 tracking-wider">
                MAKE YOUR DESIRE CLIMATE
              </span>
            </div>

            <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              <div>
                OFFICE NO. 22 INSIDE ANEESA CENTRE OPP. MASHALLAH<br />
                ELECTRONICS KHANEWAL ROAD<br />
                PUNJAB<br />
                NTN: G535752
              </div>
              <div className="text-right">
                Web: www.technicool.com.pk<br />
                Mobile: 03218304978
              </div>
            </div>
          </div>
        </div>

        {/* Document Title */}
        <h2 className="text-md font-bold tracking-wider text-slate-900 dark:text-slate-100 uppercase mb-4 mt-8 border-b border-slate-200 pb-1.5">
          PURCHASE ORDER
        </h2>

        {/* Vendor and Meta Details Grid */}
        <div className="grid grid-cols-2 gap-8 text-xs mb-8">
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm mb-1">{po.vendor.name}</div>
            <div className="font-bold text-slate-700 dark:text-slate-300">{po.vendor.contactPerson}</div>
            <div className="text-slate-500 leading-relaxed mt-1 whitespace-pre-line">
              {po.vendor.address || "Regional Office"}
            </div>
            {po.vendor.ntn && (
              <div className="font-bold text-slate-800 dark:text-slate-200 mt-1">NTN {po.vendor.ntn}</div>
            )}
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="space-y-1">
              <div>
                <span className="font-semibold text-slate-400">PO No.</span>{" "}
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{po.poNumber.replace("PO-", "")}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Date</span>{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {new Date(po.createdAt).toLocaleDateString("en-GB")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table with black solid borders */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left border-collapse text-xs border border-black dark:border-slate-800">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-black dark:border-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
                <th className="p-2 border-r border-black dark:border-slate-800 text-center w-12">SrNo</th>
                <th className="p-2 border-r border-black dark:border-slate-800 w-24">Code</th>
                <th className="p-2 border-r border-black dark:border-slate-800">Product Name</th>
                <th className="p-2 border-r border-black dark:border-slate-800 text-center w-16">Unit</th>
                <th className="p-2 border-r border-black dark:border-slate-800 text-right w-20">Quantity</th>
                <th className="p-2 border-r border-black dark:border-slate-800 text-right w-24">Rate</th>
                <th className="p-2 border-r border-black dark:border-slate-800 text-right w-20">Discount</th>
                <th className="p-2 text-right w-28">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black dark:divide-slate-800">
              {po.lineItems.map((item: any, index: number) => {
                const lineTotal = Number(item.quantityOrdered) * Number(item.unitCost);
                return (
                  <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                    <td className="p-2 border-r border-black dark:border-slate-800 text-center">{index + 1}</td>
                    <td className="p-2 border-r border-black dark:border-slate-800 font-mono">{item.product.sku}</td>
                    <td className="p-2 border-r border-black dark:border-slate-800 font-medium">{item.product.name}</td>
                    <td className="p-2 border-r border-black dark:border-slate-800 text-center">{item.product.unit || "Nos"}</td>
                    <td className="p-2 border-r border-black dark:border-slate-800 text-right font-semibold">{item.quantityOrdered}</td>
                    <td className="p-2 border-r border-black dark:border-slate-800 text-right font-mono">{Number(item.unitCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 border-r border-black dark:border-slate-800 text-right font-mono">-</td>
                    <td className="p-2 text-right font-bold font-mono">{lineTotal.toLocaleString("en-US")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculations Block aligned to right */}
        <div className="flex justify-end mb-6">
          <div className="w-80 text-xs space-y-2 border-t border-slate-200 dark:border-slate-800 pt-2">
            <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
              <span>Sub Total:</span>
              <span className="font-mono">{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between font-semibold text-rose-500">
                <span>Discount:</span>
                <span className="font-mono">-{discount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
              <span>Sale Tax (18%):</span>
              <span className="font-mono">{salesTax.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200 border-t border-slate-100 dark:border-slate-800 pt-1">
              <span>Sub Total Incl Sale Tax:</span>
              <span className="font-mono">{totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between font-black text-slate-900 dark:text-white border-y-2 border-slate-900 py-1.5 text-sm">
              <span>Total:</span>
              <span className="font-mono">Rs. {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Words and generate remark footer */}
        <div className="text-xs space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
          <div>
            <span className="font-bold text-slate-500">Total in Words: </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{numberToWords(totalAmount)}</span>
          </div>

          <div className="text-[10px] text-slate-400 italic text-center pt-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            This is a system generated invoice and does not require any signatures.
          </div>
        </div>

        {/* Delivery Terms Note Section at bottom */}
        <div className="mt-8 text-xs mb-8">
          <h4 className="font-bold text-slate-900 dark:text-white mb-1">Note.</h4>
          {po.notes && (
            <div className="mb-2 text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
              {po.notes}
            </div>
          )}
          <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            <li>
              Delivery Date:{" "}
              {po.lineItems[0]?.expectedDeliveryDate 
                ? new Date(po.lineItems[0].expectedDeliveryDate).toLocaleDateString("en-GB").replace(/\//g, "-")
                : "-"}
            </li>
            <li>Delivery at site.</li>
          </ol>
        </div>

        {/* Universal TCE Footer */}
        <div className="mt-16 border-t border-black pt-4 text-center font-sans">
          <div className="flex justify-center items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold">
            <span>📍</span>
            <span>Office No . 22 Inside Aneesa Centre Opp. MashAllah Electronics Khanewal Road Multan.</span>
          </div>
          <div className="flex justify-center items-center gap-6 text-[10px] text-slate-600 dark:text-slate-400 font-bold mt-1.5">
            <span className="flex items-center gap-1">
              <span>🌐</span>
              <span>Web: www.technicool.com.pk</span>
            </span>
            <span className="flex items-center gap-1">
              <span>✉️</span>
              <span>services@technicool.com.pk</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
