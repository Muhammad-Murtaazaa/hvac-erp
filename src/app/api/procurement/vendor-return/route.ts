import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry, recordStockMovement } from "@/lib/ledger";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendorReturns = await prisma.vendorReturn.findMany({
    include: {
      vendor: true,
      lineItems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ vendorReturns });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_PROCUREMENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { vendorId, lineItems, reason } = await req.json(); // lineItems = Array of { productId, quantity, grnLineItemId }

    if (!vendorId || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Vendor and return items are required" }, { status: 400 });
    }

    const count = await prisma.vendorReturn.count();
    const vendorReturnNumber = `VRET-${10001 + count}`;

    const vendorReturn = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;

      // Create the Vendor Return header
      const createdReturn = await tx.vendorReturn.create({
        data: {
          vendorReturnNumber,
          vendorId,
          reason: reason || "Defective stock return",
          totalAmount: 0.00, // We will update this after calculating
          date: new Date(),
        },
      });

      for (const item of lineItems) {
        const qtyToReturn = parseInt(item.quantity);
        const productId = item.productId;
        const grnLineItemId = item.grnLineItemId;

        if (isNaN(qtyToReturn) || qtyToReturn <= 0) {
          throw new Error(`Invalid quantity to return: ${item.quantity}`);
        }

        if (!grnLineItemId) {
          throw new Error(`GRN Line Item link is required for validation`);
        }

        // 1. Fetch GRN Line Item to validate received quantity
        const grnLine = await tx.gRNLineItem.findUnique({
          where: { id: grnLineItemId },
          include: {
            goodsReceivedNote: true,
          },
        });

        if (!grnLine || grnLine.productId !== productId) {
          throw new Error(`Linked GRN line item not found or product SKU mismatch`);
        }

        // 2. Fetch previous vendor returns against this GRN Line Item
        const priorReturns = await tx.vendorReturnLineItem.aggregate({
          where: { grnLineItemId },
          _sum: { quantity: true },
        });

        const previouslyReturned = priorReturns._sum.quantity || 0;
        const remainingReturnable = grnLine.quantityReceived - previouslyReturned;

        if (qtyToReturn > remainingReturnable) {
          throw new Error(
            `Cannot return ${qtyToReturn} units. Only ${remainingReturnable} units are returnable from GRN ${grnLine.goodsReceivedNote.grnNumber}`
          );
        }

        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error("Product not found");

        if (product.onHandQty < qtyToReturn) {
          throw new Error(`Insufficient stock for ${product.sku}. On hand: ${product.onHandQty}, Return: ${qtyToReturn}`);
        }

        const originalUnitCost = Number(grnLine.unitCost);
        const currentAverageCost = Number(product.averageCost);

        // 3. Decrement inventory and log in StockLedger
        await recordStockMovement(tx, {
          productId,
          type: "VENDOR_RETURN",
          quantity: -qtyToReturn,
          referenceDoc: vendorReturnNumber,
        });

        // 4. Ledger entries (Debit AP / Credit Inventory Asset + Variance adjustment)
        const debitAP = qtyToReturn * originalUnitCost;
        const creditInventory = qtyToReturn * currentAverageCost;
        const variance = debitAP - creditInventory;

        if (Math.abs(variance) > 0.001) {
          if (variance > 0) {
            // Debit AP (debitAP), Credit Inventory (creditInventory), Credit Variance (variance)
            await tx.ledgerEntry.create({
              data: {
                entryDate: new Date(),
                description: `Vendor return variance adjustment (VRET-Price-Variance Credit)`,
                debitAccount: "Accounts Payable",
                creditAccount: "Purchase Price Variance",
                amount: variance,
                referenceType: "VENDOR_RETURN",
                referenceId: createdReturn.id,
              },
            });
          } else {
            // Debit AP (debitAP), Debit Variance (abs(variance)), Credit Inventory (creditInventory)
            await tx.ledgerEntry.create({
              data: {
                entryDate: new Date(),
                description: `Vendor return variance adjustment (VRET-Price-Variance Debit)`,
                debitAccount: "Purchase Price Variance",
                creditAccount: "Inventory Asset",
                amount: Math.abs(variance),
                referenceType: "VENDOR_RETURN",
                referenceId: createdReturn.id,
              },
            });
          }
        }

        // Standard ledger journal line
        await recordLedgerEntry(tx, {
          description: `Return ${qtyToReturn} units of ${product.sku} to vendor (${vendorReturnNumber})`,
          debitAccount: "Accounts Payable",
          creditAccount: "Inventory Asset",
          amount: Math.min(debitAP, creditInventory),
          referenceType: "VENDOR_RETURN",
          referenceId: createdReturn.id,
        });

        // 5. Create Return Line Item
        await tx.vendorReturnLineItem.create({
          data: {
            vendorReturnId: createdReturn.id,
            grnLineItemId,
            productId,
            quantity: qtyToReturn,
            unitCost: originalUnitCost,
          },
        });

        totalAmount += debitAP;
      }

      // Update total return amount and complete the return status
      return await tx.vendorReturn.update({
        where: { id: createdReturn.id },
        data: {
          totalAmount,
          status: "COMPLETED",
        },
        include: {
          lineItems: true,
        },
      });
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "VendorReturn",
      entityId: vendorReturn.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: vendorReturn,
    });

    return NextResponse.json({ vendorReturn });
  } catch (error: any) {
    console.error("[Vendor Return POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
