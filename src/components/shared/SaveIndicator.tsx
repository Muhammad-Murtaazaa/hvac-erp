"use client";

import React from "react";
import { CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";

export interface SaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  lastSavedAt?: Date | null;
  className?: string;
}

export default function SaveIndicator({
  status,
  lastSavedAt,
  className = "",
}: SaveIndicatorProps) {
  if (status === "idle" && !lastSavedAt) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-all ${className}`}>
      {status === "saving" && (
        <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
          <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
        </span>
      )}

      {status === "saved" && (
        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fadeIn">
          <CheckCircle2 className="w-3 h-3" /> Saved{" "}
          {lastSavedAt && (
            <span className="text-slate-400 text-[10px]">
              ({lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
            </span>
          )}
        </span>
      )}

      {status === "error" && (
        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Failed to save
        </span>
      )}
    </div>
  );
}
