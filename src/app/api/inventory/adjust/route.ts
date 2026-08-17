import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry, recordStockMovement } from "@/lib/ledger";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_INVENTORY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adjustments = await prisma.stockAdjustment.findMany({
    include: {
      product: true,
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ adjustments });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_INVENTORY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productId, adjustedQty, reason } = await req.json();

    if (!productId || isNaN(parseInt(adjustedQty)) || parseInt(adjustedQty) === 0) {
      return NextResponse.json({ error: "Product ID and non-zero adjustment quantity are required" }, { status: 400 });
    }

    const qtyDiff = parseInt(adjustedQty);
    const adjReason = reason || "Physical inventory count adjustment";

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Prevent stock going negative through manual adjustment
    if (product.onHandQty + qtyDiff < 0) {
      return NextResponse.json(
        { error: `Cannot adjust stock below zero. Current stock: ${product.onHandQty}, requested change: ${qtyDiff}` },
        { status: 400 }
      );
    }

    const count = await prisma.stockAdjustment.count();
    const adjDoc = `ADJ-${10001 + count}`;

    const adjustment = await prisma.$transaction(async (tx) => {
      // 1. Create StockAdjustment record
      const createdAdj = await tx.stockAdjustment.create({
        data: {
          productId,
          adjustedQty: qtyDiff,
          reason: adjReason,
          userId: session.id,
        },
      });

      // 2. Perform Stock Movement log
      await recordStockMovement(tx, {
        productId,
        type: "MANUAL_ADJUSTMENT",
        quantity: qtyDiff,
        referenceDoc: adjDoc,
      });

      // 3. Post double-entry General Ledger lines based on direction
      const varianceVal = Math.abs(qtyDiff) * Number(product.averageCost);

      if (varianceVal > 0) {
        if (qtyDiff > 0) {
          // Adjusting UP: Debit Inventory Asset / Credit Inventory Adjustment Expense
          await recordLedgerEntry(tx, {
            description: `Manual stock adjustment up for ${product.sku} (${adjDoc}) - Reason: ${adjReason}`,
            debitAccount: "Inventory Asset",
            creditAccount: "Inventory Adjustment Expense",
            amount: varianceVal,
            referenceType: "STOCK_ADJUSTMENT",
            referenceId: createdAdj.id,
          });
        } else {
          // Adjusting DOWN: Debit Inventory Adjustment Expense / Credit Inventory Asset
          await recordLedgerEntry(tx, {
            description: `Manual stock adjustment down for ${product.sku} (${adjDoc}) - Reason: ${adjReason}`,
            debitAccount: "Inventory Adjustment Expense",
            creditAccount: "Inventory Asset",
            amount: varianceVal,
            referenceType: "STOCK_ADJUSTMENT",
            referenceId: createdAdj.id,
          });
        }
      }

      return createdAdj;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "StockAdjustment",
      entityId: adjustment.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: adjustment,
    });

    return NextResponse.json({ adjustment });
  } catch (error: any) {
    console.error("[Stock Adjustment POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
