import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    orderBy: { sku: "asc" },
  });
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_INVENTORY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sku, name, category, unit, reorderLevel, averageCost } = await req.json();

    if (!sku || !name || !category || !unit || isNaN(parseInt(reorderLevel))) {
      return NextResponse.json({ error: "Required details missing" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        category,
        unit,
        reorderLevel: parseInt(reorderLevel),
        averageCost: averageCost ? Number(averageCost) : 0.00,
        onHandQty: 0,
        incomingQty: 0,
      },
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Product",
      entityId: product.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: product,
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error("[Products POST] Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Product SKU already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
