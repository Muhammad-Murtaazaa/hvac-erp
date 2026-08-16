"use client";

import React, { useState } from "react";
import { Search, Calendar, Filter, X } from "lucide-react";

interface StatusOption {
  label: string;
  value: string;
}

interface SearchFilterProps {
  placeholder?: string;
  search: string;
  onSearchChange: (value: string) => void;
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: StatusOption[];
  showDateFilter?: boolean;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (start: string, end: string) => void;
}

export default function SearchFilter({
  placeholder = "Search...",
  search,
  onSearchChange,
  status = "",
  onStatusChange,
  statusOptions = [],
  showDateFilter = false,
  startDate = "",
  endDate = "",
  onDateRangeChange,
}: SearchFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClear = () => {
    onSearchChange("");
    if (onStatusChange) onStatusChange("");
    if (onDateRangeChange) onDateRangeChange("", "");
  };

  const hasActiveFilters = search || status || startDate || endDate;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm mb-6 transition-all duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Text Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Dynamic Filters Area */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          {onStatusChange && statusOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">Status:</span>
              <select
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
              >
                <option value="">All Statuses</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date toggle or filters */}
          {showDateFilter && onDateRangeChange && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-2 rounded-lg border text-sm flex items-center gap-2 transition-all ${
                  isExpanded || startDate || endDate
                    ? "border-blue-500 text-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Date Range</span>
              </button>
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-xs font-semibold transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-950"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Expanded Date filters */}
      {showDateFilter && onDateRangeChange && isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 animate-fadeIn">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={startDate}
              onChange={(e) => onDateRangeChange(e.target.value, endDate)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={endDate}
              onChange={(e) => onDateRangeChange(startDate, e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
