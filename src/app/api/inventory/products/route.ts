import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Auto-heal any legacy negative onHandQty in database
  try {
    await prisma.product.updateMany({
      where: { onHandQty: { lt: 0 } },
      data: { onHandQty: 0 },
    });
  } catch (err) {
    console.error("[Products GET] Error auto-healing negative onHandQty:", err);
  }

  const products = await prisma.product.findMany({
    orderBy: { sku: "asc" },
  });

  const sanitized = products.map((p) => ({
    ...p,
    onHandQty: Math.max(0, p.onHandQty ?? 0),
    incomingQty: Math.max(0, p.incomingQty ?? 0),
  }));

  return NextResponse.json({ products: sanitized });
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

export async function PUT(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_INVENTORY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, sku, name, category, unit, reorderLevel, averageCost, salesPrice, onHandQty } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    if (!sku || !name || !category || !unit) {
      return NextResponse.json({ error: "Required details missing" }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updateData: any = {
      sku: sku.trim(),
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      reorderLevel: isNaN(parseInt(reorderLevel)) ? existing.reorderLevel : Math.max(0, parseInt(reorderLevel)),
      averageCost: averageCost !== undefined && !isNaN(Number(averageCost)) ? Math.max(0, Number(averageCost)) : existing.averageCost,
    };

    if (salesPrice !== undefined && !isNaN(Number(salesPrice))) {
      updateData.salesPrice = Math.max(0, Number(salesPrice));
    }

    if (onHandQty !== undefined && !isNaN(parseInt(onHandQty))) {
      updateData.onHandQty = Math.max(0, parseInt(onHandQty));
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Product",
      entityId: updated.id,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      beforeState: existing,
      afterState: updated,
    });

    return NextResponse.json({ product: updated });
  } catch (error: any) {
    console.error("[Products PUT] Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Product SKU already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
