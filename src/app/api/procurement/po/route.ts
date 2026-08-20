import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";
import { parsePoMetadata, formatPoNotesPayload } from "@/lib/poHelper";

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
      { poNumber: { contains: search, mode: "insensitive" } },
      { vendor: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const rawPOs = await prisma.purchaseOrder.findMany({
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

  const purchaseOrders = rawPOs.map((po) => {
    const meta = parsePoMetadata(po.notes, po);
    return {
      ...po,
      meta,
    };
  });

  return NextResponse.json({ purchaseOrders });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      poNumber: customPoNumber,
      vendorId,
      lineItems,
      status,
      discount,
      discountType = "FIXED",
      discountPercent = 0,
      isGst = false,
      taxRate = 18,
      poDate,
      deliveryDate,
      deliveryAddress,
      notes,
    } = await req.json();

    if (!vendorId || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Vendor and line items are required" }, { status: 400 });
    }

    let poNumber = customPoNumber ? customPoNumber.trim() : "";
    if (!poNumber) {
      const count = await prisma.purchaseOrder.count();
      poNumber = `PO-${10001 + count}`;
    }
    const poStatus = status || "APPROVED";

    const purchaseOrder = await prisma.$transaction(async (tx: any) => {
      let subtotalAmount = 0;
      lineItems.forEach((item: any) => {
        subtotalAmount += Math.round(parseInt(item.quantityOrdered) * Number(item.unitCost));
      });

      let finalDiscountAmount = 0;
      const dPercent = Number(discountPercent) || 0;
      if (discountType === "PERCENTAGE") {
        finalDiscountAmount = Math.round(subtotalAmount * (dPercent / 100));
      } else {
        finalDiscountAmount = Math.round(Number(discount) || 0);
      }

      const taxableAmount = Math.max(0, subtotalAmount - finalDiscountAmount);
      const tRate = Number(taxRate) || 18;
      const finalTaxAmount = isGst ? Math.round(taxableAmount * (tRate / 100)) : 0;
      const finalTotalAmount = Math.max(0, taxableAmount + finalTaxAmount);

      const notesPayload = formatPoNotesPayload({
        userNotes: notes || "",
        isGst: Boolean(isGst),
        taxRate: tRate,
        taxAmount: finalTaxAmount,
        discountType: discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        discountPercent: dPercent,
        discountAmount: finalDiscountAmount,
        subtotalAmount,
        totalAmount: finalTotalAmount,
        createdByName: session.name || "Saleem",
        deliveryAddress: deliveryAddress || "",
      });

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          vendorId,
          status: poStatus,
          discount: finalDiscountAmount,
          totalAmount: finalTotalAmount,
          notes: notesPayload,
          createdAt: poDate ? new Date(poDate) : new Date(),
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
          vendor: true,
        },
      });

      // Update product's averageCost to entered unitCost
      for (const item of lineItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            averageCost: Number(item.unitCost),
          },
        });
      }

      if (poStatus === "APPROVED" || poStatus === "SUBMITTED") {
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
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
