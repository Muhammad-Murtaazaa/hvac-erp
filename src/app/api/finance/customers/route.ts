import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "VIEW_REPORTS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Gather all customers from Invoices, DOs, Complaints, and LedgerEntries
    const [invoices, dos, complaints, ledgerEntries] = await Promise.all([
      prisma.invoice.findMany({
        select: { clientName: true, clientPhone: true, clientAddress: true, totalAmount: true, amountPaid: true, date: true },
      }),
      prisma.deliveryOrder.findMany({
        select: { clientName: true, clientPhone: true, deliveryAddress: true },
      }),
      prisma.complaint.findMany({
        select: { customerName: true, customerPhone: true, customerAddress: true },
      }),
      prisma.ledgerEntry.findMany({
        where: { partyType: "CUSTOMER" },
        select: { partyName: true, debitAccount: true, creditAccount: true, amount: true, description: true },
      }),
    ]);

    const customerMap = new Map<string, {
      name: string;
      phone: string;
      email?: string;
      address?: string;
      ntn?: string;
      totalBilled: number;
      totalPaid: number;
      balance: number;
      invoiceCount: number;
    }>();

    // Process invoices
    for (const inv of invoices) {
      const name = (inv.clientName || "").trim();
      if (!name) continue;
      const cur = customerMap.get(name) || {
        name,
        phone: inv.clientPhone || "",
        address: inv.clientAddress || "",
        totalBilled: 0,
        totalPaid: 0,
        balance: 0,
        invoiceCount: 0,
      };
      if (!cur.phone && inv.clientPhone) cur.phone = inv.clientPhone;
      if (!cur.address && inv.clientAddress) cur.address = inv.clientAddress;
      cur.totalBilled += Number(inv.totalAmount || 0);
      cur.totalPaid += Number(inv.amountPaid || 0);
      cur.invoiceCount += 1;
      customerMap.set(name, cur);
    }

    // Process DOs
    for (const d of dos) {
      const name = (d.clientName || "").trim();
      if (!name) continue;
      const cur = customerMap.get(name) || {
        name,
        phone: d.clientPhone || "",
        address: d.deliveryAddress || "",
        totalBilled: 0,
        totalPaid: 0,
        balance: 0,
        invoiceCount: 0,
      };
      if (!cur.phone && d.clientPhone) cur.phone = d.clientPhone;
      if (!cur.address && d.deliveryAddress) cur.address = d.deliveryAddress;
      customerMap.set(name, cur);
    }

    // Process Complaints
    for (const c of complaints) {
      const name = (c.customerName || "").trim();
      if (!name) continue;
      const cur = customerMap.get(name) || {
        name,
        phone: c.customerPhone || "",
        address: c.customerAddress || "",
        totalBilled: 0,
        totalPaid: 0,
        balance: 0,
        invoiceCount: 0,
      };
      if (!cur.phone && c.customerPhone) cur.phone = c.customerPhone;
      if (!cur.address && c.customerAddress) cur.address = c.customerAddress;
      customerMap.set(name, cur);
    }

    // Process Ledger entries for parties
    for (const l of ledgerEntries) {
      const name = (l.partyName || "").trim();
      if (!name) continue;
      const cur = customerMap.get(name) || {
        name,
        phone: "",
        address: "",
        totalBilled: 0,
        totalPaid: 0,
        balance: 0,
        invoiceCount: 0,
      };
      customerMap.set(name, cur);
    }

    const customers = Array.from(customerMap.values())
      .map((c) => ({
        ...c,
        balance: c.totalBilled - c.totalPaid,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ customers });
  } catch (error: any) {
    console.error("[Customers GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load customers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "MANAGE_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, phone, email, address, ntn, notes, openingBalance } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Customer Name is required" }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    // Create a voucher or ledger profile record if opening balance is specified
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
          partyName: trimmedName,
          debitAccount: "Accounts Receivable (Trade Debtors)",
          creditAccount: "Owner Equity / Capital",
          amount: opBal,
          description: `Opening receivable balance for customer ${trimmedName}${notes ? ` - ${notes}` : ""}`,
        },
      });
    } else {
      // Create a nominal registration entry so the party exists permanently in the system
      await prisma.ledgerEntry.create({
        data: {
          entryDate: new Date(),
          voucherType: "REG",
          voucherNumber: vNum,
          referenceType: "VOUCHER",
          referenceId: vNum,
          partyType: "CUSTOMER",
          partyName: trimmedName,
          debitAccount: "Accounts Receivable (Trade Debtors)",
          creditAccount: "Customer Advance Deposits",
          amount: 0,
          description: `Customer account registered: Phone: ${trimmedPhone}${address ? `, Address: ${address}` : ""}${email ? `, Email: ${email}` : ""}${ntn ? `, NTN: ${ntn}` : ""}`,
        },
      });
    }

    // Record audit log
    await recordAuditSnapshot({
      entityName: "CustomerAccount",
      entityId: trimmedName,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: { name: trimmedName, phone: trimmedPhone, email, address, ntn, openingBalance: opBal, notes },
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: trimmedName,
        name: trimmedName,
        phone: trimmedPhone,
        email: email || "",
        address: address || "",
        ntn: ntn || "",
        balance: opBal,
      },
    });
  } catch (error: any) {
    console.error("[Customers POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create customer" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "MANAGE_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { originalName, name, phone, email, address, ntn } = await req.json();

    if (!name || !name.trim() || !phone || !phone.trim()) {
      return NextResponse.json({ error: "Name and Phone are required" }, { status: 400 });
    }

    const targetName = (originalName || name).trim();
    const newName = name.trim();
    const newPhone = phone.trim();

    // Update in invoices, delivery orders, complaints, and ledger
    await Promise.all([
      prisma.invoice.updateMany({
        where: { clientName: { equals: targetName, mode: "insensitive" } },
        data: {
          clientName: newName,
          clientPhone: newPhone,
          clientAddress: address || undefined,
        },
      }),
      prisma.deliveryOrder.updateMany({
        where: { clientName: { equals: targetName, mode: "insensitive" } },
        data: {
          clientName: newName,
          clientPhone: newPhone,
          deliveryAddress: address || undefined,
        },
      }),
      prisma.complaint.updateMany({
        where: { customerName: { equals: targetName, mode: "insensitive" } },
        data: {
          customerName: newName,
          customerPhone: newPhone,
          customerAddress: address || undefined,
        },
      }),
      prisma.ledgerEntry.updateMany({
        where: { partyName: { equals: targetName, mode: "insensitive" } },
        data: {
          partyName: newName,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      customer: {
        name: newName,
        phone: newPhone,
        email: email || "",
        address: address || "",
        ntn: ntn || "",
      },
    });
  } catch (error: any) {
    console.error("[Customers PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update customer" }, { status: 500 });
  }
}
