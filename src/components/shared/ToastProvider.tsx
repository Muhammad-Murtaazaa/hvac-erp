"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X, RotateCcw } from "lucide-react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type?: "success" | "error" | "info" | "warning" | "undo";
  duration?: number;
  action?: ToastAction;
  onUndo?: () => void;
}

interface ToastContextType {
  toast: (options: Omit<Toast, "id">) => void;
  undoToast: (title: string, onUndo: () => void, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({
    title,
    message,
    type = "success",
    duration = 4000,
    action,
    onUndo,
  }: Omit<Toast, "id">) => {
    const id = Date.now().toString() + Math.random().toString();
    const newToast: Toast = { id, title, message, type, duration, action, onUndo };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const undoToast = (title: string, onUndo: () => void, duration = 6000) => {
    toast({
      title,
      type: "undo",
      duration,
      onUndo,
    });
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast, undoToast }}>
      {children}
      {/* Modern High-End Glassmorphic Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none print:hidden">
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";
          const isWarning = t.type === "warning";
          const isUndo = t.type === "undo";
          const isInfo = !isSuccess && !isError && !isWarning && !isUndo;

          return (
            <div
              key={t.id}
              className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-2.5 transform transition-all duration-300 animate-slideUp relative overflow-hidden group"
            >
              {/* Top subtle accent bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  isSuccess
                    ? "bg-emerald-500"
                    : isError
                    ? "bg-rose-500"
                    : isWarning
                    ? "bg-amber-500"
                    : isUndo
                    ? "bg-indigo-500"
                    : "bg-blue-500"
                }`}
              />

              <div className="flex items-start gap-3 pt-0.5">
                {/* Icon Badge */}
                <div
                  className={`p-2 rounded-xl shrink-0 flex items-center justify-center ${
                    isSuccess
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : isError
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                      : isWarning
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                      : isUndo
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                      : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                  }`}
                >
                  {isUndo && <RotateCcw className="w-4 h-4" />}
                  {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                  {isError && <AlertCircle className="w-4 h-4" />}
                  {isWarning && <AlertCircle className="w-4 h-4" />}
                  {isInfo && <Info className="w-4 h-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t.title}</h4>
                  {t.message && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {t.message}
                    </p>
                  )}
                </div>

                {/* Undo action button */}
                {t.onUndo && (
                  <button
                    onClick={() => {
                      t.onUndo?.();
                      removeToast(t.id);
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
                  >
                    Undo
                  </button>
                )}

                {t.action && !t.onUndo && (
                  <button
                    onClick={() => {
                      t.action?.onClick();
                      removeToast(t.id);
                    }}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all shrink-0"
                  >
                    {t.action.label}
                  </button>
                )}

                {/* Close X button */}
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
