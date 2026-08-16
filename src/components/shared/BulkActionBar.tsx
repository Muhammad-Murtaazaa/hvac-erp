"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  X,
  UserCheck,
  FileSpreadsheet,
  Trash2,
  Percent,
  Layers,
  ChevronDown,
} from "lucide-react";

export interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onAssignTech?: () => void;
  onStatusChange?: (status: string) => void;
  onBulkPriceAdjust?: (percentage: number) => void;
  onBulkExport?: () => void;
  onBulkDelete?: () => void;
  statusOptions?: { label: string; value: string }[];
}

export default function BulkActionBar({
  selectedCount,
  onClear,
  onAssignTech,
  onStatusChange,
  onBulkPriceAdjust,
  onBulkExport,
  onBulkDelete,
  statusOptions,
}: BulkActionBarProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPricePrompt, setShowPricePrompt] = useState(false);
  const [pricePercent, setPricePercent] = useState("5");

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[92%] bg-slate-900/95 dark:bg-slate-900/95 text-white p-3 px-5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-slideUp">
      {/* Left info */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xs">
          {selectedCount}
        </div>
        <span className="text-xs font-bold text-slate-200">Selected</span>
        <button
          onClick={onClear}
          className="text-[11px] text-slate-400 hover:text-white underline ml-1"
        >
          Clear
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {onAssignTech && (
          <button
            onClick={onAssignTech}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            Assign Tech
          </button>
        )}

        {statusOptions && onStatusChange && (
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Set Status
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showStatusDropdown && (
              <div className="absolute bottom-10 left-0 bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-2xl min-w-[140px] z-50">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onStatusChange(opt.value);
                      setShowStatusDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-medium text-slate-200"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {onBulkPriceAdjust && (
          <button
            onClick={() => {
              const val = prompt("Enter price adjustment percentage (e.g. 5 for +5%, -5 for -5%):", "5");
              if (val !== null && !isNaN(Number(val))) {
                onBulkPriceAdjust(Number(val));
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Percent className="w-3.5 h-3.5 text-amber-400" />
            Adjust Price %
          </button>
        )}

        {onBulkExport && (
          <button
            onClick={onBulkExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            Export Excel
          </button>
        )}

        {onBulkDelete && (
          <button
            onClick={onBulkDelete}
            className="p-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl transition-colors"
            title="Bulk Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
