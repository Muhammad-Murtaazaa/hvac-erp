import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_PROCUREMENT") && !hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ vendors });
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
