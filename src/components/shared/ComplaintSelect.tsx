"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, Check, ChevronDown, Phone } from "lucide-react";

export interface ComplaintData {
  id: string;
  complaintNumber: string;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerId?: string | null;
  description: string;
  amount?: number | string | null;
  status: string;
  invoice?: any;
  [key: string]: any;
}

interface ComplaintSelectProps {
  complaints: ComplaintData[];
  selectedId: string;
  onSelect: (complaint: ComplaintData | null) => void;
  placeholder?: string;
  className?: string;
}

export default function ComplaintSelect({
  complaints = [],
  selectedId,
  onSelect,
  placeholder = "Search or type ticket #, customer, phone, or issue...",
  className = "",
}: ComplaintSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find currently selected complaint
  const selectedComplaint = complaints.find((c) => c.id === selectedId);

  // Synchronize search text when selection changes externally
  useEffect(() => {
    if (selectedComplaint) {
      setSearchQuery(
        `${selectedComplaint.complaintNumber} - ${selectedComplaint.customerName}`
      );
    } else {
      setSearchQuery("");
    }
  }, [selectedId, selectedComplaint]);

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedComplaint) {
          setSearchQuery(
            `${selectedComplaint.complaintNumber} - ${selectedComplaint.customerName}`
          );
        } else {
          setSearchQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedComplaint]);

  // Filter available complaints (exclude those already invoiced unless it's currently selected)
  const availableComplaints = complaints.filter(
    (c) => !c.invoice || c.id === selectedId
  );

  const filtered = availableComplaints.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const ticket = (c.complaintNumber || "").toLowerCase();
    const name = (c.customerName || "").toLowerCase();
    const phone = (c.customerPhone || "").toLowerCase();
    const desc = (c.description || "").toLowerCase();
    const status = (c.status || "").toLowerCase();
    return (
      ticket.includes(q) ||
      name.includes(q) ||
      phone.includes(q) ||
      desc.includes(q) ||
      status.includes(q)
    );
  });

  const handleSelectComplaint = (comp: ComplaintData | null) => {
    if (!comp) {
      onSelect(null);
      setSearchQuery("");
    } else {
      onSelect(comp);
      setSearchQuery(`${comp.complaintNumber} - ${comp.customerName}`);
    }
    setIsOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "OPEN") {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
    if (s === "IN_PROGRESS" || s === "IN PROGRESS") {
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    }
    if (s === "RESOLVED" || s === "COMPLETED") {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    }
    if (s === "CLOSED") {
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800";
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
              inputRef.current?.blur();
            }
          }}
          className="w-full pl-9 pr-16 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 text-slate-900 dark:text-slate-100 transition-all shadow-sm"
        />
        <Search className="w-3.5 h-3.5 text-blue-500 absolute left-3 pointer-events-none" />

        <div className="absolute right-2.5 flex items-center gap-1">
          {selectedId || searchQuery ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectComplaint(null);
                inputRef.current?.focus();
              }}
              title="Clear selection"
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 animate-fadeIn text-xs">
          {/* Standard sale option (clear) */}
          <button
            type="button"
            onClick={() => handleSelectComplaint(null)}
            className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between transition-colors ${
              !selectedId ? "bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <span>-- No linked complaint ticket (Standard Sale) --</span>
            </div>
            {!selectedId && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
          </button>

          {filtered.map((comp) => {
            const isSelected = comp.id === selectedId;
            const amountVal = Number(comp.amount || 0);

            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => handleSelectComplaint(comp)}
                className={`w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 flex items-start justify-between gap-3 transition-colors ${
                  isSelected ? "bg-blue-50/90 dark:bg-blue-950/60 border-l-4 border-blue-500" : ""
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800/60 text-[11px]">
                      {comp.complaintNumber}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      {comp.customerName}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getStatusBadge(
                        comp.status
                      )}`}
                    >
                      {comp.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {comp.description}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                    {comp.customerPhone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-2.5 h-2.5" />
                        {comp.customerPhone}
                      </span>
                    )}
                    {amountVal > 0 ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        PKR {amountVal.toLocaleString()}
                      </span>
                    ) : (
                      <span className="font-mono text-slate-400">PKR 0</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pt-0.5">
                  {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-4 text-center text-slate-400">
              <p className="font-medium">No matching complaints found</p>
              <p className="text-[10px] mt-0.5 text-slate-400">Try searching by ticket #, customer name, phone, or issue description</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
