import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_SALES") && !hasPermission(session, "MANAGE_SUPPORT") && !hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      invoices: {
        include: {
          lineItems: {
            include: {
              product: true,
            },
          },
          payments: true,
          returns: {
            include: {
              lineItems: true,
            },
          },
        },
        orderBy: { date: "desc" },
      },
      complaints: {
        include: {
          technician: true,
          timeline: {
            include: {
              changedBy: true,
            },
            orderBy: { timestamp: "desc" },
          },
          invoice: true,
        },
        orderBy: { date: "desc" },
      },
      deliveryOrders: {
        include: {
          lineItems: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Also query any invoices/complaints matching the customer's phone or exact name where customerId was not explicitly set
  const unlinkedInvoices = await prisma.invoice.findMany({
    where: {
      customerId: null,
      OR: [
        { clientPhone: customer.phone },
        { clientName: { equals: customer.name, mode: "insensitive" } },
      ],
    },
    include: {
      lineItems: {
        include: {
          product: true,
        },
      },
      payments: true,
      returns: {
        include: {
          lineItems: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });

  const unlinkedComplaints = await prisma.complaint.findMany({
    where: {
      customerId: null,
      OR: [
        { customerPhone: customer.phone },
        { customerName: { equals: customer.name, mode: "insensitive" } },
      ],
    },
    include: {
      technician: true,
      timeline: {
        include: {
          changedBy: true,
        },
        orderBy: { timestamp: "desc" },
      },
      invoice: true,
    },
    orderBy: { date: "desc" },
  });

  const unlinkedDOs = await prisma.deliveryOrder.findMany({
    where: {
      customerId: null,
      OR: [
        { clientPhone: customer.phone },
        { clientName: { equals: customer.name, mode: "insensitive" } },
      ],
    },
    include: {
      lineItems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });

  const allInvoices = [...customer.invoices, ...unlinkedInvoices];
  const allComplaints = [...customer.complaints, ...unlinkedComplaints];
  const allDOs = [...customer.deliveryOrders, ...unlinkedDOs];

  const totalSpent = allInvoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
  const totalPaid = allInvoices.reduce((acc, inv) => acc + Number(inv.amountPaid || 0), 0);
  const outstandingBalance = Math.max(0, totalSpent - totalPaid);
  const openComplaintsCount = allComplaints.filter((comp) => comp.status !== "RESOLVED" && comp.status !== "CLOSED").length;

  return NextResponse.json({
    customer: {
      ...customer,
      invoices: allInvoices,
      complaints: allComplaints,
      deliveryOrders: allDOs,
      stats: {
        totalInvoices: allInvoices.length,
        totalSpent,
        totalPaid,
        outstandingBalance,
        totalComplaints: allComplaints.length,
        openComplaints: openComplaintsCount,
        totalDOs: allDOs.length,
      },
    },
  });
}
