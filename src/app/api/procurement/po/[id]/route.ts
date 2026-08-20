import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";
import { parsePoMetadata, formatPoNotesPayload } from "@/lib/poHelper";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_PROCUREMENT") && !hasPermission(session, "MANAGE_SALES"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
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
  });

  if (!po) {
    return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
  }

  const meta = parsePoMetadata(po.notes, po);

  return NextResponse.json({
    purchaseOrder: {
      ...po,
      meta,
    },
  });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body; // "submit", "cancel", or full edit fields

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        lineItems: true,
        vendor: true,
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    // 1. Status action mode (submit / cancel)
    if (action === "submit" || action === "cancel") {
      if (po.status !== "DRAFT" && action === "submit") {
        return NextResponse.json({ error: "Only draft POs can be submitted" }, { status: 400 });
      }

      const updatedPO = await prisma.$transaction(async (tx: any) => {
        let finalStatus = po.status;

        if (action === "submit") {
          finalStatus = "SUBMITTED";

          // Increment incomingQty for all line items
          for (const item of po.lineItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                incomingQty: {
                  increment: item.quantityOrdered,
                },
              },
            });
          }
        } else if (action === "cancel") {
          finalStatus = "CANCELLED";

          // Revert incoming quantities if previously SUBMITTED
          if (po.status === "SUBMITTED") {
            for (const item of po.lineItems) {
              const remaining = Math.max(0, item.quantityOrdered - item.quantityReceived);
              if (remaining > 0) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    incomingQty: {
                      decrement: remaining,
                    },
                  },
                });
              }
            }
          }
        }

        return await tx.purchaseOrder.update({
          where: { id: params.id },
          data: {
            status: finalStatus,
          },
          include: {
            lineItems: {
              include: { product: true },
            },
            vendor: true,
          },
        });
      }, {
        maxWait: 15000,
        timeout: 30000,
      });

      await recordAuditSnapshot({
        entityName: "PurchaseOrder",
        entityId: params.id,
        action: "UPDATE",
        actor: { id: session.id, email: session.email },
        beforeState: po,
        afterState: updatedPO,
      });

      return NextResponse.json({ purchaseOrder: updatedPO });
    }

    // 2. Full PO Edit Mode
    const {
      vendorId,
      lineItems,
      discount,
      discountType = "FIXED",
      discountPercent = 0,
      isGst = false,
      taxRate = 18,
      poDate,
      deliveryDate,
      notes,
      status: requestedStatus,
    } = body;

    if (!vendorId || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Vendor and line items are required" }, { status: 400 });
    }

    if (po.status === "COMPLETED") {
      return NextResponse.json({ error: "Completed POs cannot be edited" }, { status: 400 });
    }

    const updatedPO = await prisma.$transaction(async (tx: any) => {
      // Revert old incomingQty if previously SUBMITTED
      if (po.status === "SUBMITTED") {
        for (const item of po.lineItems) {
          const remaining = Math.max(0, item.quantityOrdered - item.quantityReceived);
          if (remaining > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                incomingQty: {
                  decrement: remaining,
                },
              },
            });
          }
        }
      }

      // Compute pricing
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

      const existingMeta = parsePoMetadata(po.notes, po);
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
        createdByName: existingMeta.createdByName || session.name || "Saleem",
      });

      const nextStatus = requestedStatus || po.status;

      // Delete existing line items
      await tx.pOLineItem.deleteMany({
        where: { poId: params.id },
      });

      // Update PO
      const res = await tx.purchaseOrder.update({
        where: { id: params.id },
        data: {
          vendorId,
          discount: finalDiscountAmount,
          totalAmount: finalTotalAmount,
          notes: notesPayload,
          status: nextStatus,
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
          lineItems: {
            include: { product: true },
          },
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

      // If next status is SUBMITTED, add new incoming quantities
      if (nextStatus === "SUBMITTED") {
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

      return res;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "PurchaseOrder",
      entityId: params.id,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      beforeState: po,
      afterState: updatedPO,
    });

    return NextResponse.json({ purchaseOrder: updatedPO });
  } catch (error: any) {
    console.error("[PO PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
