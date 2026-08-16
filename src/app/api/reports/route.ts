import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "VIEW_REPORTS")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "ledger"; // ledger, pnl, valuation, aging, support, sales
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    if (type === "ledger") {
      // General Ledger Report
      const entries = await prisma.ledgerEntry.findMany({
        where: {
          entryDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { entryDate: "desc" },
      });
      return NextResponse.json({ report: entries });
    }

    if (type === "pnl") {
      // Profit & Loss Report
      const entries = await prisma.ledgerEntry.findMany({
        where: {
          entryDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      let salesRevenue = 0;
      let salesReturns = 0;
      let cogs = 0;
      let salaryExpense = 0;
      let inventoryAdjustments = 0;

      entries.forEach((e) => {
        const amt = Number(e.amount);
        // Revenue calculations
        if (e.creditAccount === "Sales Revenue") salesRevenue += amt;
        if (e.debitAccount === "Sales Revenue") salesReturns += amt; // Sales Returns

        // Expense calculations
        if (e.debitAccount === "Cost of Goods Sold") cogs += amt;
        if (e.creditAccount === "Cost of Goods Sold") cogs -= amt; // Reverse COGS (returns)

        if (e.debitAccount === "Salary Expense") salaryExpense += amt;

        if (e.debitAccount === "Inventory Adjustment Expense") inventoryAdjustments += amt;
        if (e.creditAccount === "Inventory Adjustment Expense") inventoryAdjustments -= amt;
      });

      const netSales = salesRevenue - salesReturns;
      const grossProfit = netSales - cogs;
      const totalExpenses = salaryExpense + inventoryAdjustments;
      const netProfit = grossProfit - totalExpenses;

      return NextResponse.json({
        report: {
          salesRevenue,
          salesReturns,
          netSales,
          cogs,
          grossProfit,
          salaryExpense,
          inventoryAdjustments,
          totalExpenses,
          netProfit,
        },
      });
    }

    if (type === "valuation") {
      // Stock Valuation Report
      const products = await prisma.product.findMany({
        orderBy: { sku: "asc" },
      });

      let totalValuation = 0;
      const valuationList = products.map((p) => {
        const qty = p.onHandQty;
        const avgCost = Number(p.averageCost);
        const value = qty * avgCost;
        totalValuation += value;

        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          onHandQty: qty,
          averageCost: avgCost,
          totalValue: value,
        };
      });

      return NextResponse.json({
        report: {
          totalValuation,
          items: valuationList,
        },
      });
    }

    if (type === "aging") {
      // AP and AR Aging Report
      const unpaidInvoices = await prisma.invoice.findMany({
        where: {
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
        },
      });

      const unpaidPOs = await prisma.purchaseOrder.findMany({
        where: {
          status: { in: ["SUBMITTED", "PARTIALLY_RECEIVED"] },
        },
      });

      const now = new Date();
      const arAging = { current: 0, thirty: 0, sixty: 0, ninety: 0 };
      const apAging = { current: 0, thirty: 0, sixty: 0, ninety: 0 };

      // AR Invoices Aging
      unpaidInvoices.forEach((inv) => {
        const remaining = Number(inv.totalAmount) - Number(inv.amountPaid);
        const ageInDays = Math.floor((now.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));

        if (ageInDays <= 30) arAging.current += remaining;
        else if (ageInDays <= 60) arAging.thirty += remaining;
        else if (ageInDays <= 90) arAging.sixty += remaining;
        else arAging.ninety += remaining;
      });

      // AP Purchase Orders Aging
      for (const po of unpaidPOs) {
        // Calculate remaining based on line items received vs invoiced/payable
        // In simple terms, AP is total PO value minus what is paid (we assume totalAmount is the payable)
        // Let's calculate total amount of GRNs received under this PO minus any payments.
        // For simplicity: totalAmount of PO minus the portion not received yet
        const ageInDays = Math.floor((now.getTime() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const amount = Number(po.totalAmount); // simplified as full PO payable

        if (ageInDays <= 30) apAging.current += amount;
        else if (ageInDays <= 60) apAging.thirty += amount;
        else if (ageInDays <= 90) apAging.sixty += amount;
        else apAging.ninety += amount;
      }

      return NextResponse.json({
        report: {
          accountsReceivableAging: arAging,
          accountsPayableAging: apAging,
        },
      });
    }

    if (type === "support") {
      // Support & Complaint Statistics
      const complaints = await prisma.complaint.findMany();
      const statusCounts = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 };

      complaints.forEach((c) => {
        if (c.status in statusCounts) {
          statusCounts[c.status as keyof typeof statusCounts]++;
        }
      });

      return NextResponse.json({
        report: {
          totalComplaints: complaints.length,
          statusCounts,
        },
      });
    }

    if (type === "sales") {
      // Invoiced Sales report by product/client
      const invoices = await prisma.invoice.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          lineItems: {
            include: {
              product: true,
            },
          },
        },
      });

      let totalSalesAmount = 0;
      const salesByClient: Record<string, number> = {};
      const salesByProduct: Record<string, { name: string; amount: number; quantity: number }> = {};

      invoices.forEach((inv) => {
        const amt = Number(inv.totalAmount);
        totalSalesAmount += amt;

        salesByClient[inv.clientName] = (salesByClient[inv.clientName] || 0) + amt;

        inv.lineItems.forEach((item) => {
          const key = item.productId || "service-charge";
          const name = item.product ? item.product.name : (item.description || "Service Work");
          const lineTotal = item.quantity * Number(item.salesPrice);

          if (!salesByProduct[key]) {
            salesByProduct[key] = { name, amount: 0, quantity: 0 };
          }
          salesByProduct[key].amount += lineTotal;
          salesByProduct[key].quantity += item.quantity;
        });
      });

      return NextResponse.json({
        report: {
          totalSalesAmount,
          salesByClient,
          salesByProduct,
        },
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error: any) {
    console.error("[Reports API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
