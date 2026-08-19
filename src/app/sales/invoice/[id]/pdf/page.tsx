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

  // Calculate pricing
  const subtotal = Math.round(invoice.lineItems.reduce((acc: number, item: any) => acc + Number(item.quantity) * Number(item.salesPrice), 0));
  const totalAmount = Math.round(Number(invoice.totalAmount));
  const taxAmount = Math.round(Math.max(0, totalAmount - subtotal));
  const computedTaxRate = subtotal > 0 ? Math.round((taxAmount / subtotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-8 px-4 print:bg-white print:py-0 print:px-0 print:m-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: auto;
          margin: 0mm !important;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 8mm 10mm !important;
            background: #fff !important;
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
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-8 sm:p-12 rounded-2xl shadow-xl print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black">
        
        {/* Universal TCE Header */}
        <div className="flex items-center gap-4 border-b border-black pb-4">
          <div className="shrink-0">
            <img src="/logo.png" alt="TCE Logo" className="h-16 w-auto object-contain" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase font-sans">
              Technicool Engineering
            </h1>
            <div className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">
              MAKE YOUR DESIRE CLIMATE
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              <div>
                OFFICE NO. 22 INSIDE ANEESA CENTRE OPP. MASHALLAH<br />
                ELECTRONICS KHANEWAL ROAD<br />
                PUNJAB<br />
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
        <h2 className="text-md font-bold tracking-wider text-slate-900 dark:text-slate-100 uppercase mb-4 mt-8 border-b border-slate-200 pb-1.5">
          BILLING INVOICE
        </h2>

        {/* Client and Meta Details Grid */}
        <div className="grid grid-cols-2 gap-8 text-xs mb-6">
          <div>
            <span className="text-slate-400 block font-semibold">Bill To:</span>
            <div className="font-bold text-slate-900 dark:text-white text-sm mb-1">{invoice.clientName}</div>
            <div className="text-slate-500 leading-relaxed whitespace-pre-line">
              {invoice.clientAddress || "Walk-in client"}
            </div>
            {invoice.clientPhone && (
              <div className="text-slate-700 dark:text-slate-300 mt-1 font-semibold">{invoice.clientPhone}</div>
            )}
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="space-y-1">
              <div>
                <span className="font-semibold text-slate-400">Invoice No.</span>{" "}
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{invoice.invoiceNumber.replace("INV-", "")}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Date</span>{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {new Date(invoice.date).toLocaleDateString("en-GB")}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Status</span>{" "}
                <span className="font-bold uppercase text-emerald-500">{invoice.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Heading / Description */}
        {(invoice.subjectHeading || invoice.subjectDescription) && (
          <div className="mb-4 text-xs">
            {invoice.subjectHeading && (
              <div className="font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                Subject: {invoice.subjectHeading}
              </div>
            )}
            {invoice.subjectDescription && (
              <div className="text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed font-medium">
                {invoice.subjectDescription}
              </div>
            )}
          </div>
        )}

        {/* Line Items Table with black solid borders */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left border-collapse text-xs border border-black dark:border-slate-800">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-black dark:border-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
                <th className="p-2 border-r border-black dark:border-slate-800 text-center w-12">SrNo</th>
                <th className="p-2 border-r border-black dark:border-slate-800 w-24">Code</th>
                <th className="p-2 border-r border-black dark:border-slate-800">Product / Service Name</th>
                <th className="p-2 border-r border-black dark:border-slate-800 text-center w-16">Unit</th>
                <th className="p-2 border-r border-black dark:border-slate-800 text-right w-20">Quantity</th>
                <th className="p-2 border-r border-black dark:border-slate-800 text-right w-24">Rate</th>
                <th className="p-2 border-r border-black dark:border-slate-800 text-right w-20">Discount</th>
                <th className="p-2 text-right w-28">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black dark:divide-slate-800">
              {invoice.lineItems.map((item: any, index: number) => {
                const lineTotal = Math.round(Number(item.quantity) * Number(item.salesPrice));
                return (
                  <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                    <td className="p-2 border-r border-black dark:border-slate-800 text-center">{index + 1}</td>
                    <td className="p-2 border-r border-black dark:border-slate-800 font-mono">{item.product?.sku || "SERVICE"}</td>
                    <td className="p-2 border-r border-black dark:border-slate-800 font-medium">{item.product?.name || item.description || "Service Item"}</td>
                    <td className="p-2 border-r border-black dark:border-slate-800 text-center">{item.product?.unit || "Nos"}</td>
                    <td className="p-2 border-r border-black dark:border-slate-800 text-right font-semibold">{item.quantity}</td>
                    <td className="p-2 border-r border-black dark:border-slate-800 text-right font-mono">{Math.round(Number(item.salesPrice)).toLocaleString("en-US")}</td>
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
              <span className="font-mono">{subtotal.toLocaleString("en-US")}</span>
            </div>

            {taxAmount > 0 && (
              <>
                <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
                  <span>Sale Tax ({computedTaxRate}%):</span>
                  <span className="font-mono">{taxAmount.toLocaleString("en-US")}</span>
                </div>

                <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200 border-t border-slate-100 dark:border-slate-800 pt-1">
                  <span>Sub Total Incl Sale Tax:</span>
                  <span className="font-mono">{totalAmount.toLocaleString("en-US")}</span>
                </div>
              </>
            )}

            <div className="flex justify-between font-black text-slate-900 dark:text-white border-y-2 border-slate-900 py-1.5 text-sm">
              <span>Total:</span>
              <span className="font-mono">Rs. {totalAmount.toLocaleString("en-US")}</span>
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

        {/* Custom Notes / Terms Section at bottom */}
        {invoice.notes ? (
          <div className="mt-8 text-xs mb-8">
            <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 uppercase tracking-wider">Note.</h4>
            <div className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
              {invoice.notes}
            </div>
          </div>
        ) : null}

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
