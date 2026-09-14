"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Wrench,
  Phone,
  MapPin,
  Calendar,
  User,
  Download,
  Printer,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  Building2,
  Navigation,
  FileCheck,
  ShieldCheck,
  Eye,
  RefreshCw,
} from "lucide-react";

export default function PublicComplaintPage() {
  const params = useParams();
  const rawId = (params?.id as string) || "";
  const complaintId = decodeURIComponent(rawId);

  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showPdfEmbed, setShowPdfEmbed] = useState(false);

  useEffect(() => {
    if (complaintId) {
      fetchComplaint();
    }
  }, [complaintId]);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/support/complaints/${encodeURIComponent(complaintId)}`);
      const data = await res.json();

      if (!res.ok || !data.complaint) {
        throw new Error(data.error || "Complaint ticket not found");
      }

      setComplaint(data.complaint);
    } catch (err: any) {
      setError(err.message || "Failed to load complaint details");
    } finally {
      setLoading(false);
    }
  };

  const ticketIdentifier = complaint?.complaintNumber || complaintId;
  const pdfDownloadUrl = `/api/pdf?type=complaint&id=${encodeURIComponent(ticketIdentifier)}&download=true`;
  const pdfViewUrl = `/api/pdf?type=complaint&id=${encodeURIComponent(ticketIdentifier)}&inline=true`;

  const handleDownload = () => {
    setDownloading(true);
    // Create direct hidden download anchor
    const link = document.createElement("a");
    link.href = pdfDownloadUrl;
    link.download = `Complaint_${complaint?.complaintNumber || ticketIdentifier}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 1500);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "OPEN").toUpperCase();
    switch (s) {
      case "RESOLVED":
      case "CLOSED":
        return {
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          icon: CheckCircle2,
          label: s,
        };
      case "IN_PROGRESS":
        return {
          bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
          icon: Wrench,
          label: "IN PROGRESS",
        };
      case "PENDING":
      case "OPEN":
      default:
        return {
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
          icon: Clock,
          label: s || "OPEN",
        };
    }
  };

  const cleanPhoneForWa = (phone?: string) => {
    if (!phone) return "";
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) clean = "92" + clean.substring(1);
    return clean;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-mono text-sm tracking-wider">Loading Official Complaint Form...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Complaint Not Found</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            The complaint sheet referenced by <code className="text-blue-400 font-mono font-bold">{complaintId}</code> could not be found or may have been removed.
          </p>
          <button
            onClick={fetchComplaint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/30"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const badge = getStatusBadge(complaint.status);
  const StatusIcon = badge.icon;
  const waNumber = cleanPhoneForWa(complaint.customerPhone);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-base shadow-lg shadow-blue-600/30 tracking-wider">
              TCE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base sm:text-lg tracking-tight">Technicool Engineering</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Service Desk
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Multan & South Punjab • Official Complaint Form
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? "Downloading..." : "Download PDF"}</span>
            </button>
            <a
              href={pdfViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-medium text-xs sm:text-sm transition-all"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">View PDF</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Ticket Header & Live Status Card */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Service Complaint Sheet
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2 font-mono">
                {complaint.complaintNumber}
              </h1>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Issued Date: {new Date(complaint.date || complaint.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {badge.label}
              </span>
              {complaint.amount && Number(complaint.amount) > 0 && (
                <div className="text-xs font-mono text-slate-400">
                  Billable Amount: <span className="font-bold text-emerald-400">PKR {Number(complaint.amount).toLocaleString()}</span> ({complaint.amountStatus || "UNPAID"})
                </div>
              )}
            </div>
          </div>

          {/* Field Technician Quick Actions Bar */}
          <div className="pt-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              Technician Field Actions
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Call Customer */}
              {complaint.customerPhone ? (
                <a
                  href={`tel:${complaint.customerPhone}`}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call Client</span>
                </a>
              ) : null}

              {/* WhatsApp Customer */}
              {waNumber ? (
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                    `Assalam o Alaikum, Technicool Engineering service team is on the way for your HVAC complaint (${complaint.complaintNumber}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              ) : null}

              {/* Open Google Maps */}
              {complaint.customerAddress ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(complaint.customerAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border border-sky-500/20 text-xs font-bold transition-all"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Navigate</span>
                </a>
              ) : null}

              {/* Instant PDF Download */}
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Save PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Customer & Location Details Card */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-5 h-5 text-blue-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">Client & Site Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Customer Name
              </span>
              <p className="text-base font-bold text-white">{complaint.customerName || "N/A"}</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Contact Phone / Cell
              </span>
              <p className="text-base font-mono font-bold text-blue-400">{complaint.customerPhone || "N/A"}</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1 md:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Service Address / Location
              </span>
              <p className="text-sm font-medium text-slate-200 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{complaint.customerAddress || "No address provided"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Reported Issue & Job Scope */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Wrench className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">Reported Issue & Scope of Work</h2>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <p className="text-sm sm:text-base text-slate-200 whitespace-pre-wrap leading-relaxed">
              {complaint.description || "General HVAC Inspection and Service Maintenance"}
            </p>
          </div>

          {complaint.remarks && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-300">
              <span className="font-bold">Coordinator Notes:</span> {complaint.remarks}
            </div>
          )}
        </div>

        {/* Assigned Technician Profile */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">Assigned Field Technician</h2>
          </div>

          {complaint.technician ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Technician Name
                </span>
                <p className="text-base font-bold text-white">{complaint.technician.name}</p>
                {complaint.technician.employeeNo && (
                  <span className="text-[11px] font-mono text-slate-400">{complaint.technician.employeeNo}</span>
                )}
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Designation / Trade
                </span>
                <p className="text-sm font-semibold text-slate-200">
                  {complaint.technician.position || "HVAC Field Technician"}
                </p>
                <span className="text-[11px] text-slate-400">{complaint.technician.department || "SERVICE"}</span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Technician Phone
                </span>
                <p className="text-base font-mono font-bold text-blue-400">
                  {complaint.technician.phone || "N/A"}
                </p>
                {complaint.technician.phone && (
                  <a
                    href={`tel:${complaint.technician.phone}`}
                    className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" /> Call Technician
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-sm text-slate-400">
              No technician currently assigned to this ticket.
            </div>
          )}
        </div>

        {/* Physical Form Technical Inspection Guide */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">Inspection & Operating Checklist</h2>
            </div>
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">Included on Printable Sheet</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
              <span className="font-bold text-slate-300 block text-sm border-b border-slate-800 pb-1">
                Unit Specifications
              </span>
              <div className="flex justify-between py-1 border-b border-slate-800/50 text-slate-400">
                <span>Indoor Unit Model:</span>
                <span className="font-mono text-slate-300">As per physical unit</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50 text-slate-400">
                <span>Indoor Serial:</span>
                <span className="font-mono text-slate-300">Fill on sheet</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50 text-slate-400">
                <span>Outdoor Unit Model:</span>
                <span className="font-mono text-slate-300">Fill on sheet</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50 text-slate-400">
                <span>Refrigerant / Gas Type:</span>
                <span className="font-mono text-slate-300">R22 / R410A / R32</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
              <span className="font-bold text-slate-300 block text-sm border-b border-slate-800 pb-1">
                Operating Conditions
              </span>
              <div className="flex justify-between py-1 border-b border-slate-800/50 text-slate-400">
                <span>Grill & Room Temp:</span>
                <span className="font-mono text-slate-300">°C (Measurable)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50 text-slate-400">
                <span>Gas Pressure (PSI):</span>
                <span className="font-mono text-slate-300">Standing / Running</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50 text-slate-400">
                <span>Voltage & Current (Amp):</span>
                <span className="font-mono text-slate-300">Check on load</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50 text-slate-400">
                <span>Customer Extra Work:</span>
                <span className="font-mono text-slate-300">Signed confirmation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Embedded PDF Viewer Toggle */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Full PDF Document Preview</h3>
              <p className="text-xs text-slate-400">View or print the exact Technicool Engineering letterhead sheet</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPdfEmbed(!showPdfEmbed)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              {showPdfEmbed ? "Hide PDF Viewer" : "Show PDF Viewer"}
            </button>
          </div>

          {showPdfEmbed && (
            <div className="mt-4 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <iframe
                src={`${pdfViewUrl}#toolbar=1&navpanes=0`}
                title="Complaint Sheet PDF"
                className="w-full h-[650px] border-0"
              />
            </div>
          )}
        </div>

        {/* Official Footer */}
        <footer className="text-center pt-4 pb-8 space-y-2 border-t border-slate-800/80 text-xs text-slate-500">
          <p className="font-semibold text-slate-400">
            Technicool Engineering (Pvt) Ltd • Multan, Pakistan
          </p>
          <p>
            NTN: G535752 • STRN: 3277876376780 • Helpline: 0321-8304978 • Web: www.technicool.com.pk
          </p>
          <p className="text-[11px] text-slate-600">
            This document is an authorized digital service record. All work must be completed according to TCE engineering protocols.
          </p>
        </footer>
      </main>
    </div>
  );
}
