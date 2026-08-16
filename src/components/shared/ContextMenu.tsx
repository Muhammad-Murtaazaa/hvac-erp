"use client";

import React, { useEffect, useState } from "react";
import { Copy, CheckCircle2, History, ExternalLink, Printer } from "lucide-react";

export interface ContextMenuItem {
  label: string;
  icon?: any;
  onClick: () => void;
  danger?: boolean;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: ContextMenuItem[];
}

export default function ContextMenu({ x, y, onClose, items }: ContextMenuProps) {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Prevent overflowing window bounds
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 36 + 20));

  return (
    <div
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 min-w-[180px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl animate-fadeIn"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <button
            key={idx}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold transition-colors ${
              item.danger
                ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {Icon && <Icon className="w-4 h-4 text-slate-400" />}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
