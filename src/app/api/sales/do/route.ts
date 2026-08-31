import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordStockMovement } from "@/lib/ledger";
import { recordAuditSnapshot } from "@/lib/audit";
import { ensureCustomer } from "@/lib/customerSync";

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
      invoiceId,
    } = body;

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

    const doStatus = status || "DISPATCHED";

    // 1. Resolve or create customer profile safely BEFORE transaction
    let resolvedCustomerId = inputCustomerId || null;
    if (!resolvedCustomerId && finalClientName) {
      const cust = await ensureCustomer({
        name: finalClientName,
        phone: finalClientPhone || null,
        address: finalAddress !== "Standard Delivery" ? finalAddress : null,
        notes: "Auto-synced Customer from DO",
      });
      if (cust) {
        resolvedCustomerId = cust.id;
      }
    }

    const deliveryOrder = await prisma.$transaction(async (tx: any) => {
      // 2. Generate unique collision-proof DO number
      const lastDO = await tx.deliveryOrder.findFirst({
        orderBy: { createdAt: "desc" },
        select: { doNumber: true },
      });
      let nextNum = 10001;
      if (lastDO && lastDO.doNumber) {
        const match = lastDO.doNumber.match(/DO-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      let doNumber = `DO-${nextNum}`;
      while (await tx.deliveryOrder.findUnique({ where: { doNumber } })) {
        nextNum++;
        doNumber = `DO-${nextNum}`;
      }

      // 3. Pre-fill missing descriptions for catalog products
      for (const line of validLines) {
        if (line.productId && !line.description) {
          const p = await tx.product.findUnique({ where: { id: line.productId } });
          if (p) line.description = p.name;
        }
      }

      // 4. Create the Delivery Order record
      const createdDO = await tx.deliveryOrder.create({
        data: {
          doNumber,
          date: new Date(),
          customerId: resolvedCustomerId,
          clientName: finalClientName,
          clientPhone: finalClientPhone || "-",
          deliveryAddress: finalAddress,
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
          lineItems: {
            include: {
              product: true,
            },
          },
          customer: true,
        },
      });

      // 5. If DISPATCHED or DELIVERED, validate stock and deduct
      if (doStatus === "DISPATCHED" || doStatus === "DELIVERED") {
        for (const item of createdDO.lineItems) {
          if (item.productId) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product) throw new Error(`Catalog product not found for line item`);
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

      if (invoiceId) {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            doId: createdDO.id,
            dispatchStatus: "DISPATCHED",
          },
        });
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

    return NextResponse.json({ deliveryOrder, success: true });
  } catch (error: any) {
    console.error("[DO POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create Delivery Order" }, { status: 500 });
  }
}
