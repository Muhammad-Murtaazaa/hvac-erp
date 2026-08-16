"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  FileSpreadsheet,
  Box,
  Bot,
  Sparkles,
} from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/" || pathname.startsWith("/auth/reset-password") || pathname.includes("/pdf")) {
    return null;
  }

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Jobs", href: "/support", icon: Wrench },
    { label: "Sales", href: "/sales", icon: FileSpreadsheet },
    { label: "Stock", href: "/inventory", icon: Box },
    { label: "Copilot", href: "/copilot", icon: Sparkles },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md px-2 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);

        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
              active
                ? "text-indigo-600 dark:text-indigo-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
