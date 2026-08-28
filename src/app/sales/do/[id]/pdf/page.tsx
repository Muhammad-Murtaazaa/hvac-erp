"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, QrCode, Tag } from "lucide-react";
import QRCode from "qrcode";
import { SkeletonDocument } from "@/components/shared/SkeletonTable";
import { formatDateDisplay } from "@/lib/dateUtils";

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
        <div className="max-w-md mx-auto bg-white border-2 border-black rounded-2xl p-6 shadow-xl print:shadow-none print:border-2 print:border-black print:m-0 print:p-4 print:bg-white text-black font-sans">
          <div className="flex justify-between items-start border-b-2 border-black pb-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-black">TECHNICOOL ENGINEERING</div>
              <h2 className="text-xl font-extrabold text-black">{formattedDN}</h2>
            </div>
            <div className="text-right text-[11px] font-bold text-black">
              <div>{formatDateDisplay(doRecord.date, "en-GB")}</div>
              <div>{doRecord.through || "DISPATCH"}</div>
            </div>
          </div>

          <div className="my-4 p-3 bg-slate-100 border border-black rounded-xl space-y-1 text-[13px]">
            <div className="font-extrabold text-sm uppercase text-black">{doRecord.clientName}</div>
            <div className="text-black font-bold">{doRecord.clientPhone}</div>
            <div className="text-black font-semibold">{doRecord.deliveryAddress}</div>
          </div>

          {qrDataUrl && (
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-black rounded-xl my-4 text-center">
              <img src={qrDataUrl} alt="Delivery QR Code" className="w-40 h-40 object-contain" />
              <p className="text-[11px] font-black text-black mt-2">SCAN TO CONFIRM DELIVERY</p>
              <p className="text-[10px] text-black font-bold">Auto-notifies dispatch & marks DO delivered</p>
            </div>
          )}

          <div className="text-center text-[10px] font-bold text-black border-t border-black pt-2">
            HVAC ERP Smart Dispatch & Delivery System
          </div>
        </div>
      ) : (
        /* Full DO Sheet */
        <div className="page-container max-w-4xl mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-10 shadow-xl print:border-none print:shadow-none print:m-0 print:max-w-none print:w-full print:bg-white text-black font-sans relative overflow-hidden">
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
                <h1 className="text-2xl font-black tracking-wider text-black uppercase" style={{ fontFamily: "Arial, sans-serif" }}>
                  TECHNICOOL ENGINEERING
                </h1>
                <span className="text-[11px] font-bold italic text-black tracking-wider">
                  MAKE YOUR DESIRE CLIMATE
                </span>
              </div>

              <div className="flex justify-between text-[11px] text-black font-semibold mt-1.5 leading-relaxed">
                <div>
                  Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.<br />
                  0300-4384978, services@technicool.com.pk
                </div>
              </div>
            </div>
          </div>

          {/* Document Title */}
          <h2 className="text-center text-lg font-black tracking-widest text-black uppercase my-5 border-b-2 border-black pb-1 font-mono">
            DELIVERY NOTE
          </h2>

          {/* Client Metadata block + QR Code */}
          <div className="grid grid-cols-3 gap-6 text-[13px] mb-5 font-bold items-start text-black">
            <div className="space-y-1 col-span-1">
              <div>
                <span className="text-black font-bold">To:</span>{" "}
                <span className="text-black uppercase font-extrabold">{doRecord.clientName}</span>
              </div>
              <div>
                <span className="text-black font-bold">{doRecord.clientPhone}</span>
              </div>
              <div>
                <span className="text-black font-bold">Through:</span>{" "}
                <span className="text-black uppercase">{doRecord.through || "BUS"}</span>
              </div>
              <div>
                <span className="text-black font-bold">Vehicle:</span>{" "}
                <span className="text-black uppercase">{doRecord.vehicle || "-"}</span>
              </div>
              <div>
                <span className="text-black font-bold">To Address:</span>{" "}
                <span className="text-black uppercase">{doRecord.deliveryAddress}</span>
              </div>
            </div>

            {/* QR Code Verification Box */}
            <div className="col-span-1 flex flex-col items-center justify-center p-2 border-2 border-black rounded-xl bg-slate-50 text-center">
              {qrDataUrl ? (
                <>
                  <img src={qrDataUrl} alt="Delivery QR Code" className="w-24 h-24 object-contain" />
                  <span className="text-[9px] font-black uppercase text-black mt-1 tracking-tight">
                    Scan on Delivery to Confirm
                  </span>
                  <span className="text-[8px] text-black font-semibold">Auto-updates ERP status</span>
                </>
              ) : (
                <div className="w-24 h-24 flex items-center justify-center text-black text-[9px] font-bold">Generating QR...</div>
              )}
            </div>

            <div className="flex flex-col items-end text-right space-y-1 col-span-1">
              <div>
                <span className="text-black font-bold">Date:</span>{" "}
                <span className="text-black font-extrabold">{formatDateDisplay(doRecord.date, "en-GB")}</span>
              </div>
              <div>
                <span className="text-black font-bold">DN.No:</span>{" "}
                <span className="text-black font-mono font-extrabold">{formattedDN}</span>
              </div>
              <div>
                <span className="text-black font-bold">PO.No:</span>{" "}
                <span className="text-black font-mono font-extrabold">{doRecord.poNumber || "-"}</span>
              </div>
              <div>
                <span className="text-black font-bold">Status:</span>{" "}
                <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase text-black border border-black">
                  {doRecord.status}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table with black solid borders */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-left border-collapse text-[12.5px] border-2 border-black">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-black font-bold text-black">
                  <th className="p-2 border-r-2 border-black text-center w-16">SR#</th>
                  <th className="p-2 border-r-2 border-black">DESCRIPTION</th>
                  <th className="p-2 border-r-2 border-black text-center w-24">TYPE</th>
                  <th className="p-2 border-r-2 border-black text-right w-28">QTY</th>
                  <th className="p-2 text-center w-28">REMARKS</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {doRecord.lineItems.map((item: any, index: number) => {
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
                      <td className="p-2 border-r-2 border-black text-center font-bold">{index + 1}</td>
                      <td className="p-2 border-r-2 border-black uppercase font-bold">
                        {item.product?.name || item.description || "Service Item"}
                      </td>
                      <td className="p-2 border-r-2 border-black text-center font-bold">{unitName}</td>
                      <td className="p-2 border-r-2 border-black text-right font-black">
                        {item.quantity}
                      </td>
                      <td className="p-2 text-center font-mono font-bold">-</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signatures and Receivers Section */}
          <div className="grid grid-cols-3 gap-6 text-[13px] font-bold mt-8 mb-4 items-end text-black">
            <div className="flex flex-col justify-end">
              <div className="border-t-2 border-black pt-2 w-44 text-black font-bold">
                Prepared By
              </div>
            </div>

            <div className="flex flex-col items-center justify-end text-center">
              {/* Stamp space */}
              <div className="w-24 h-24 border-2 border-dashed border-black rounded-full flex items-center justify-center text-[10px] text-black font-bold uppercase tracking-widest leading-none mb-1 select-none">
                Stamp / Sign
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-black text-black mb-2 uppercase">Received By</h5>
              <div className="flex justify-between border-b border-black pb-0.5">
                <span className="text-black font-bold">Name:</span>
                <span>_________________</span>
              </div>
              <div className="flex justify-between border-b border-black pb-0.5">
                <span className="text-black font-bold">Mobile:</span>
                <span>_________________</span>
              </div>
              <div className="flex justify-between border-b border-black pb-0.5">
                <span className="text-black font-bold">CNIC:</span>
                <span>_________________</span>
              </div>
            </div>
          </div>

          {/* Dotted border at bottom */}
          <div className="border-b border-dotted border-black w-full mt-4 mb-2"></div>
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
      )}
    </div>
  );
}
