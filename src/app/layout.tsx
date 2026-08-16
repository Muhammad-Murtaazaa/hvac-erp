import type { Metadata } from "next";
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
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
