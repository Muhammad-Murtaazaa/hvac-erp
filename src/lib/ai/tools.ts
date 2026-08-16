import prisma from "../db";

export const COPILOT_TOOLS_SCHEMA = [
  {
    name: "getFinancialSummary",
    description: "Get financial statistics: total sales revenue, paid amounts, outstanding receivables, and invoice counts for a date range.",
    parameters: {
      type: "OBJECT",
      properties: {
        startDate: { type: "STRING", description: "Start date in YYYY-MM-DD format (optional)" },
        endDate: { type: "STRING", description: "End date in YYYY-MM-DD format (optional)" },
      },
    },
  },
  {
    name: "getInventoryAlerts",
    description: "Retrieve products that are low in stock (on-hand quantity at or below the reorder level).",
    parameters: {
      type: "OBJECT",
      properties: {
        category: { type: "STRING", description: "Optional category filter" },
      },
    },
  },
  {
    name: "getTechnicianPerformance",
    description: "Retrieve technician operational metrics: active technicians, total assigned tickets, and attendance status.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "getComplaintTrends",
    description: "Retrieve statistics on customer complaints: open tickets, critical priority issues, and recent resolution rates.",
    parameters: {
      type: "OBJECT",
      properties: {
        days: { type: "INTEGER", description: "Number of past days to analyze (default 30)" },
      },
    },
  },
  {
    name: "getProcurementSummary",
    description: "Retrieve summary of purchase orders, vendor expenditures, and pending items.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
];

export async function executeTool(name: string, args: any = {}) {
  switch (name) {
    case "getFinancialSummary": {
      const where: any = {};
      if (args.startDate || args.endDate) {
        where.date = {};
        if (args.startDate) where.date.gte = new Date(args.startDate);
        if (args.endDate) where.date.lte = new Date(args.endDate);
      }

      const invoices = await prisma.invoice.findMany({ where });
      const totalRevenue = invoices.reduce((acc, inv) => acc + Number(inv.totalAmount), 0);
      const totalPaid = invoices.reduce((acc, inv) => acc + Number(inv.amountPaid), 0);
      const outstandingReceivables = totalRevenue - totalPaid;
      const unpaidCount = invoices.filter((i) => i.status === "UNPAID" || i.status === "PARTIALLY_PAID").length;

      return {
        totalInvoices: invoices.length,
        totalRevenue,
        totalCollected: totalPaid,
        outstandingReceivables,
        unpaidInvoicesCount: unpaidCount,
      };
    }

    case "getInventoryAlerts": {
      const products = await prisma.product.findMany({
        where: args.category ? { category: args.category } : undefined,
      });

      const lowStock = products.filter((p) => p.onHandQty <= p.reorderLevel);

      return {
        totalProductsChecked: products.length,
        lowStockCount: lowStock.length,
        items: lowStock.map((p) => ({
          sku: p.sku,
          name: p.name,
          category: p.category,
          onHandQty: p.onHandQty,
          reorderLevel: p.reorderLevel,
          averageCost: Number(p.averageCost),
        })),
      };
    }

    case "getTechnicianPerformance": {
      const technicians = await prisma.employee.findMany({
        where: {
          status: "ACTIVE",
          OR: [{ position: { contains: "Tech" } }, { department: { contains: "Service" } }],
        },
        include: {
          complaints: { where: { status: { not: "CLOSED" } } },
        },
      });

      return {
        activeTechniciansCount: technicians.length,
        technicians: technicians.map((t) => ({
          name: t.name,
          phone: t.phone,
          position: t.position,
          activeAssignedComplaints: t.complaints.length,
        })),
      };
    }

    case "getComplaintTrends": {
      const days = args.days || 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const complaints = await prisma.complaint.findMany({
        where: { createdAt: { gte: cutoff } },
      });

      const openCount = complaints.filter((c) => c.status !== "CLOSED" && c.status !== "RESOLVED").length;

      return {
        periodDays: days,
        totalComplaints: complaints.length,
        openComplaints: openCount,
        recentSamples: complaints.slice(0, 5).map((c) => ({
          complaintNumber: c.complaintNumber,
          customer: c.customerName,
          status: c.status,
          amountStatus: c.amountStatus,
          date: c.date,
        })),
      };
    }

    case "getProcurementSummary": {
      const pos = await prisma.purchaseOrder.findMany({
        include: { vendor: true },
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      const totalPOAmount = pos.reduce((acc, po) => acc + Number(po.totalAmount), 0);
      const pendingPOs = pos.filter((po) => po.status !== "COMPLETED" && po.status !== "CANCELLED").length;

      return {
        recentPOCount: pos.length,
        totalRecentPOSpend: totalPOAmount,
        pendingPOCount: pendingPOs,
        topVendors: Array.from(new Set(pos.map((p) => p.vendor.name))),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
