"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, CheckCircle2, X } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              variant === "danger"
                ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                : variant === "warning"
                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
            }`}
          >
            {variant === "danger" ? (
              <Trash2 className="w-6 h-6" />
            ) : variant === "warning" ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md ${
              variant === "danger"
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                : variant === "warning"
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
            } disabled:opacity-50`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
