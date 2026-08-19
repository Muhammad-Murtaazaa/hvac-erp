import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Shell from "@/components/layout/Shell";

export const metadata: Metadata = {
  title: "TCE ERP - Enterprise Operations & Management",
  description: "Total Cooling & Engineering ledger-synchronized service, inventory, and billing platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans">Loading TCE ERP...</div>}>
          <Shell>{children}</Shell>
        </Suspense>
      </body>
    </html>
  );
}
