import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ vendors });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, contactPerson, phone, email, address, paymentTerms } = await req.json();

    if (!name || !contactPerson || !phone || !email) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        contactPerson,
        phone,
        email,
        address: address || "",
        paymentTerms: paymentTerms || "Net 30 Days",
      },
    });

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error("[Vendors POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
