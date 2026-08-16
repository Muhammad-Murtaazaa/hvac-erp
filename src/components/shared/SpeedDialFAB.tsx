"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  FileSpreadsheet,
  Wrench,
  Truck,
  Receipt,
  Bot,
  Sparkles,
} from "lucide-react";

export default function SpeedDialFAB() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const actions = [
    {
      label: "AI Copilot",
      icon: Sparkles,
      color: "bg-indigo-600 hover:bg-indigo-700 text-white",
      onClick: () => router.push("/copilot"),
    },
    {
      label: "New Invoice",
      icon: FileSpreadsheet,
      color: "bg-blue-600 hover:bg-blue-700 text-white",
      onClick: () => router.push("/sales?tab=invoices"),
    },
    {
      label: "New Complaint",
      icon: Wrench,
      color: "bg-emerald-600 hover:bg-emerald-700 text-white",
      onClick: () => router.push("/support"),
    },
    {
      label: "New Delivery Order",
      icon: Receipt,
      color: "bg-amber-600 hover:bg-amber-700 text-white",
      onClick: () => router.push("/sales?tab=dos"),
    },
    {
      label: "New Purchase Order",
      icon: Truck,
      color: "bg-purple-600 hover:bg-purple-700 text-white",
      onClick: () => router.push("/procurement?tab=pos"),
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5">
      {/* Expanded Action Menu */}
      {open && (
        <div className="flex flex-col items-end gap-2 mb-1 animate-slideUp">
          {actions.map((act, idx) => {
            const Icon = act.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setOpen(false);
                  act.onClick();
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl hover:scale-105 transition-all text-xs font-bold text-slate-800 dark:text-slate-100 group"
              >
                <span>{act.label}</span>
                <div className={`p-1.5 rounded-xl ${act.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Trigger FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        title="Quick Actions (+)"
        className={`w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${
          open
            ? "bg-slate-800 dark:bg-slate-700 rotate-45"
            : "bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-500/25"
        }`}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
