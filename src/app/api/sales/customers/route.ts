import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_SALES") && !hasPermission(session, "MANAGE_SUPPORT") && !hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const whereClause: any = {};
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { cnic: { contains: search } },
      { ntn: { contains: search } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where: whereClause,
    include: {
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          amountPaid: true,
          status: true,
          date: true,
        },
      },
      complaints: {
        select: {
          id: true,
          complaintNumber: true,
          status: true,
          amount: true,
          amountStatus: true,
          date: true,
        },
      },
      deliveryOrders: {
        select: {
          id: true,
          doNumber: true,
          status: true,
          date: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedCustomers = customers.map((c) => {
    const totalInvoices = c.invoices.length;
    const totalSpent = c.invoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
    const totalPaid = c.invoices.reduce((acc, inv) => acc + Number(inv.amountPaid || 0), 0);
    const outstandingBalance = Math.max(0, totalSpent - totalPaid);
    const totalComplaints = c.complaints.length;
    const openComplaints = c.complaints.filter((comp) => comp.status !== "RESOLVED" && comp.status !== "CLOSED").length;

    return {
      ...c,
      totalInvoices,
      totalSpent,
      totalPaid,
      outstandingBalance,
      totalComplaints,
      openComplaints,
      totalDos: c.deliveryOrders.length,
    };
  });

  return NextResponse.json({ customers: formattedCustomers });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_SALES") && !hasPermission(session, "MANAGE_SUPPORT") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, phone, email, address, ntn, cnic, notes } = await req.json();

    if (!name || !name.trim() || !phone || !phone.trim()) {
      return NextResponse.json({ error: "Customer name and phone number are required" }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanName = name.trim();

    // Check if phone already exists
    const existing = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
    });

    if (existing) {
      return NextResponse.json({ error: `Customer with phone number "${cleanPhone}" already exists (${existing.name}).`, customer: existing }, { status: 409 });
    }

    const customer = await prisma.customer.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        ntn: ntn ? ntn.trim() : null,
        cnic: cnic ? cnic.trim() : null,
        notes: notes ? notes.trim() : null,
      },
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Customer",
      entityId: customer.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: customer,
    });

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error("[Customer POST] Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Customer with this phone number already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_SALES") && !hasPermission(session, "MANAGE_SUPPORT") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, name, phone, email, address, ntn, cnic, notes } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    if (!name || !name.trim() || !phone || !phone.trim()) {
      return NextResponse.json({ error: "Customer name and phone number are required" }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const cleanPhone = phone.trim();
    const cleanName = name.trim();

    // Check if phone conflict exists with another customer
    if (cleanPhone !== existing.phone) {
      const phoneConflict = await prisma.customer.findUnique({ where: { phone: cleanPhone } });
      if (phoneConflict && phoneConflict.id !== id) {
        return NextResponse.json({ error: `Phone number "${cleanPhone}" is already assigned to ${phoneConflict.name}.` }, { status: 400 });
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: cleanName,
        phone: cleanPhone,
        email: email !== undefined ? (email ? email.trim() : null) : existing.email,
        address: address !== undefined ? (address ? address.trim() : null) : existing.address,
        ntn: ntn !== undefined ? (ntn ? ntn.trim() : null) : existing.ntn,
        cnic: cnic !== undefined ? (cnic ? cnic.trim() : null) : existing.cnic,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      },
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Customer",
      entityId: updated.id,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      beforeState: existing,
      afterState: updated,
    });

    return NextResponse.json({ customer: updated });
  } catch (error: any) {
    console.error("[Customer PUT] Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Customer with this phone number already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_SALES") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Safely nullify customerId references in invoices, complaints, DOs
    await prisma.$transaction(async (tx) => {
      await tx.invoice.updateMany({
        where: { customerId: id },
        data: { customerId: null },
      });
      await tx.complaint.updateMany({
        where: { customerId: id },
        data: { customerId: null },
      });
      await tx.deliveryOrder.updateMany({
        where: { customerId: id },
        data: { customerId: null },
      });
      await tx.customer.delete({ where: { id } });
    });

    await recordAuditSnapshot({
      entityName: "Customer",
      entityId: id,
      action: "DELETE",
      actor: { id: session.id, email: session.email },
      beforeState: existing,
    });

    return NextResponse.json({ success: true, message: `Customer "${existing.name}" deleted successfully.` });
  } catch (error: any) {
    console.error("[Customer DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
