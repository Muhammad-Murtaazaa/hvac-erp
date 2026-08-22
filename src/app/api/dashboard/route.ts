import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Total Sales (Month & Today)
    const monthSales = await prisma.invoice.aggregate({
      where: { date: { gte: startOfMonth } },
      _sum: { totalAmount: true },
    });
    const todaySales = await prisma.invoice.aggregate({
      where: { date: { gte: startOfToday } },
      _sum: { totalAmount: true },
    });

    // 2. Outstanding Invoices (AR)
    const arInvoices = await prisma.invoice.findMany({
      where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
    });
    const outstandingAR = arInvoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) - Number(inv.amountPaid)), 0);

    // 3. Inventory Valuation & Stock Health
    const products = await prisma.product.findMany();
    const lowStockCount = products.filter((p) => p.onHandQty <= p.reorderLevel).length;
    const totalInventoryValue = products.reduce(
      (acc, p) => acc + (Number(p.averageCost || p.salesPrice || 0) * (p.onHandQty > 0 ? p.onHandQty : 0)),
      0
    );
    const totalStockUnits = products.reduce(
      (acc, p) => acc + (p.onHandQty > 0 ? p.onHandQty : 0),
      0
    );

    // 4. Open Complaints
    const openComplaintsCount = await prisma.complaint.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    });

    // 5. Pending PO Shortfalls
    const pendingPOItemsCount = await prisma.pOPendingItem.count({
      where: { isResolved: false },
    });

    // 6. Cash Position (Cash/Bank Ledger Balance)
    const cashLedger = await prisma.ledgerEntry.findMany({
      where: {
        OR: [{ debitAccount: "Cash/Bank" }, { creditAccount: "Cash/Bank" }],
      },
    });
    let cashBalance = 0;
    cashLedger.forEach((entry) => {
      const amt = Number(entry.amount);
      if (entry.debitAccount === "Cash/Bank") cashBalance += amt;
      if (entry.creditAccount === "Cash/Bank") cashBalance -= amt;
    });

    // 7. Sales Trend (Last 7 Days)
    const salesTrendList = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

      const dayInvoices = await prisma.invoice.aggregate({
        where: { date: { gte: start, lte: end } },
        _sum: { totalAmount: true },
      });

      salesTrendList.push({
        date: targetDate.toLocaleDateString("en-US", { weekday: "short" }),
        amount: Number(dayInvoices._sum.totalAmount || 0),
      });
    }

    // 8. Top Selling Products (Aggregated)
    const invoiceLines = await prisma.invoiceLineItem.findMany({
      include: { product: true },
    });
    const productSalesMap: Record<string, { name: string; quantity: number }> = {};
    invoiceLines.forEach((line) => {
      if (line.productId && line.product) {
        const sku = line.product.sku;
        if (!productSalesMap[sku]) {
          productSalesMap[sku] = { name: line.product.name, quantity: 0 };
        }
        productSalesMap[sku].quantity += line.quantity;
      }
    });
    const topProducts = Object.entries(productSalesMap).map(([sku, data]) => ({
      sku,
      name: data.name,
      quantity: data.quantity,
    })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    // 9. Vendor Spend (PO Totals)
    const poList = await prisma.purchaseOrder.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { vendor: true },
    });
    const vendorSpendMap: Record<string, number> = {};
    poList.forEach((po) => {
      vendorSpendMap[po.vendor.name] = (vendorSpendMap[po.vendor.name] || 0) + Number(po.totalAmount);
    });
    const vendorSpend = Object.entries(vendorSpendMap).map(([vendor, amount]) => ({
      name: vendor,
      value: amount,
    }));

    // 10. Technician Workload
    const activeComplaints = await prisma.complaint.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      include: { technician: true },
    });
    const techWorkloadMap: Record<string, number> = {};
    activeComplaints.forEach((c) => {
      const name = c.technician?.name || "Unassigned";
      techWorkloadMap[name] = (techWorkloadMap[name] || 0) + 1;
    });
    const techWorkload = Object.entries(techWorkloadMap).map(([name, complaints]) => ({
      name,
      complaints,
    }));

    return NextResponse.json({
      summary: {
        totalSalesMonth: Number(monthSales._sum.totalAmount || 0),
        totalSalesToday: Number(todaySales._sum.totalAmount || 0),
        outstandingAR,
        lowStockCount,
        totalInventoryValue,
        totalStockUnits,
        openComplaintsCount,
        pendingPOItemsCount,
        cashBalance,
      },
      charts: {
        salesTrend: salesTrendList,
        topProducts,
        vendorSpend,
        techWorkload,
      },
    });
  } catch (error: any) {
    console.error("[Dashboard API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
