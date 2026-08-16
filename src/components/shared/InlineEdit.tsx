"use client";

import React, { useState } from "react";
import { Check, Edit2 } from "lucide-react";

export interface InlineEditProps {
  value: string | number;
  onSave: (newValue: string) => Promise<void> | void;
  type?: "text" | "number";
  className?: string;
}

export default function InlineEdit({ value, onSave, type = "text", className = "" }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(String(value));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (currentValue === String(value)) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await onSave(currentValue);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className={`group flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition-colors ${className}`}
        title="Click to edit inline"
      >
        <span>{value}</span>
        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type={type}
        autoFocus
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setCurrentValue(String(value));
            setIsEditing(false);
          }
        }}
        onBlur={handleSave}
        disabled={saving}
        className="px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[120px]"
      />
      {saving && <span className="text-[9px] text-slate-400">Saving...</span>}
    </div>
  );
}
