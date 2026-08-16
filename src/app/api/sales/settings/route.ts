import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const taxSetting = await prisma.systemSetting.findUnique({
      where: { key: "salesTaxRate" },
    });
    const salesTaxRate = taxSetting ? Number(taxSetting.value) : 18;
    return NextResponse.json({ salesTaxRate });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { salesTaxRate } = await req.json();
    if (salesTaxRate === undefined || isNaN(Number(salesTaxRate)) || Number(salesTaxRate) < 0) {
      return NextResponse.json({ error: "Invalid tax rate" }, { status: 400 });
    }

    await prisma.systemSetting.upsert({
      where: { key: "salesTaxRate" },
      update: { value: String(Number(salesTaxRate)) },
      create: { key: "salesTaxRate", value: String(Number(salesTaxRate)) },
    });

    return NextResponse.json({ success: true, salesTaxRate: Number(salesTaxRate) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
