import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, customers: [] });
    }

    // Search across Customer records, LedgerEntries, complaints and invoices
    const [customersDb, ledgerParties, complaints, invoices] = await Promise.all([
      prisma.customer.findMany({
        where: {
          OR: [
            { phone: { contains: query } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 15,
      }),
      prisma.ledgerEntry.findMany({
        where: {
          partyType: "CUSTOMER",
          partyName: { contains: query, mode: "insensitive" },
        },
        select: { partyName: true, partyId: true, description: true },
        take: 15,
      }),
      prisma.complaint.findMany({
        where: {
          OR: [
            { customerPhone: { contains: query } },
            { customerName: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.invoice.findMany({
        where: {
          OR: [
            { clientPhone: { contains: query } },
            { clientName: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Aggregate unique customer profiles
    const customerMap = new Map<string, {
      name: string;
      phone: string;
      address: string;
      email?: string;
      ntn?: string;
      totalComplaints: number;
      totalInvoices: number;
      lastServiceDate?: string;
      lastNotes?: string;
    }>();

    for (const c of customersDb) {
      const key = (c.phone || c.name).toLowerCase().trim();
      customerMap.set(key, {
        name: c.name,
        phone: c.phone,
        address: c.address || "",
        email: c.email || undefined,
        ntn: c.ntn || undefined,
        totalComplaints: 0,
        totalInvoices: 0,
        lastNotes: c.notes || undefined,
      });
    }

    for (const lp of ledgerParties) {
      if (!lp.partyName) continue;
      const key = lp.partyName.toLowerCase().trim();
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: lp.partyName,
          phone: "",
          address: "",
          totalComplaints: 0,
          totalInvoices: 0,
          lastNotes: lp.description || "Financial Ledger Account",
        });
      }
    }

    for (const c of complaints) {
      const key = (c.customerPhone || c.customerName).toLowerCase().trim();
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: c.customerName,
          phone: c.customerPhone,
          address: c.customerAddress,
          totalComplaints: 1,
          totalInvoices: 0,
          lastServiceDate: c.createdAt.toISOString().split("T")[0],
          lastNotes: c.description,
        });
      } else {
        const item = customerMap.get(key)!;
        item.totalComplaints += 1;
      }
    }

    for (const inv of invoices) {
      const key = (inv.clientPhone || inv.clientName).toLowerCase().trim();
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: inv.clientName,
          phone: inv.clientPhone || "",
          address: inv.clientAddress || "",
          totalComplaints: 0,
          totalInvoices: 1,
          lastServiceDate: inv.date.toISOString().split("T")[0],
          lastNotes: inv.notes || "",
        });
      } else {
        const item = customerMap.get(key)!;
        item.totalInvoices += 1;
        if (!item.address && inv.clientAddress) {
          item.address = inv.clientAddress;
        }
      }
    }

    return NextResponse.json({
      success: true,
      customers: Array.from(customerMap.values()),
    });
  } catch (error: any) {
    console.error("Customer lookup error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
