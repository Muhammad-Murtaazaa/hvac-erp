"use client";

import React from "react";
import { ExternalLink, CheckCircle2, ShieldCheck } from "lucide-react";

export default function SystemInfoPage() {
  const systemDetails = [
    { label: "Application", value: "TCE ERP — Technicool Engineering" },
    { label: "Developed By", value: "OMNYSYNC", isLink: true, href: "https://omnysync.com" },
    { label: "System Version", value: "v2.4.0 (Enterprise Edition)", badge: "Stable" },
    { label: "Build Date", value: "August 19, 2026" },
    { label: "License Issued To", value: "Technicool Engineering" },
    { label: "System Status", value: "All Systems Operational", isStatus: true },
    { label: "Ledger Engine", value: "Double-Entry Synchronized" },
    { label: "Database", value: "PostgreSQL with ACID Compliance" },
    { label: "Security", value: "TLS 256-bit / Role-Based Access Control" },
  ];

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8">
      {/* Header & Brand Identity */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-2xl px-5 py-3 mb-2">
          <img src="/logo.png" alt="TCE Logo" className="h-12 w-auto object-contain" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          TCE ERP
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Enterprise Operations, Inventory & Financial Management Platform
        </p>
      </div>

      {/* Main Authoritative System Specifications Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {/* Developer Banner */}
        <div className="bg-slate-900 text-white px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
              Architecture & Engineering
            </span>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Developed by</span>
              <a
                href="https://omnysync.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 font-extrabold hover:underline"
              >
                OMNYSYNC
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <a
            href="https://omnysync.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all text-center"
          >
            <span>Visit omnysync.com</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
          </a>
        </div>

        {/* Clean Spec Rows */}
        <div className="p-6 sm:p-8 divide-y divide-slate-100 dark:divide-slate-800/80">
          {systemDetails.map((item, idx) => (
            <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-1 sm:gap-4">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {item.label}
              </span>
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                {item.isStatus && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-900">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item.value}
                  </span>
                )}
                {item.isLink && (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    {item.value}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {!item.isStatus && !item.isLink && (
                  <span>{item.value}</span>
                )}
                {item.badge && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {item.badge}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Card Footer Note */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Enterprise Security Certified</span>
          </div>
          <span>&copy; {new Date().getFullYear()} Technicool Engineering</span>
        </div>
      </div>
    </div>
  );
}
