import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordStockMovement } from "@/lib/ledger";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const doRecord = await prisma.deliveryOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        lineItems: {
          include: {
            product: true,
          },
        },
        invoices: {
          select: {
            notes: true,
          },
        },
        attachments: true,
      },
    });

    if (!doRecord) {
      return NextResponse.json({ error: "Delivery Order not found" }, { status: 404 });
    }

    return NextResponse.json({ deliveryOrder: doRecord });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      customerId: inputCustomerId,
      clientName,
      clientPhone,
      deliveryAddress,
      lineItems,
      notes,
      status,
      through,
      vehicle,
      poNumber,
    } = body;

    const existingDO = await prisma.deliveryOrder.findUnique({
      where: { id: params.id },
      include: {
        lineItems: true,
      },
    });

    if (!existingDO) {
      return NextResponse.json({ error: "Delivery Order not found" }, { status: 404 });
    }

    const finalClientName = (clientName || "").trim();
    const finalClientPhone = (clientPhone || "").trim();
    const finalAddress = (deliveryAddress || "").trim() || "Standard Delivery";

    if (!finalClientName || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Client name and at least one line item are required" }, { status: 400 });
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

    const newStatus = status || existingDO.status || "DISPATCHED";

    const updatedDO = await prisma.$transaction(async (tx: any) => {
      // 1. If previously dispatched or delivered, revert previous stock deductions
      const wasStockDeducted = existingDO.status === "DISPATCHED" || existingDO.status === "DELIVERED";
      if (wasStockDeducted) {
        for (const oldItem of existingDO.lineItems) {
          if (oldItem.productId) {
            await recordStockMovement(tx, {
              productId: oldItem.productId,
              type: "DO_REVERSAL",
              quantity: oldItem.quantity,
              referenceDoc: `EDIT-${existingDO.doNumber}`,
            });
          }
        }
      }

      // 2. Pre-fill missing descriptions for catalog products
      for (const line of validLines) {
        if (line.productId && !line.description) {
          const p = await tx.product.findUnique({ where: { id: line.productId } });
          if (p) line.description = p.name;
        }
      }

      // 3. Delete existing line items
      await tx.dOLineItem.deleteMany({
        where: { doId: existingDO.id },
      });

      // 4. Update the Delivery Order record & recreate line items
      const doUpdated = await tx.deliveryOrder.update({
        where: { id: existingDO.id },
        data: {
          customerId: inputCustomerId || existingDO.customerId,
          clientName: finalClientName,
          clientPhone: finalClientPhone || existingDO.clientPhone,
          deliveryAddress: finalAddress,
          status: newStatus,
          notes: notes !== undefined ? notes : existingDO.notes,
          through: through !== undefined ? through : existingDO.through,
          vehicle: vehicle !== undefined ? vehicle : existingDO.vehicle,
          poNumber: poNumber !== undefined ? poNumber : existingDO.poNumber,
          lineItems: {
            create: validLines,
          },
        },
        include: {
          lineItems: {
            include: {
              product: true,
            },
          },
          customer: true,
        },
      });

      // 5. If new status is DISPATCHED or DELIVERED, validate and deduct stock
      const shouldDeductStock = newStatus === "DISPATCHED" || newStatus === "DELIVERED";
      if (shouldDeductStock) {
        for (const item of doUpdated.lineItems) {
          if (item.productId) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product) throw new Error(`Catalog product not found for line item`);
            if (product.onHandQty < item.quantity) {
              throw new Error(
                `Insufficient stock for "${product.sku} - ${product.name}". Available in stock: ${product.onHandQty}, Requested: ${item.quantity}.`
              );
            }

            await recordStockMovement(tx, {
              productId: item.productId,
              type: "DO_DISPATCH",
              quantity: -item.quantity,
              referenceDoc: existingDO.doNumber,
            });
          }
        }
      }

      return doUpdated;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "DeliveryOrder",
      entityId: updatedDO.id,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      beforeState: existingDO,
      afterState: updatedDO,
    });

    return NextResponse.json({ deliveryOrder: updatedDO, success: true });
  } catch (error: any) {
    console.error("[DO PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update Delivery Order" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existingDO = await prisma.deliveryOrder.findUnique({
      where: { id: params.id },
      include: {
        lineItems: true,
      },
    });

    if (!existingDO) {
      return NextResponse.json({ error: "Delivery Order not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      // Revert stock if was deducted
      if (existingDO.status === "DISPATCHED" || existingDO.status === "DELIVERED") {
        for (const item of existingDO.lineItems) {
          if (item.productId) {
            await recordStockMovement(tx, {
              productId: item.productId,
              type: "DO_REVERSAL",
              quantity: item.quantity,
              referenceDoc: `CANCEL-${existingDO.doNumber}`,
            });
          }
        }
      }

      // Delete DO (cascades to line items)
      await tx.deliveryOrder.delete({
        where: { id: existingDO.id },
      });
    });

    await recordAuditSnapshot({
      entityName: "DeliveryOrder",
      entityId: existingDO.id,
      action: "DELETE",
      actor: { id: session.id, email: session.email },
      beforeState: existingDO,
    });

    return NextResponse.json({ success: true, message: "Delivery Order cancelled and deleted successfully" });
  } catch (error: any) {
    console.error("[DO DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete Delivery Order" }, { status: 500 });
  }
}
