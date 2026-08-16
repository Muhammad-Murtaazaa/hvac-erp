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
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none print:hidden">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl flex flex-col gap-2 transform transition-all duration-300 animate-slideUp backdrop-blur-md ${
              t.type === "undo"
                ? "bg-slate-950/95 border-amber-500/80 text-white"
                : t.type === "success"
                ? "bg-emerald-950/90 border-emerald-800 text-white"
                : t.type === "error"
                ? "bg-rose-950/90 border-rose-800 text-white"
                : t.type === "warning"
                ? "bg-amber-950/90 border-amber-800 text-white"
                : "bg-slate-900/90 border-slate-700 text-white"
            }`}
          >
            <div className="flex items-start gap-3">
              {t.type === "undo" && <RotateCcw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
              {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              {t.type === "warning" && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
              {t.type === "info" && <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs">{t.title}</h4>
                {t.message && <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{t.message}</p>}
              </div>

              {/* Undo action button */}
              {t.onUndo && (
                <button
                  onClick={() => {
                    t.onUndo?.();
                    removeToast(t.id);
                  }}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
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
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all"
                >
                  {t.action.label}
                </button>
              )}

              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
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
