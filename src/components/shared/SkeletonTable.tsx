"use client";

import React from "react";

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export default function SkeletonTable({ rows = 6, columns = 6, className = "" }: SkeletonTableProps) {
  return (
    <div className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs animate-pulse ${className}`}>
      {/* Header Skeleton */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md flex-1" />
        ))}
      </div>

      {/* Rows Skeleton */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="p-3.5 flex gap-4 items-center">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-md flex-1"
                style={{ width: `${(cIdx % 3 + 1) * 25}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs animate-pulse space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-1/3" />
        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>
      <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded-lg w-2/3" />
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-1/2" />
    </div>
  );
}

export function SkeletonPage({
  cardsCount = 4,
  tableRows = 6,
  tableCols = 6,
}: {
  cardsCount?: number;
  tableRows?: number;
  tableCols?: number;
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header bar skeleton */}
      <div className="flex justify-between items-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse">
        <div className="space-y-2">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-48" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-64" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards skeleton */}
      {cardsCount > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(cardsCount, 4)} gap-4`}>
          {Array.from({ length: cardsCount }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Table skeleton */}
      <SkeletonTable rows={tableRows} columns={tableCols} />
    </div>
  );
}

export function SkeletonDocument() {
  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 shadow-xl animate-pulse space-y-6">
      <div className="flex justify-between items-start pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-60" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-40" />
        </div>
        <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 ml-auto" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2 ml-auto" />
        </div>
      </div>

      <div className="space-y-3 pt-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>
    </div>
  );
}
