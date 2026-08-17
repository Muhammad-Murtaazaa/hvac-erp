import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry, recordStockMovement } from "@/lib/ledger";
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
      { invoiceNumber: { contains: search } },
      { clientName: { contains: search } },
      { clientPhone: { contains: search } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    include: {
      lineItems: {
        include: {
          product: true,
        },
      },
      payments: true,
      returns: {
        include: {
          lineItems: true,
        },
      },
      deliveryOrder: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invoices });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { clientName, clientPhone, clientAddress, date, lineItems, doId, payments, notes, subjectHeading, subjectDescription, isGst } = await req.json();

    if (!clientName || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Client details and billing line items are required" }, { status: 400 });
    }

    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${10001 + count}`;

    const invoice = await prisma.$transaction(async (tx) => {
      let subtotalAmount = 0;
      let totalCogs = 0;

      // Validate products and calculate amounts
      const lineItemsWithInfo = [];
      for (const item of lineItems) {
        const qty = parseInt(item.quantity);
        const price = Number(item.salesPrice);
        const productId = item.productId || null;

        if (isNaN(qty) || qty <= 0) throw new Error(`Invalid billing quantity`);
        if (isNaN(price) || price < 0) throw new Error(`Invalid billing rate`);

        let productInfo = null;
        if (productId) {
          productInfo = await tx.product.findUnique({ where: { id: productId } });
          if (!productInfo) throw new Error(`Product not found`);
        }

        const lineTotal = qty * price;
        subtotalAmount += lineTotal;

        let lineCogs = 0;
        if (productInfo) {
          lineCogs = qty * Number(productInfo.averageCost);
          totalCogs += lineCogs;
        }

        lineItemsWithInfo.push({
          productId,
          description: item.description || null,
          quantity: qty,
          salesPrice: price,
          cogs: lineCogs,
          extraFields: item.extraFields ? (typeof item.extraFields === "string" ? item.extraFields : JSON.stringify(item.extraFields)) : null,
        });
      }

      // Fetch active sales tax rate setting (defaults to 18)
      const taxSetting = await tx.systemSetting.findUnique({
        where: { key: "salesTaxRate" },
      });
      const salesTaxRate = taxSetting ? Number(taxSetting.value) : 18;
      const taxAmount = isGst !== false ? (subtotalAmount * (salesTaxRate / 100)) : 0;
      const finalTotalAmount = subtotalAmount + taxAmount;

      // If converting from DO, check and verify the DO status
      if (doId) {
        const doRecord = await tx.deliveryOrder.findUnique({ where: { id: doId } });
        if (!doRecord) throw new Error(`Delivery Order not found`);
      }

      // Determine initial payment details
      let amountPaid = 0;
      let invoiceStatus = "UNPAID";

      if (payments && payments.length > 0) {
        payments.forEach((p: any) => {
          amountPaid += Number(p.amountPaid);
        });
        if (amountPaid >= finalTotalAmount) {
          invoiceStatus = "PAID";
        } else if (amountPaid > 0) {
          invoiceStatus = "PARTIALLY_PAID";
        }
      }

      // Create the Invoice record
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientName,
          clientPhone: clientPhone || null,
          clientAddress: clientAddress || null,
          date: new Date(date || Date.now()),
          status: invoiceStatus,
          totalAmount: finalTotalAmount,
          amountPaid,
          notes: notes || null,
          subjectHeading: subjectHeading || null,
          subjectDescription: subjectDescription || null,
          doId: doId || null,
          isGst: isGst !== false,
          lineItems: {
            create: lineItemsWithInfo.map((l) => ({
              productId: l.productId,
              description: l.description,
              quantity: l.quantity,
              salesPrice: l.salesPrice,
              extraFields: l.extraFields,
            })),
          },
        },
        include: {
          lineItems: true,
        },
      });

      // Handle stock and stock ledger logs
      if (!doId) {
        // Standalone invoice: decrement catalog product quantities
        for (const line of lineItemsWithInfo) {
          if (line.productId) {
            const prod = await tx.product.findUnique({ where: { id: line.productId } });
            if (!prod) throw new Error("Catalog product not found");
            if (prod.onHandQty < line.quantity) {
              throw new Error(`Insufficient stock for product ${prod.sku}. On Hand: ${prod.onHandQty}, Sale: ${line.quantity}`);
            }

            await recordStockMovement(tx, {
              productId: line.productId,
              type: "SALE",
              quantity: -line.quantity,
              referenceDoc: invoiceNumber,
            });
          }
        }
      }

      // General Ledger Journal Entry (Debit Accounts Receivable / Credit Sales Revenue)
      await recordLedgerEntry(tx, {
        description: `Revenue for Invoice ${invoiceNumber} issued to ${clientName}`,
        debitAccount: "Accounts Receivable",
        creditAccount: "Sales Revenue",
        amount: subtotalAmount,
        referenceType: "INVOICE",
        referenceId: createdInvoice.id,
      });

      if (taxAmount > 0) {
        await recordLedgerEntry(tx, {
          description: `Sales Tax for Invoice ${invoiceNumber}`,
          debitAccount: "Accounts Receivable",
          creditAccount: "Sales Tax Payable",
          amount: taxAmount,
          referenceType: "INVOICE",
          referenceId: createdInvoice.id,
        });
      }

      // General Ledger COGS entries (Debit COGS / Credit Inventory Asset)
      if (totalCogs > 0) {
        await recordLedgerEntry(tx, {
          description: `COGS release for Invoice ${invoiceNumber}`,
          debitAccount: "Cost of Goods Sold",
          creditAccount: "Inventory Asset",
          amount: totalCogs,
          referenceType: "INVOICE",
          referenceId: createdInvoice.id,
        });
      }

      // Process payments if provided
      if (payments && payments.length > 0) {
        for (const payment of payments) {
          const pAmount = Number(payment.amountPaid);
          const pMethod = payment.method || "CASH";

          await tx.payment.create({
            data: {
              invoiceId: createdInvoice.id,
              amountPaid: pAmount,
              method: pMethod,
            },
          });

          // Ledger Entry for cash payment (Debit Cash-Bank / Credit Accounts Receivable)
          await recordLedgerEntry(tx, {
            description: `Payment received against Invoice ${invoiceNumber} via ${pMethod}`,
            debitAccount: "Cash/Bank",
            creditAccount: "Accounts Receivable",
            amount: pAmount,
            referenceType: "INVOICE",
            referenceId: createdInvoice.id,
          });
        }
      }

      // Update DO status to converted or completed if DO was supplied
      if (doId) {
        await tx.deliveryOrder.update({
          where: { id: doId },
          data: {
            status: "DELIVERED",
          },
        });
      }

      return createdInvoice;
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Invoice",
      entityId: invoice.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: invoice,
    });

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error("[Invoice POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
