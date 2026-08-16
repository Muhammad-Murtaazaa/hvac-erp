import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const briefings = await prisma.proactiveBriefing.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ success: true, data: briefings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // 1. Scan for open complaints
    const openComplaints = await prisma.complaint.findMany({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    });

    // 2. Scan for critical inventory shortages
    const lowStock = await prisma.product.findMany({
      where: { onHandQty: { lte: 2 } },
    });

    // 3. Scan for unpaid receivables
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { status: "UNPAID" },
    });
    const totalUnpaid = unpaidInvoices.reduce((acc, inv) => acc + Number(inv.totalAmount), 0);

    const anomalies: any[] = [];

    if (openComplaints.length > 0) {
      anomalies.push({
        type: "COMPLAINT",
        message: `${openComplaints.length} open complaint(s) require technician dispatch or resolution.`,
        items: openComplaints.map((c) => c.complaintNumber),
      });
    }

    if (lowStock.length > 0) {
      anomalies.push({
        type: "INVENTORY",
        message: `${lowStock.length} items have critically low stock (<= 2 units on hand).`,
        items: lowStock.map((p) => `${p.name} (${p.sku})`),
      });
    }

    if (totalUnpaid > 50000) {
      anomalies.push({
        type: "FINANCIAL",
        message: `High outstanding receivables detected: $${totalUnpaid.toLocaleString()} across ${unpaidInvoices.length} unpaid invoices.`,
      });
    }

    const severity = openComplaints.length > 3 ? "CRITICAL" : lowStock.length > 0 ? "WARNING" : "INFO";
    const summary = anomalies.length > 0
      ? `System scan identified ${anomalies.length} operational items needing attention.`
      : "Operations are running smoothly. All critical indicators are within normal parameters.";

    const briefing = await prisma.proactiveBriefing.create({
      data: {
        type: "DAILY_DIGEST",
        title: `Operations Briefing - ${new Date().toLocaleDateString()}`,
        summary,
        detailsJson: JSON.stringify(anomalies),
        severity,
      },
    });

    return NextResponse.json({ success: true, data: briefing, anomalies });
  } catch (error: any) {
    console.error("Briefing generator error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
