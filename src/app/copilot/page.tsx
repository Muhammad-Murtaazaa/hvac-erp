"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Clock,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { createLocalStorageAdapter } from "@assistant-ui/core/react";
import { Thread } from "@/components/thread";
import { ThreadList } from "@/components/thread-list";

interface Briefing {
  id: string;
  type: string;
  title: string;
  summary: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  detailsJson: string;
  createdAt: string;
}

export default function CopilotPage() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [briefingLoading, setBriefingLoading] = useState(false);

  useEffect(() => {
    fetchBriefings();
  }, []);

  const fetchBriefings = async () => {
    try {
      setBriefingLoading(true);
      const res = await fetch("/api/copilot/briefing");
      const json = await res.json();
      if (json.success) {
        setBriefings(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch briefings", err);
    } finally {
      setBriefingLoading(false);
    }
  };

  const triggerNewScan = async () => {
    try {
      setBriefingLoading(true);
      const res = await fetch("/api/copilot/briefing", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        fetchBriefings();
      }
    } catch (err) {
      console.error("Failed to generate briefing", err);
    } finally {
      setBriefingLoading(false);
    }
  };

  const customModelAdapter: ChatModelAdapter = {
    async run({ messages, abortSignal }) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== "user") {
        throw new Error("Expected user message at the end");
      }

      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: m.content.map((c) => {
          if (c.type === "text") {
            return { text: c.text };
          }
          return { text: "" };
        }),
      }));

      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: lastMessage.content.map(c => c.type === "text" ? c.text : "").join(""),
          history,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || "Unknown error");
      }

      return {
        content: [
          {
            type: "text",
            text: json.text,
          },
        ],
      };
    },
  };

  const threadListAdapter = React.useMemo(() => {
    const isClient = typeof window !== "undefined";
    return createLocalStorageAdapter({
      prefix: "hvac-copilot-threads:",
      storage: {
        async getItem(key: string) {
          return isClient ? window.localStorage.getItem(key) : null;
        },
        async setItem(key: string, value: string) {
          if (isClient) window.localStorage.setItem(key, value);
        },
        async removeItem(key: string) {
          if (isClient) window.localStorage.removeItem(key);
        }
      }
    });
  }, []);

  const runtime = useRemoteThreadListRuntime({
    adapter: threadListAdapter,
    runtimeHook: () =>
      useLocalRuntime(customModelAdapter, {
        initialMessages: [
          {
            id: "welcome",
            role: "assistant",
            content: "Hello! I am your AI Executive Copilot. I have real-time access to your HVAC database.",
          }
        ]
      })
  });

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] gap-6 p-4 max-w-7xl mx-auto">
      {/* Left Column: Proactive Briefings & Anomalies */}
      <div className="lg:w-1/3 flex flex-col gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white text-base">Proactive Briefings</h2>
                <p className="text-xs text-slate-500">Real-time anomaly scanner</p>
              </div>
            </div>
            <button
              onClick={triggerNewScan}
              disabled={briefingLoading}
              title="Run New Anomaly Scan"
              className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${briefingLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pt-4 space-y-3 pr-1">
            {briefings.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No briefings generated yet. Click the refresh button to run a live scan.
              </div>
            ) : (
              briefings.map((b) => {
                let anomalies: any[] = [];
                try {
                  anomalies = JSON.parse(b.detailsJson);
                } catch (e) {}

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.severity === "CRITICAL"
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                            : b.severity === "WARNING"
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {b.severity}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{b.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{b.summary}</p>

                    {anomalies.length > 0 && (
                      <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        {anomalies.map((a, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{a.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Column: AI Interactive Copilot Chat via assistant-ui */}
      <div className="lg:w-2/3 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden h-[calc(100vh-112px)]">
        <AssistantRuntimeProvider runtime={runtime}>
          <div className="flex h-full divide-x divide-slate-200 dark:divide-slate-800">
            {/* Sidebar: Chat History */}
            <div className="w-56 shrink-0 p-3 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto hidden md:block border-r border-slate-100 dark:border-slate-800">
              <ThreadList />
            </div>
            {/* Main Chat Thread */}
            <div className="flex-1 overflow-hidden h-full">
              <Thread />
            </div>
          </div>
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}
