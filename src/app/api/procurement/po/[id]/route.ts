import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
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

  return NextResponse.json({ purchaseOrder: po });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action } = await req.json(); // e.g. "submit" or "cancel"
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        lineItems: true,
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    if (po.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft POs can be modified" }, { status: 400 });
    }

    const updatedPO = await prisma.$transaction(async (tx) => {
      let finalStatus = po.status;

      if (action === "submit") {
        finalStatus = "SUBMITTED";

        // Increment incomingQty
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
      } else {
        throw new Error("Invalid action");
      }

      return await tx.purchaseOrder.update({
        where: { id: params.id },
        data: {
          status: finalStatus,
        },
        include: {
          lineItems: true,
        },
      });
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
