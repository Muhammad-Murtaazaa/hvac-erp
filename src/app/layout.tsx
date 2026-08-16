import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Shell from "@/components/layout/Shell";

export const metadata: Metadata = {
  title: "HVAC Service & Trading ERP",
  description: "Cloud-hosted, ledger-synchronized service and billing management platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-sans">Loading HVAC ERP...</div>}>
          <Shell>{children}</Shell>
        </Suspense>
      </body>
    </html>
  );
}
