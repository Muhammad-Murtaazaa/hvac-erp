"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import { SkeletonDocument } from "@/components/shared/SkeletonTable";

import { parsePoMetadata } from "@/lib/poHelper";

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

  // Calculate pricing from PO metadata
  const meta = po.meta || parsePoMetadata(po.notes, po);
  const lineItems = po.lineItems || [];
  const subtotal = meta.subtotalAmount || lineItems.reduce((acc: number, item: any) => acc + Number(item.quantityOrdered || 0) * Number(item.unitCost || 0), 0);
  const discount = meta.discountAmount ?? Number(po.discount || 0);
  const isGst = meta.isGst;
  const taxRate = meta.taxRate || 18;
  const salesTax = meta.taxAmount;
  const totalAmount = meta.totalAmount || Number(po.totalAmount || 0);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-8 px-4 print:bg-white print:py-0 print:px-0 print:m-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 0 !important;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: 100% !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-container {
            min-height: 287mm !important;
            padding: 6mm 10mm 6mm 10mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .page-content {
            flex: 1 0 auto !important;
          }
          .page-footer {
            margin-top: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
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
      <div className="page-container max-w-4xl mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-10 shadow-xl print:border-none print:shadow-none print:m-0 print:max-w-none print:w-full print:bg-white text-black font-sans relative overflow-hidden font-normal">
        <div className="page-content">
          {/* Background Logo Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] select-none z-0">
            <img src="/logo.png" alt="Watermark" className="w-[400px] h-[400px] object-contain" />
          </div>

          {/* Brand Header */}
          <div className="flex items-start gap-4 mb-4 relative z-10">
            {/* Static Branding Logo */}
            <div className="w-24 h-24 flex-shrink-0">
              <img src="/logo.png" alt="TCE Logo" className="w-24 h-24 object-contain" />
            </div>

            <div className="flex-grow pt-1">
              <div className="flex justify-between items-end border-b-2 border-black pb-1">
                <h1 className="text-2xl font-normal tracking-wider text-black uppercase" style={{ fontFamily: "Arial, sans-serif" }}>
                  Technicool Engineering
                </h1>
                <span className="text-[11px] font-normal italic text-black tracking-wider">
                  MAKE YOUR DESIRE CLIMATE
                </span>
              </div>

              <div className="flex justify-between text-[11px] text-black font-normal mt-1.5 leading-relaxed">
                <div>
                  Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.<br />
                  0300-4384978, services@technicool.com.pk
                </div>
              </div>
            </div>
          </div>

          {/* Document Title */}
          <h2 className="text-center text-lg font-normal tracking-widest text-black uppercase my-5 border-b-2 border-black pb-1 font-mono">
            PURCHASE ORDER
          </h2>

          {/* Vendor Details Grid */}
          <div className="grid grid-cols-2 gap-8 text-[13px] mb-5 font-normal text-black">
            <div>
              <span className="text-black block font-normal">Vendor / Supplier:</span>
              <div className="font-bold text-black text-sm mb-0.5">{po.vendor?.name || "Unknown Vendor"}</div>
              <div className="text-black font-normal leading-relaxed whitespace-pre-line">
                {po.vendor?.address || "Supplier Address"}
              </div>
              <div className="text-black mt-0.5 font-normal">
                Attn: {po.vendor?.contactPerson || "-"} ({po.vendor?.phone || "-"})
              </div>
              {po.vendor?.ntn && (
                <div className="text-black font-mono font-normal text-xs mt-0.5">
                  NTN: {po.vendor.ntn}
                </div>
              )}
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="space-y-1 font-normal">
                <div>
                  <span className="font-bold text-black">PO No:</span>{" "}
                  <span className="font-bold text-black font-mono text-sm">{po.poNumber || "-"}</span>
                </div>
                <div>
                  <span className="font-bold text-black">PO Date:</span>{" "}
                  <span className="font-bold text-black">
                    {po.createdAt ? new Date(po.createdAt).toLocaleDateString("en-GB") : "-"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-black">Status:</span>{" "}
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase text-black border border-black">
                    {po.status || "DRAFT"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table with black solid borders */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-left border-collapse text-[12.5px] border-2 border-black">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-black font-bold text-black">
                  <th className="p-2 border-r-2 border-black text-center w-12 font-bold">SR NO</th>
                  <th className="p-2 border-r-2 border-black w-24 font-bold">CODE</th>
                  <th className="p-2 border-r-2 border-black font-bold">PRODUCT</th>
                  <th className="p-2 border-r-2 border-black text-center w-16 font-bold">UNIT</th>
                  <th className="p-2 border-r-2 border-black text-right w-20 font-bold">QTY</th>
                  <th className="p-2 border-r-2 border-black text-right w-24 font-bold">RATE</th>
                  <th className="p-2 text-right w-28 font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {lineItems.map((item: any, index: number) => {
                  const lineTotal = Number(item.quantityOrdered || 0) * Number(item.unitCost || 0);
                  return (
                    <tr key={item.id} className="text-black font-normal">
                      <td className="p-2 border-r-2 border-black text-center font-normal">{index + 1}</td>
                      <td className="p-2 border-r-2 border-black font-mono font-normal">{item.product?.sku || "-"}</td>
                      <td className="p-2 border-r-2 border-black font-normal">{item.product?.name || "-"}</td>
                      <td className="p-2 border-r-2 border-black text-center font-normal">{item.product?.unit || "Nos"}</td>
                      <td className="p-2 border-r-2 border-black text-right font-normal">{item.quantityOrdered}</td>
                      <td className="p-2 border-r-2 border-black text-right font-mono font-normal">{Number(item.unitCost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right font-mono font-normal">{lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Calculations Block aligned to right */}
          <div className="flex justify-end mb-5">
            <div className="w-80 text-[13px] space-y-1.5 border-t-2 border-black pt-2 font-normal">
              <div className="flex justify-between text-black">
                <span className="font-bold">Sub Total:</span>
                <span className="font-mono font-normal">{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-black font-normal">
                  <span className="font-normal">
                    Discount {meta.discountType === "PERCENTAGE" && meta.discountPercent > 0 ? `(${meta.discountPercent}%)` : ""}:
                  </span>
                  <span className="font-mono font-normal">-{discount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {isGst && (
                <>
                  <div className="flex justify-between text-black font-normal">
                    <span className="font-normal">Sales Tax ({taxRate}%):</span>
                    <span className="font-mono font-normal">{salesTax.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between text-black border-t border-black pt-1 font-normal">
                    <span className="font-normal">Sub Total Incl Sales Tax:</span>
                    <span className="font-mono font-normal">{totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-black border-y-2 border-black py-1.5 text-[14px]">
                <span className="font-bold">Total:</span>
                <span className="font-mono font-bold">Rs. {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Words and generate remark footer */}
          <div className="text-[13px] space-y-3 border-t border-black pt-3 mt-4 font-normal">
            <div>
              <span className="font-bold text-black">Total in Words: </span>
              <span className="font-normal text-black capitalize">{numberToWords(totalAmount)}</span>
            </div>

            <div className="text-[11px] text-black font-normal italic text-center pt-1 border-b border-black pb-1">
              This is a system generated purchase order and does not require any signatures.
            </div>
          </div>

          {/* Custom Notes / Terms Section at bottom */}
          {meta.userNotes ? (
            <div className="mt-4 text-[13px] mb-4 font-normal">
              <h4 className="font-normal text-black mb-1 uppercase tracking-wider">Note:</h4>
              <div className="text-black font-normal whitespace-pre-line leading-relaxed">
                {meta.userNotes}
              </div>
            </div>
          ) : null}
        </div>

        {/* Universal TCE Footer */}
        <div className="page-footer mt-auto border-t-2 border-black pt-2 text-center font-sans font-normal">
          <div className="flex justify-center items-center gap-1.5 text-xs text-black font-normal">
            <span>📍</span>
            <span>Office No . 22 Inside Aneesa Centre Opp. MashAllah Electronics Khanewal Road Multan.</span>
          </div>
          <div className="flex justify-center items-center gap-6 text-[11px] text-black font-normal mt-1">
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
