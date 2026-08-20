import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_PROCUREMENT") && !hasPermission(session, "MANAGE_SALES"))) {
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
      { poNumber: { contains: search } },
      { vendor: { name: { contains: search } } },
    ];
  }

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: whereClause,
    include: {
      vendor: true,
      lineItems: {
        include: {
          product: true,
        },
      },
      pendingItems: {
        include: {
          product: true,
        },
      },
      grns: {
        include: {
          lineItems: {
            include: {
              product: true,
            },
          },
          receivedBy: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ purchaseOrders });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { poNumber: customPoNumber, vendorId, lineItems, status, discount, poDate, deliveryDate, notes } = await req.json();

    if (!vendorId || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Vendor and line items are required" }, { status: 400 });
    }

    let poNumber = customPoNumber ? customPoNumber.trim() : "";
    if (!poNumber) {
      const count = await prisma.purchaseOrder.count();
      poNumber = `PO-${10001 + count}`;
    }
    const poStatus = status || "DRAFT";

    const purchaseOrder = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      lineItems.forEach((item: any) => {
        subtotal += parseInt(item.quantityOrdered) * Number(item.unitCost);
      });
      const discountVal = Number(discount) || 0;
      const totalAmount = Math.max(0, subtotal - discountVal);

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          vendorId,
          status: poStatus,
          discount: discountVal,
          totalAmount,
          notes: notes || null,
          createdAt: poDate ? new Date(poDate) : undefined,
          lineItems: {
            create: lineItems.map((item: any) => ({
              productId: item.productId,
              quantityOrdered: parseInt(item.quantityOrdered),
              unitCost: Number(item.unitCost),
              expectedDeliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
            })),
          },
        },
        include: {
          lineItems: true,
        },
      });

      // Update the product's averageCost to the newly entered price in this PO (for future auto-population)
      for (const item of lineItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            averageCost: Number(item.unitCost),
          },
        });
      }

      if (poStatus === "SUBMITTED") {
        for (const item of lineItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              incomingQty: {
                increment: parseInt(item.quantityOrdered),
              },
            },
          });
        }
      }

      return po;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "PurchaseOrder",
      entityId: purchaseOrder.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: purchaseOrder,
    });

    return NextResponse.json({ purchaseOrder });
  } catch (error: any) {
    console.error("[PO POST] Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "PO Number is already in use" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
