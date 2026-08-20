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

  let [customers, ledgerEntries] = await Promise.all([
    prisma.customer.findMany({
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
    }),
    prisma.ledgerEntry.findMany({
      where: { partyType: "CUSTOMER" },
      select: {
        partyName: true,
        partyId: true,
        debitAccount: true,
        creditAccount: true,
        amount: true,
        voucherType: true,
      },
    }),
  ]);

  // Check if any Ledger / Financial customer account is missing from Customer records
  const existingNames = new Set(customers.map((c) => c.name.trim().toLowerCase()));
  const missingParties = new Map<string, { phone?: string; address?: string }>();

  ledgerEntries.forEach((le) => {
    const name = (le.partyName || "").trim();
    if (name && !existingNames.has(name.toLowerCase())) {
      if (!missingParties.has(name.toLowerCase())) {
        missingParties.set(name.toLowerCase(), {});
      }
    }
  });

  if (missingParties.size > 0) {
    const [sampleInvs, sampleComps, sampleDos] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          clientName: { in: Array.from(missingParties.keys()), mode: "insensitive" },
        },
        select: { clientName: true, clientPhone: true, clientAddress: true },
      }),
      prisma.complaint.findMany({
        where: {
          customerName: { in: Array.from(missingParties.keys()), mode: "insensitive" },
        },
        select: { customerName: true, customerPhone: true, customerAddress: true },
      }),
      prisma.deliveryOrder.findMany({
        where: {
          clientName: { in: Array.from(missingParties.keys()), mode: "insensitive" },
        },
        select: { clientName: true, clientPhone: true, deliveryAddress: true },
      }),
    ]);

    sampleInvs.forEach((inv) => {
      const k = (inv.clientName || "").trim().toLowerCase();
      if (missingParties.has(k)) {
        missingParties.set(k, {
          phone: inv.clientPhone || undefined,
          address: inv.clientAddress || undefined,
        });
      }
    });

    sampleComps.forEach((comp) => {
      const k = (comp.customerName || "").trim().toLowerCase();
      if (missingParties.has(k) && !missingParties.get(k)?.phone) {
        missingParties.set(k, {
          phone: comp.customerPhone || undefined,
          address: comp.customerAddress || undefined,
        });
      }
    });

    sampleDos.forEach((d) => {
      const k = (d.clientName || "").trim().toLowerCase();
      if (missingParties.has(k) && !missingParties.get(k)?.phone) {
        missingParties.set(k, {
          phone: d.clientPhone || undefined,
          address: d.deliveryAddress || undefined,
        });
      }
    });

    for (const [lowerName, info] of Array.from(missingParties.entries())) {
      const origName = ledgerEntries.find(l => (l.partyName || "").trim().toLowerCase() === lowerName)?.partyName?.trim() || lowerName;
      const phone = info.phone || `0300-${Math.floor(1000000 + Math.random() * 9000000)}`;
      try {
        await prisma.customer.upsert({
          where: { phone },
          update: { name: origName, address: info.address || undefined },
          create: {
            name: origName,
            phone,
            address: info.address || null,
            notes: "Linked Financial Ledger Party Account",
          },
        });
      } catch (e) {
        console.error("Auto customer creation error for party:", origName, e);
      }
    }

    customers = await prisma.customer.findMany({
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
  }

  // Aggregate ledger entries per customer
  const ledgerMap = new Map<string, { debits: number; credits: number; entryCount: number }>();
  ledgerEntries.forEach((le) => {
    const key = (le.partyName || "").trim().toLowerCase();
    if (!key) return;
    const cur = ledgerMap.get(key) || { debits: 0, credits: 0, entryCount: 0 };
    cur.entryCount += 1;
    if (
      le.creditAccount.toLowerCase().includes("customer") ||
      le.creditAccount.toLowerCase().includes("receivable") ||
      le.voucherType === "CRV" ||
      le.voucherType === "BRV"
    ) {
      cur.credits += Number(le.amount || 0);
    } else {
      cur.debits += Number(le.amount || 0);
    }
    ledgerMap.set(key, cur);
  });

  const formattedCustomers = customers.map((c) => {
    const totalInvoices = c.invoices.length;
    const totalSpent = c.invoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
    const totalPaid = c.invoices.reduce((acc, inv) => acc + Number(inv.amountPaid || 0), 0);
    const invoiceBalance = Math.max(0, totalSpent - totalPaid);
    const totalComplaints = c.complaints.length;
    const openComplaints = c.complaints.filter((comp) => comp.status !== "RESOLVED" && comp.status !== "CLOSED").length;

    // Financial Ledger calculations
    const custKey = (c.name || "").trim().toLowerCase();
    const lData = ledgerMap.get(custKey);
    const ledgerDebits = lData ? lData.debits : totalSpent;
    const ledgerCredits = lData ? lData.credits : totalPaid;
    const ledgerBalance = lData ? (lData.debits - lData.credits) : invoiceBalance;

    return {
      ...c,
      totalInvoices,
      totalSpent,
      totalPaid,
      outstandingBalance: invoiceBalance,
      ledgerDebits: Math.round(ledgerDebits * 100) / 100,
      ledgerCredits: Math.round(ledgerCredits * 100) / 100,
      ledgerBalance: Math.round(ledgerBalance * 100) / 100,
      ledgerEntryCount: lData ? lData.entryCount : 0,
      totalComplaints,
      openComplaints,
      totalDos: c.deliveryOrders.length,
    };
  });

  return NextResponse.json({ customers: formattedCustomers });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_SALES") && !hasPermission(session, "MANAGE_SUPPORT") && !hasPermission(session, "ADMIN") && !hasPermission(session, "MANAGE_FINANCIALS"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, phone, email, address, ntn, cnic, notes, openingBalance } = await req.json();

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

    // Create Ledger Account entry (Opening balance if provided, or nominal registration entry)
    const opBal = Number(openingBalance) || 0;
    const vNum = opBal > 0 ? `OB-CUST-${Date.now().toString().slice(-4)}` : `REG-CUST-${Date.now().toString().slice(-4)}`;
    
    if (opBal > 0) {
      await prisma.ledgerEntry.create({
        data: {
          entryDate: new Date(),
          voucherType: "OBV",
          voucherNumber: vNum,
          referenceType: "ADVANCE",
          referenceId: vNum,
          partyType: "CUSTOMER",
          partyId: customer.id,
          partyName: cleanName,
          debitAccount: "Accounts Receivable (Trade Debtors)",
          creditAccount: "Owner Equity / Capital",
          amount: opBal,
          description: `Opening receivable balance for customer ${cleanName}${notes ? ` - ${notes}` : ""}`,
        },
      });
    } else {
      await prisma.ledgerEntry.create({
        data: {
          entryDate: new Date(),
          voucherType: "REG",
          voucherNumber: vNum,
          referenceType: "VOUCHER",
          referenceId: vNum,
          partyType: "CUSTOMER",
          partyId: customer.id,
          partyName: cleanName,
          debitAccount: "Accounts Receivable (Trade Debtors)",
          creditAccount: "Customer Advance Deposits",
          amount: 0,
          description: `Customer account registered: Phone: ${cleanPhone}${address ? `, Address: ${address}` : ""}`,
        },
      });
    }

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
  if (!session || (!hasPermission(session, "MANAGE_SALES") && !hasPermission(session, "MANAGE_SUPPORT") && !hasPermission(session, "ADMIN") && !hasPermission(session, "MANAGE_FINANCIALS"))) {
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

    // Update in party ledger and invoices
    await Promise.all([
      prisma.ledgerEntry.updateMany({
        where: {
          OR: [
            { partyId: id },
            { partyName: { equals: existing.name, mode: "insensitive" } },
          ],
        },
        data: { partyName: cleanName },
      }),
      prisma.invoice.updateMany({
        where: {
          OR: [
            { customerId: id },
            { clientName: { equals: existing.name, mode: "insensitive" } },
          ],
        },
        data: { clientName: cleanName, clientPhone: cleanPhone, clientAddress: address || undefined },
      }),
    ]);

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
