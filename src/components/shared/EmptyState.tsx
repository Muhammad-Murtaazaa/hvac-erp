"use client";

import React from "react";
import { FolderOpen, Plus, Sparkles, LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`p-10 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl ${className}`}
    >
      <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-3.5 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">{description}</p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
