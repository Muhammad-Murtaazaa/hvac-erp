import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordStockMovement } from "@/lib/ledger";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const whereClause: any = {};

  if (status) {
    whereClause.status = status;
  }

  if (search) {
    whereClause.OR = [
      { doNumber: { contains: search } },
      { clientName: { contains: search } },
      { clientPhone: { contains: search } },
    ];
  }

  const deliveryOrders = await prisma.deliveryOrder.findMany({
    where: whereClause,
    include: {
      lineItems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ deliveryOrders });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { clientName, clientPhone, deliveryAddress, lineItems, notes, status, through, vehicle, poNumber } = await req.json();

    if (!clientName || !clientPhone || !deliveryAddress || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Client details and line items are required" }, { status: 400 });
    }

    // Filter and sanitize valid line items
    const validLines = lineItems
      .filter((item: any) => item.productId || (item.description && item.description.trim()))
      .map((item: any) => {
        const qty = isNaN(parseInt(item.quantity)) ? 1 : Math.max(1, parseInt(item.quantity));
        const price = isNaN(Number(item.salesPrice)) || !item.salesPrice ? 0 : Math.round(Number(item.salesPrice));
        return {
          productId: item.productId || null,
          description: item.description ? item.description.trim() : null,
          quantity: qty,
          salesPrice: price,
          extraFields: item.extraFields ? (typeof item.extraFields === "string" ? item.extraFields : JSON.stringify(item.extraFields)) : null,
        };
      });

    if (validLines.length === 0) {
      return NextResponse.json({ error: "Please enter at least one valid line item with product or description." }, { status: 400 });
    }

    const doStatus = status || "DRAFT";
    const count = await prisma.deliveryOrder.count();
    const doNumber = `DO-${10001 + count}`;

    const deliveryOrder = await prisma.$transaction(async (tx) => {
      // Pre-fill missing descriptions for catalog products
      for (const line of validLines) {
        if (line.productId && !line.description) {
          const p = await tx.product.findUnique({ where: { id: line.productId } });
          if (p) line.description = p.name;
        }
      }

      const createdDO = await tx.deliveryOrder.create({
        data: {
          doNumber,
          date: new Date(),
          clientName,
          clientPhone,
          deliveryAddress,
          status: doStatus,
          notes: notes || "",
          through: through || "",
          vehicle: vehicle || "",
          poNumber: poNumber || null,
          lineItems: {
            create: validLines,
          },
        },
        include: {
          lineItems: true,
        },
      });

      if (doStatus === "DISPATCHED" || doStatus === "DELIVERED") {
        for (const item of createdDO.lineItems) {
          if (item.productId) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product) throw new Error("Catalog product not found");
            if (product.onHandQty < item.quantity) {
              throw new Error(`Insufficient stock for "${product.sku} - ${product.name}". Available in stock: ${product.onHandQty}, Requested: ${item.quantity}.`);
            }

            await recordStockMovement(tx, {
              productId: item.productId,
              type: "DO_DISPATCH",
              quantity: -item.quantity,
              referenceDoc: doNumber,
            });
          }
        }
      }

      return createdDO;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "DeliveryOrder",
      entityId: deliveryOrder.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: deliveryOrder,
    });

    return NextResponse.json({ deliveryOrder });
  } catch (error: any) {
    console.error("[DO POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
