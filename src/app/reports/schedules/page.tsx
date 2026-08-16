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
  FileSpreadsheet,
  Layers,
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
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  // New Form State
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("WEEKLY");
  const [timeOfDay, setTimeOfDay] = useState("08:00");
  const [recipientEmails, setRecipientEmails] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [format, setFormat] = useState("EXCEL");

  useEffect(() => {
    fetchSchedules();
    fetchTemplates();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/schedules");
      const json = await res.json();
      if (json.success) {
        setSchedules(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/reports/templates");
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const createSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !recipientEmails) return;

    try {
      const res = await fetch("/api/reports/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          frequency,
          timeOfDay,
          recipientEmails,
          templateId: templateId || null,
          format,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setTitle("");
        setRecipientEmails("");
        fetchSchedules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled report?")) return;
    try {
      await fetch(`/api/reports/schedules?id=${id}`, { method: "DELETE" });
      fetchSchedules();
    } catch (e) {
      console.error(e);
    }
  };

  const triggerTestDispatch = async () => {
    try {
      setDispatchLoading(true);
      setDispatchSuccess(null);
      const res = await fetch("/api/cron/dispatch", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setDispatchSuccess(`Successfully processed ${json.processed} scheduled report(s).`);
        fetchSchedules();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setDispatchLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Scheduled Auto-Emailed Reports</h1>
            <p className="text-xs text-slate-500">Automated business intelligence delivered directly to your inbox without logging in</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerTestDispatch}
            disabled={dispatchLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            {dispatchLoading ? "Dispatching..." : "Test Dispatch Now"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Schedule
          </button>
        </div>
      </div>

      {dispatchSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {dispatchSuccess}
        </div>
      )}

      {/* Schedules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm">
            Loading schedules...
          </div>
        ) : schedules.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            No scheduled email deliveries configured yet. Click <strong>"New Schedule"</strong> to create one.
          </div>
        ) : (
          schedules.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    {s.frequency} ({s.timeOfDay})
                  </span>
                  <button
                    onClick={() => deleteSchedule(s.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-base mt-3">{s.title}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {s.recipientEmails}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                  <div>
                    Template: <span className="font-medium text-slate-800 dark:text-slate-200">{s.template?.title || "Default Revenue Digest"}</span>
                  </div>
                  <div>
                    Format: <span className="font-mono text-[11px] font-bold text-indigo-600">{s.format}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span>Last run: {s.lastRunAt ? new Date(s.lastRunAt).toLocaleDateString() : "Never"}</span>
                <span className="text-emerald-500 font-medium">● Active</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={createSchedule}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Create Scheduled Email Report</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Report Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Revenue & Complaint Digest"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="DAILY">Daily (Every Day)</option>
                    <option value="WEEKLY">Weekly (Mondays)</option>
                    <option value="MONTHLY">Monthly (1st of month)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Time of Day</label>
                  <input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Recipient Email(s)</label>
                <input
                  type="text"
                  required
                  placeholder="owner@hvac.com, manager@hvac.com"
                  value={recipientEmails}
                  onChange={(e) => setRecipientEmails(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Report Preset (Optional)</label>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Default Revenue Digest</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.entity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Attachment Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="EXCEL">Excel (.xlsx)</option>
                    <option value="CSV">CSV (.csv)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
