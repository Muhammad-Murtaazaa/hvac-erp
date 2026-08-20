import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_PROCUREMENT") && !hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let [vendors, ledgerEntries, purchaseOrders] = await Promise.all([
      prisma.vendor.findMany({
        include: {
          purchaseOrders: {
            select: {
              id: true,
              poNumber: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.ledgerEntry.findMany({
        where: { partyType: "VENDOR" },
        select: {
          partyName: true,
          partyId: true,
          debitAccount: true,
          creditAccount: true,
          amount: true,
          voucherType: true,
          referenceType: true,
        },
      }),
      prisma.purchaseOrder.findMany({
        select: {
          vendorId: true,
          totalAmount: true,
          status: true,
        },
      }),
    ]);

    // Check if any Ledger vendor account is missing from Vendor records
    const existingNames = new Set(vendors.map((v) => v.name.trim().toLowerCase()));
    const missingParties = new Set<string>();

    ledgerEntries.forEach((le) => {
      const name = (le.partyName || "").trim();
      if (name && !existingNames.has(name.toLowerCase())) {
        missingParties.add(name);
      }
    });

    if (missingParties.size > 0) {
      for (const pName of Array.from(missingParties)) {
        try {
          await prisma.vendor.create({
            data: {
              name: pName,
              contactPerson: "Finance Account Manager",
              phone: `0300-${Math.floor(1000000 + Math.random() * 9000000)}`,
              address: "Auto-synced from Financial Ledger",
              paymentTerms: "Net 30 Days",
            },
          });
        } catch (e) {
          console.error("Auto vendor creation error:", pName, e);
        }
      }

      vendors = await prisma.vendor.findMany({
        include: {
          purchaseOrders: {
            select: {
              id: true,
              poNumber: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    }

    // Aggregate ledger entries per vendor
    // For Vendors: Debits = Payments made (reduces payable), Credits = Bills / Purchases (increases payable)
    const ledgerMap = new Map<string, { debits: number; credits: number; entryCount: number }>();
    ledgerEntries.forEach((le) => {
      const key = (le.partyName || "").trim().toLowerCase();
      if (!key) return;
      const cur = ledgerMap.get(key) || { debits: 0, credits: 0, entryCount: 0 };
      cur.entryCount += 1;

      if (
        le.debitAccount.toLowerCase().includes("payable") ||
        le.debitAccount.toLowerCase().includes("vendor advance") ||
        le.voucherType === "CPV" ||
        le.voucherType === "BPV"
      ) {
        cur.debits += Number(le.amount || 0);
      } else {
        cur.credits += Number(le.amount || 0);
      }
      ledgerMap.set(key, cur);
    });

    const formattedVendors = vendors.map((v) => {
      const vKey = v.name.trim().toLowerCase();
      const lData = ledgerMap.get(vKey);

      const totalPOs = v.purchaseOrders.length;
      const totalPurchases = v.purchaseOrders.reduce((acc, po) => acc + Number(po.totalAmount || 0), 0);

      const debits = lData ? lData.debits : 0;
      const credits = lData ? lData.credits : totalPurchases;
      const netPayable = credits - debits;

      return {
        ...v,
        totalPOs,
        totalPurchases: Math.round(totalPurchases * 100) / 100,
        ledgerDebits: Math.round(debits * 100) / 100,
        ledgerCredits: Math.round(credits * 100) / 100,
        ledgerBalance: Math.round(netPayable * 100) / 100,
        ledgerEntryCount: lData ? lData.entryCount : 0,
      };
    });

    return NextResponse.json({ vendors: formattedVendors });
  } catch (error: any) {
    console.error("[Vendors GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load vendors" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_PROCUREMENT") && !hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, contactPerson, phone, email, ntn, address, paymentTerms } = await req.json();

    if (!name || !contactPerson || !phone) {
      return NextResponse.json({ error: "Name, Contact Person, and Phone are required" }, { status: 400 });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        contactPerson,
        phone,
        email: email ? email.trim() : null,
        ntn: ntn ? ntn.trim() : null,
        address: address || "",
        paymentTerms: paymentTerms || "Net 30 Days",
      },
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Vendor",
      entityId: vendor.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: vendor,
    });

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error("[Vendors POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_PROCUREMENT") && !hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, name, contactPerson, phone, email, ntn, address, paymentTerms } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 });
    }

    if (!name || !contactPerson || !phone) {
      return NextResponse.json({ error: "Name, Contact Person, and Phone are required" }, { status: 400 });
    }

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        name,
        contactPerson,
        phone,
        email: email ? email.trim() : null,
        ntn: ntn ? ntn.trim() : null,
        address: address || "",
        paymentTerms: paymentTerms || "Net 30 Days",
      },
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Vendor",
      entityId: updatedVendor.id,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      beforeState: existing,
      afterState: updatedVendor,
    });

    return NextResponse.json({ vendor: updatedVendor });
  } catch (error) {
    console.error("[Vendors PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
