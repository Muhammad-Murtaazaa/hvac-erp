"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Mail,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  Calendar,
  FileText,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

interface Schedule {
  id: string;
  title: string;
  frequency: string;
  timeOfDay: string;
  recipientEmails: string;
  format: string;
  isActive: boolean;
  lastRunAt: string | null;
  template?: { title: string; entity: string } | null;
}

export default function ScheduledReportsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Quick Setup Form States
  const [quickEmail, setQuickEmail] = useState("");
  const [enableWeekly, setEnableWeekly] = useState(true);
  const [enableMonthly, setEnableMonthly] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Advanced Custom Schedule Form State
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("WEEKLY");
  const [timeOfDay, setTimeOfDay] = useState("08:00");
  const [recipientEmails, setRecipientEmails] = useState("");
  const [format, setFormat] = useState("PDF");

  useEffect(() => {
    fetchQuickSetup();
    fetchSchedules();
  }, []);

  const fetchQuickSetup = async () => {
    try {
      const res = await fetch("/api/reports/quick-setup");
      const json = await res.json();
      if (json.success) {
        if (json.recipientEmail) setQuickEmail(json.recipientEmail);
        setEnableWeekly(json.enableWeekly !== undefined ? json.enableWeekly : true);
        setEnableMonthly(json.enableMonthly !== undefined ? json.enableMonthly : true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/schedules");
      const json = await res.json();
      if (json.success) {
        setSchedules(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuickSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEmail.trim()) {
      setBannerMessage({ type: "error", text: "Please provide a valid recipient email address." });
      return;
    }

    try {
      setSaveLoading(true);
      setBannerMessage(null);
      const res = await fetch("/api/reports/quick-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          recipientEmail: quickEmail.trim(),
          enableWeekly,
          enableMonthly,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBannerMessage({ type: "success", text: "Automated business report schedule saved successfully!" });
        fetchSchedules();
      } else {
        setBannerMessage({ type: "error", text: json.error || "Failed to save schedule" });
      }
    } catch (err: any) {
      setBannerMessage({ type: "error", text: err.message });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSendInstantTestPDF = async () => {
    if (!quickEmail.trim()) {
      setBannerMessage({ type: "error", text: "Please enter your recipient email." });
      return;
    }

    try {
      setTestLoading(true);
      setBannerMessage(null);
      const res = await fetch("/api/reports/quick-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trigger_test",
          recipientEmail: quickEmail.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBannerMessage({
          type: "success",
          text: `Success! Complete Business Dossier PDF report dispatched to ${quickEmail}. Please check your inbox.`,
        });
      } else {
        setBannerMessage({ type: "error", text: json.error || "Failed to dispatch test PDF report." });
      }
    } catch (err: any) {
      setBannerMessage({ type: "error", text: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to remove this scheduled report?")) return;
    try {
      await fetch(`/api/reports/schedules?id=${id}`, { method: "DELETE" });
      fetchSchedules();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
            <Mail className="w-4 h-4" />
            <span>Automated Email Reports & Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Automated Business Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Auto-generate and email comprehensive executive business PDF dossiers with zero manual work.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Custom Schedule</span>
        </button>
      </div>

      {/* Banner Feedback Alert */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 animate-fadeIn ${
            bannerMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          {bannerMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          )}
          <p className="font-semibold">{bannerMessage.text}</p>
        </div>
      )}

      {/* QUICK 1-STEP AUTOMATION SETUP CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automated Email Intelligence</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Configure Automated Executive PDF Reports
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Enter your email to automatically receive a <strong>complete business performance PDF dossier</strong> (covering Sales, Receivables, Inventory Valuation, Service Tickets, and HRM Payroll).
          </p>
        </div>

        <form onSubmit={handleSaveQuickSetup} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Recipient Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="Enter recipient email address (e.g. director@technicool.com.pk)"
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
              />
            </div>
          </div>

          {/* Checkboxes for Weekly & Monthly Schedules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                enableWeekly
                  ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60"
                  : "bg-slate-50/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={enableWeekly}
                onChange={(e) => setEnableWeekly(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-xs block">Weekly Business Digest</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">Every Monday at 08:00 AM (Complete PDF)</span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                enableMonthly
                  ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60"
                  : "bg-slate-50/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={enableMonthly}
                onChange={(e) => setEnableMonthly(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-xs block">Monthly Performance Dossier</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">1st of every month at 08:00 AM (Complete PDF)</span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSendInstantTestPDF}
              disabled={testLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {testLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Generating & Sending PDF...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Send Instant Test PDF Report</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saveLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save & Activate Schedule</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ACTIVE SCHEDULES LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Active Automated Schedules ({schedules.length})</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-400 text-xs">
              Loading schedules...
            </div>
          ) : schedules.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 text-xs">
              No report schedules configured yet. Use the setup box above to activate.
            </div>
          ) : (
            schedules.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-500/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                      {s.frequency} ({s.timeOfDay})
                    </span>
                    <button
                      onClick={() => deleteSchedule(s.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-3">{s.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{s.recipientEmails}</span>
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Format:</span>
                    <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded text-[10px]">
                      <FileText className="w-3 h-3" />
                      PDF Dossier
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span>Last run: {s.lastRunAt ? new Date(s.lastRunAt).toLocaleDateString() : "Pending"}</span>
                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
