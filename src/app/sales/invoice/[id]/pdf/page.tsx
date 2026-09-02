"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import { SkeletonDocument } from "@/components/shared/SkeletonTable";
import { parseInvoiceMetadata } from "@/lib/invoiceHelper";
import { formatDateDisplay } from "@/lib/dateUtils";
import { buildPdfFileName } from "@/lib/pdfFileName";

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

export default function InvoicePdfPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInvoice = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`/api/sales/invoice/${invoiceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load invoice details");
        setInvoice(data.invoice);
        if (data.invoice) {
          document.title = buildPdfFileName({
            docType: "Invoice",
            partyName: data.invoice.customer?.name || data.invoice.clientName || "Customer",
            reference: data.invoice.invoiceNumber || data.invoice.id,
            extension: false,
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (invoiceId) fetchInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
        <SkeletonDocument />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-sm text-rose-500 font-bold mb-4">{error || "Invoice not found"}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  // Calculate pricing using metadata
  const meta = parseInvoiceMetadata(invoice.notes, invoice);
  const subtotal = meta.subtotalAmount;
  const discountAmount = meta.discountAmount;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = meta.taxAmount;
  const computedTaxRate = meta.taxRate;
  const totalAmount = meta.totalAmount;
  const amountPaid = Math.round(Number(invoice.amountPaid || 0));
  const balanceDue = Math.max(0, Math.round(totalAmount - amountPaid));

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
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            color: #000000 !important;
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
          <ArrowLeft className="w-4 h-4" /> Back to Sales
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Main A4 Document Paper Container */}
      <div className="page-container max-w-4xl mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-8 sm:p-12 rounded-2xl shadow-xl print:border-none print:shadow-none print:m-0 print:max-w-none print:w-full print:bg-white text-black">
        <div className="page-content">
          {/* Universal TCE Header */}
          <div className="flex items-center gap-4 border-b-2 border-black pb-3">
            <div className="shrink-0">
              <img src="/logo.png" alt="TCE Logo" className="h-16 w-auto object-contain" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black uppercase font-sans">
                Technicool Engineering
              </h1>
              <div className="text-[11px] text-black tracking-wider uppercase font-bold">
                MAKE YOUR DESIRE CLIMATE
              </div>
              <div className="flex justify-between text-[11px] text-black font-semibold mt-1.5 leading-relaxed">
                <div>
                  Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.<br />
                  NTN: G535752<br />
                  STRN: 3277876376780
                </div>
                <div className="text-right">
                  Web: www.technicool.com.pk<br />
                  Mobile: 03218304978
                </div>
              </div>
            </div>
          </div>

          {/* Document Title */}
          <h2 className="text-base font-black tracking-wider text-black uppercase mb-3 mt-4 border-b border-black pb-1">
            BILLING INVOICE
          </h2>

          {/* Client and Meta Details Grid */}
          <div className="grid grid-cols-2 gap-8 text-[13px] mb-5">
            <div>
              <span className="text-black block font-bold">Bill To:</span>
              <div className="font-extrabold text-black text-sm mb-0.5">{invoice.clientName}</div>
              <div className="text-black font-semibold leading-relaxed whitespace-pre-line text-xs">
                <span className="font-bold text-black">Customer Address:</span>{" "}
                {invoice.customer?.address || invoice.clientAddress || "Walk-in client"}
              </div>
              {invoice.clientPhone && (
                <div className="text-black mt-0.5 font-bold text-xs">
                  <span className="font-bold">Phone:</span> {invoice.clientPhone}
                </div>
              )}
              {(meta.site || (invoice as any).site || invoice.deliveryOrder?.deliveryAddress) && (
                <div className="mt-2 pt-1.5 border-t border-dashed border-black/30 text-black">
                  <span className="font-bold block text-xs">Delivery / Site Address:</span>
                  <div className="font-semibold text-xs leading-relaxed whitespace-pre-line">
                    {(meta.site || (invoice as any).site || invoice.deliveryOrder?.deliveryAddress).trim()}
                  </div>
                </div>
              )}
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="space-y-1">
                <div>
                  <span className="font-bold text-black">Invoice No.</span>{" "}
                  <span className="font-extrabold text-black font-mono text-sm">{invoice.invoiceNumber.replace("INV-", "")}</span>
                </div>
                <div>
                  <span className="font-bold text-black">Date:</span>{" "}
                  <span className="font-bold text-black">
                    {formatDateDisplay(invoice.date, "en-GB")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Heading / Description */}
          {(invoice.subjectHeading || invoice.subjectDescription) && (
            <div className="mb-4 text-[13px]">
              {invoice.subjectHeading && (
                <div className="font-black uppercase tracking-wider text-black mb-0.5">
                  Subject: {invoice.subjectHeading}
                </div>
              )}
              {invoice.subjectDescription && (
                <div className="text-black whitespace-pre-line leading-relaxed font-semibold">
                  {invoice.subjectDescription}
                </div>
              )}
            </div>
          )}

          {/* Line Items Table with black solid borders */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-left border-collapse text-[12.5px] border-2 border-black">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-black font-bold text-black">
                  <th className="p-2 border-r-2 border-black text-center w-12">SrNo</th>
                  <th className="p-2 border-r-2 border-black w-24">Code</th>
                  <th className="p-2 border-r-2 border-black">Product / Service Name</th>
                  <th className="p-2 border-r-2 border-black text-center w-16">Unit</th>
                  <th className="p-2 border-r-2 border-black text-right w-20">Quantity</th>
                  <th className="p-2 border-r-2 border-black text-right w-24">Rate</th>
                  <th className="p-2 border-r-2 border-black text-right w-20">Discount</th>
                  <th className="p-2 text-right w-28">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {invoice.lineItems.map((item: any, index: number) => {
                  const lineTotal = Math.round(Number(item.quantity) * Number(item.salesPrice));
                  let unitName = item.product?.unit;
                  if (item.extraFields) {
                    try {
                      const extra = typeof item.extraFields === "string" ? JSON.parse(item.extraFields) : item.extraFields;
                      if (extra && extra.unit) {
                        unitName = extra.unit;
                      }
                    } catch (e) {}
                  }
                  if (!unitName) unitName = item.unit || "Nos";

                  return (
                    <tr key={item.id} className="text-black font-semibold">
                      <td className="p-2 border-r-2 border-black text-center">{index + 1}</td>
                      <td className="p-2 border-r-2 border-black font-mono font-bold">{item.product?.sku || "SERVICE"}</td>
                      <td className="p-2 border-r-2 border-black font-bold">{item.product?.name || item.description || "Service Item"}</td>
                      <td className="p-2 border-r-2 border-black text-center">{unitName}</td>
                      <td className="p-2 border-r-2 border-black text-right font-bold">{item.quantity}</td>
                      <td className="p-2 border-r-2 border-black text-right font-mono font-bold">{Math.round(Number(item.salesPrice)).toLocaleString("en-US")}</td>
                      <td className="p-2 border-r-2 border-black text-right font-mono">-</td>
                      <td className="p-2 text-right font-black font-mono">{lineTotal.toLocaleString("en-US")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Calculations Block aligned to right */}
          <div className="flex justify-end mb-5">
            <div className="w-80 text-[13px] space-y-1.5 border-t-2 border-black pt-2">
              <div className="flex justify-between font-bold text-black">
                <span>Sub Total:</span>
                <span className="font-mono font-bold">{subtotal.toLocaleString("en-US")}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between font-bold text-black">
                  <span>Discount ({meta.discountType === "PERCENTAGE" ? `${meta.discountPercent}%` : "Flat"}):</span>
                  <span className="font-mono font-bold">- {discountAmount.toLocaleString("en-US")}</span>
                </div>
              )}

              {taxAmount > 0 && (
                <>
                  <div className="flex justify-between font-bold text-black">
                    <span>Sale Tax ({computedTaxRate}%):</span>
                    <span className="font-mono font-bold">{taxAmount.toLocaleString("en-US")}</span>
                  </div>

                  <div className="flex justify-between font-bold text-black border-t border-black pt-1">
                    <span>Sub Total Incl Sale Tax:</span>
                    <span className="font-mono font-bold">{totalAmount.toLocaleString("en-US")}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between font-black text-black border-y-2 border-black py-1.5 text-[14px]">
                <span>Total:</span>
                <span className="font-mono">Rs. {totalAmount.toLocaleString("en-US")}</span>
              </div>

              {amountPaid > 0 && (
                <>
                  <div className="flex justify-between font-bold text-black pt-1">
                    <span>Received Payment:</span>
                    <span className="font-mono font-bold">Rs. {amountPaid.toLocaleString("en-US")}</span>
                  </div>

                  <div className="flex justify-between font-black text-black border-t-2 border-black pt-1.5 text-[14px]">
                    <span>Balance Due:</span>
                    <span className="font-mono">Rs. {balanceDue.toLocaleString("en-US")}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Words and generate remark footer */}
          <div className="text-[13px] space-y-3 border-t border-black pt-3 mt-4">
            <div>
              <span className="font-bold text-black">Total in Words: </span>
              <span className="font-bold text-black capitalize">{numberToWords(totalAmount)}</span>
            </div>

            <div className="text-[11px] text-black font-semibold italic text-center pt-1 border-b border-black pb-1">
              This is a system generated invoice and does not require any signatures.
            </div>
          </div>

          {/* Custom Notes / Terms Section at bottom */}
          {meta.userNotes ? (
            <div className="mt-4 text-[13px] mb-4">
              <h4 className="font-black text-black mb-1 uppercase tracking-wider">Note.</h4>
              <div className="text-black font-bold whitespace-pre-line leading-relaxed">
                {meta.userNotes}
              </div>
            </div>
          ) : null}
        </div>

        {/* Universal TCE Footer */}
        <div className="page-footer mt-auto border-t-2 border-black pt-2 text-center font-sans">
          <div className="flex justify-center items-center gap-1.5 text-xs text-black font-bold">
            <span>📍</span>
            <span>Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.</span>
          </div>
          <div className="flex justify-center items-center gap-6 text-[11px] text-black font-bold mt-1">
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
