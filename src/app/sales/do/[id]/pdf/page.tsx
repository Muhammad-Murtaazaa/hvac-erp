"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, QrCode, Tag } from "lucide-react";
import QRCode from "qrcode";
import { SkeletonDocument } from "@/components/shared/SkeletonTable";

export default function DeliveryOrderPdfPage() {
  const params = useParams();
  const router = useRouter();
  const doId = params.id as string;

  const [doRecord, setDoRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [stickerMode, setStickerMode] = useState<boolean>(false);

  useEffect(() => {
    const fetchDO = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`/api/sales/do/${doId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load DO details");
        setDoRecord(data.deliveryOrder);

        // Generate QR code for delivery confirmation
        const origin = window.location.origin;
        const confirmUrl = `${origin}/delivery/confirm/${doId}`;
        const qr = await QRCode.toDataURL(confirmUrl, {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 200,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setQrDataUrl(qr);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (doId) fetchDO();
  }, [doId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
        <SkeletonDocument />
      </div>
    );
  }

  if (error || !doRecord) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-sm text-rose-500 font-bold mb-4">{error || "Delivery Order not found"}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const totalQty = doRecord.lineItems.reduce((acc: number, item: any) => acc + Number(item.quantity), 0);

  // DN Number format from DO-10001 to TCE/10001 or TCE/352
  const formattedDN = doRecord.doNumber ? doRecord.doNumber.replace("DO-", "TCE/") : "";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* Top control bar */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap justify-between items-center gap-3 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sales
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStickerMode(!stickerMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              stickerMode
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
            }`}
          >
            <Tag className="w-4 h-4" /> {stickerMode ? "Switch to Full Challan" : "Box QR Sticker Mode"}
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {stickerMode ? (
        /* Box Shipping Label / QR Sticker Mode (4x6 format) */
        <div className="max-w-md mx-auto bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-xl print:shadow-none print:border-2 print:border-black text-slate-900 font-sans">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">TECHNICOOL ENGINEERING</div>
              <h2 className="text-xl font-extrabold">{formattedDN}</h2>
            </div>
            <div className="text-right text-[11px] font-bold text-slate-600">
              <div>{new Date(doRecord.date).toLocaleDateString("en-GB")}</div>
              <div>{doRecord.through || "DISPATCH"}</div>
            </div>
          </div>

          <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
            <div className="font-extrabold text-sm uppercase text-slate-900">{doRecord.clientName}</div>
            <div className="text-slate-600 font-semibold">{doRecord.clientPhone}</div>
            <div className="text-slate-700 font-medium">{doRecord.deliveryAddress}</div>
          </div>

          {qrDataUrl && (
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-400 rounded-xl my-4 text-center">
              <img src={qrDataUrl} alt="Delivery QR Code" className="w-44 h-44 object-contain" />
              <p className="text-[11px] font-black uppercase text-slate-900 mt-2 tracking-wider">
                SCAN WITH PHONE TO CONFIRM RECEIPT
              </p>
              <p className="text-[9px] text-slate-500">Auto-notifies dispatch & marks DO delivered</p>
            </div>
          )}

          <div className="text-center text-[10px] font-bold text-slate-400 border-t border-slate-200 pt-2">
            HVAC ERP Smart Dispatch & Delivery System
          </div>
        </div>
      ) : (
        /* Full DO Sheet */
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-10 shadow-xl print:shadow-none print:border-none print:p-0 text-slate-800 dark:text-slate-100 font-sans relative overflow-hidden">
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
                  TECHNICOOL ENGINEERING
                </h1>
                <span className="text-[10px] font-black italic text-slate-600 dark:text-slate-400 tracking-wider">
                  MAKE YOUR DESIRE CLIMATE
                </span>
              </div>

              <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                <div>
                  Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.<br />
                  0300-4384978, services@technicool.com.pk
                </div>
              </div>
            </div>
          </div>

          {/* Document Title */}
          <h2 className="text-center text-lg font-black tracking-widest text-slate-900 dark:text-slate-100 uppercase my-6 border-b border-black pb-1.5 font-mono">
            DELIVERY NOTE
          </h2>

          {/* Client Metadata block + QR Code */}
          <div className="grid grid-cols-3 gap-6 text-xs mb-6 font-semibold items-start">
            <div className="space-y-1.5 col-span-1">
              <div>
                <span className="text-slate-400 font-bold">To:</span>{" "}
                <span className="text-slate-900 dark:text-white uppercase font-black">{doRecord.clientName}</span>
              </div>
              <div>
                <span className="text-slate-900 dark:text-slate-300 font-bold">{doRecord.clientPhone}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">Through:</span>{" "}
                <span className="text-slate-900 dark:text-slate-100 uppercase">{doRecord.through || "BUS"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">Vehicle:</span>{" "}
                <span className="text-slate-900 dark:text-slate-100 uppercase">{doRecord.vehicle || "-"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">To Address:</span>{" "}
                <span className="text-slate-900 dark:text-slate-100 uppercase">{doRecord.deliveryAddress}</span>
              </div>
            </div>

            {/* QR Code Verification Box */}
            <div className="col-span-1 flex flex-col items-center justify-center p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-900/50 text-center">
              {qrDataUrl ? (
                <>
                  <img src={qrDataUrl} alt="Delivery QR Code" className="w-24 h-24 object-contain" />
                  <span className="text-[8px] font-black uppercase text-slate-700 dark:text-slate-300 mt-1 tracking-tight">
                    Scan on Delivery to Confirm
                  </span>
                  <span className="text-[7px] text-slate-400">Auto-updates ERP status</span>
                </>
              ) : (
                <div className="w-24 h-24 flex items-center justify-center text-slate-400 text-[9px]">Generating QR...</div>
              )}
            </div>

            <div className="flex flex-col items-end text-right space-y-1.5 col-span-1">
              <div>
                <span className="text-slate-400 font-bold">Date:</span>{" "}
                <span className="text-slate-900 dark:text-white font-bold">{new Date(doRecord.date).toLocaleDateString("en-GB")}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">DN.No:</span>{" "}
                <span className="text-slate-900 dark:text-white font-mono font-bold">{formattedDN}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">PO.No:</span>{" "}
                <span className="text-slate-900 dark:text-slate-100 font-mono font-bold">{doRecord.poNumber || "-"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">Status:</span>{" "}
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  doRecord.status === "DELIVERED"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {doRecord.status}
                </span>
              </div>
            </div>
          </div>

        {/* Line Items Table with black solid borders */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left border-collapse text-xs border border-black dark:border-slate-800">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-black dark:border-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
                <th className="p-2.5 border-r border-black dark:border-slate-800 text-center w-16">SR#</th>
                <th className="p-2.5 border-r border-black dark:border-slate-800">DESCRIPTION</th>
                <th className="p-2.5 border-r border-black dark:border-slate-800 text-center w-24">TYPE</th>
                <th className="p-2.5 border-r border-black dark:border-slate-800 text-right w-28">QTY</th>
                <th className="p-2.5 text-center w-28">REMARKS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black dark:divide-slate-800">
              {doRecord.lineItems.map((item: any, index: number) => {
                return (
                  <tr key={item.id} className="text-slate-800 dark:text-slate-200 font-mono">
                    <td className="p-2.5 border-r border-black dark:border-slate-800 text-center">{index + 1}</td>
                    <td className="p-2.5 border-r border-black dark:border-slate-800 uppercase font-sans">
                      {item.product?.name || item.description || "Service Item"}
                    </td>
                    <td className="p-2.5 border-r border-black dark:border-slate-800 text-center">-</td>
                    <td className="p-2.5 border-r border-black dark:border-slate-800 text-right font-bold">
                      {Number(item.quantity).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center">-</td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr className="bg-slate-50 dark:bg-slate-900 font-bold">
                <td className="p-2.5 border-r border-black dark:border-slate-800" colSpan={2}>
                  TOTAL
                </td>
                <td className="p-2.5 border-r border-black dark:border-slate-800 text-center">-</td>
                <td className="p-2.5 border-r border-black dark:border-slate-800 text-right font-black font-mono">
                  {totalQty.toFixed(2)}
                </td>
                <td className="p-2.5 text-center">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Note section */}
        {(doRecord.notes || (doRecord.invoices && doRecord.invoices.some((inv: any) => inv.notes))) && (
          <div className="mt-8 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-200 pb-1 mb-2 max-w-[40px]">Note</h4>
            <div className="text-slate-700 dark:text-slate-300 font-semibold whitespace-pre-line border border-slate-200 dark:border-slate-800 p-3 rounded-xl bg-slate-50/50 leading-relaxed">
              {doRecord.notes && <div>{doRecord.notes}</div>}
              {doRecord.invoices?.filter((inv: any) => inv.notes).map((inv: any, i: number) => (
                <div key={i} className={doRecord.notes || i > 0 ? "mt-2 pt-2 border-t border-slate-200 dark:border-slate-800" : ""}>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block mb-0.5">Invoice Notes:</span>
                  {inv.notes}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Acknowledgement block */}
        <div className="grid grid-cols-3 gap-8 text-xs mt-20 pt-8 border-t border-slate-100 dark:border-slate-800/80 font-sans font-semibold">
          <div className="flex flex-col justify-end">
            <div className="border-t border-dotted border-black pt-2 w-44 text-slate-700 dark:text-slate-300">
              Prepared By
            </div>
          </div>

          <div className="flex flex-col items-center justify-end text-center">
            {/* Stamp space */}
            <div className="w-28 h-28 border border-dashed border-slate-300 rounded-full flex items-center justify-center text-[10px] text-slate-300 uppercase tracking-widest leading-none mb-1 select-none">
              Stamp / Sign
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="font-black text-slate-900 dark:text-white mb-2">Received By</h5>
            <div className="flex justify-between border-b border-black pb-0.5">
              <span className="text-slate-400">Name</span>
              <span>_________________</span>
            </div>
            <div className="flex justify-between border-b border-black pb-0.5">
              <span className="text-slate-400">Mobile</span>
              <span>_________________</span>
            </div>
            <div className="flex justify-between border-b border-black pb-0.5">
              <span className="text-slate-400">CNIC</span>
              <span>_________________</span>
            </div>
            <div className="flex justify-between border-b border-black pb-0.5">
              <span className="text-slate-400">Cell</span>
              <span>_________________</span>
            </div>
          </div>
        </div>

        {/* Dotted border at very bottom */}
        <div className="border-b border-dotted border-black w-full mt-16 print:mt-12 mb-8"></div>

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
      )}
    </div>
  );
}
