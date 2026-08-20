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

  const normalizedInvoices = invoices.map((inv) => {
    const isPaid = Math.round(Number(inv.amountPaid)) >= Math.round(Number(inv.totalAmount));
    return {
      ...inv,
      status: isPaid ? "PAID" : inv.status,
    };
  });

  return NextResponse.json({ invoices: normalizedInvoices });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      customerId: inputCustomerId,
      clientName,
      clientPhone,
      clientAddress,
      date,
      lineItems,
      doId,
      complaintId,
      payments,
      notes,
      subjectHeading,
      subjectDescription,
      isGst,
    } = await req.json();

    const finalClientName = (clientName || "").trim();
    const finalClientPhone = (clientPhone || "").trim();
    const finalClientAddress = (clientAddress || "").trim();

    if (!finalClientName || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Client details and billing line items are required" }, { status: 400 });
    }

    const invoice = await prisma.$transaction(async (tx: any) => {
      // 1. Resolve or create Customer profile
      let resolvedCustomerId = inputCustomerId || null;
      if (!resolvedCustomerId && finalClientName) {
        const phoneToMatch = finalClientPhone || "0300-0000000";
        const existingCust = await tx.customer.findFirst({
          where: {
            OR: [
              { phone: phoneToMatch },
              { name: { equals: finalClientName, mode: "insensitive" } },
            ],
          },
        });

        if (existingCust) {
          resolvedCustomerId = existingCust.id;
        } else {
          try {
            const newCust = await tx.customer.create({
              data: {
                name: finalClientName,
                phone: finalClientPhone || `0300-${Math.floor(1000000 + Math.random() * 9000000)}`,
                address: finalClientAddress || null,
              },
            });
            resolvedCustomerId = newCust.id;
          } catch {
            const fallbackCust = await tx.customer.findFirst({ where: { phone: phoneToMatch } });
            if (fallbackCust) resolvedCustomerId = fallbackCust.id;
          }
        }
      }

      // 2. Generate unique collision-proof Invoice number
      const lastInv = await tx.invoice.findFirst({
        orderBy: { createdAt: "desc" },
        select: { invoiceNumber: true },
      });
      let nextNum = 10001;
      if (lastInv && lastInv.invoiceNumber) {
        const match = lastInv.invoiceNumber.match(/INV-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      let invoiceNumber = `INV-${nextNum}`;
      while (await tx.invoice.findUnique({ where: { invoiceNumber } })) {
        nextNum++;
        invoiceNumber = `INV-${nextNum}`;
      }

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

        const lineTotal = Math.round(qty * price);
        subtotalAmount += lineTotal;

        let lineCogs = 0;
        if (productInfo) {
          lineCogs = Math.round(qty * Number(productInfo.averageCost));
          totalCogs += lineCogs;
        }

        lineItemsWithInfo.push({
          productId,
          description: item.description || null,
          quantity: qty,
          salesPrice: Math.round(price),
          cogs: lineCogs,
          extraFields: item.extraFields ? (typeof item.extraFields === "string" ? item.extraFields : JSON.stringify(item.extraFields)) : null,
        });
      }

      subtotalAmount = Math.round(subtotalAmount);

      // Fetch active sales tax rate setting (defaults to 18)
      const taxSetting = await tx.systemSetting.findUnique({
        where: { key: "salesTaxRate" },
      });
      const salesTaxRate = taxSetting ? Number(taxSetting.value) : 18;
      const taxAmount = isGst !== false ? Math.round(subtotalAmount * (salesTaxRate / 100)) : 0;
      const finalTotalAmount = Math.round(subtotalAmount + taxAmount);

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
          amountPaid += Math.round(Number(p.amountPaid));
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
          customerId: resolvedCustomerId,
          clientName: finalClientName,
          clientPhone: finalClientPhone || null,
          clientAddress: finalClientAddress || null,
          date: new Date(date || Date.now()),
          status: invoiceStatus,
          totalAmount: finalTotalAmount,
          amountPaid,
          notes: notes || null,
          subjectHeading: subjectHeading || null,
          subjectDescription: subjectDescription || null,
          doId: doId || null,
          complaintId: complaintId || null,
          isGst: isGst !== false,
          lineItems: {
            create: lineItemsWithInfo.map((l) => ({
              productId: l.productId,
              description: l.description,
              quantity: l.quantity,
              salesPrice: Math.round(l.salesPrice),
              extraFields: l.extraFields,
            })),
          },
        },
        include: {
          lineItems: true,
          complaint: true,
        },
      });

      // If complaint was linked, update complaint status & amountStatus
      if (complaintId) {
        const complaint = await tx.complaint.findUnique({ where: { id: complaintId } });
        if (complaint) {
          await tx.complaint.update({
            where: { id: complaintId },
            data: {
              amountStatus: invoiceStatus === "PAID" ? "PAID" : "INVOICED",
              customerId: resolvedCustomerId || complaint.customerId,
            },
          });

          await tx.complaintTimeline.create({
            data: {
              complaintId,
              changedById: session.id,
              fromStatus: complaint.status,
              toStatus: complaint.status,
              remarks: `Billing Invoice ${invoiceNumber} created (PKR ${finalTotalAmount.toLocaleString()}).`,
            },
          });
        }
      }

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
        description: `Revenue for Invoice ${invoiceNumber} issued to ${finalClientName}`,
        debitAccount: "Accounts Receivable (Trade Debtors)",
        creditAccount: complaintId ? "Service & Maintenance Income" : "Sales Revenue",
        amount: subtotalAmount,
        referenceType: "INVOICE",
        referenceId: createdInvoice.id,
        partyType: "CUSTOMER",
        partyName: finalClientName,
        voucherType: "INV",
        voucherNumber: invoiceNumber,
      });

      if (taxAmount > 0) {
        await recordLedgerEntry(tx, {
          description: `Sales Tax for Invoice ${invoiceNumber}`,
          debitAccount: "Accounts Receivable (Trade Debtors)",
          creditAccount: "Sales Tax Payable",
          amount: taxAmount,
          referenceType: "INVOICE",
          referenceId: createdInvoice.id,
          partyType: "CUSTOMER",
          partyName: finalClientName,
          voucherType: "INV",
          voucherNumber: invoiceNumber,
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
          partyType: "CUSTOMER",
          partyName: finalClientName,
          voucherType: "COGS",
          voucherNumber: invoiceNumber,
        });
      }

      // Process payments if provided
      if (payments && payments.length > 0) {
        for (const payment of payments) {
          const pAmount = Number(payment.amountPaid);
          const pMethod = payment.method || "CASH";
          const isBank = pMethod === "BANK_TRANSFER" || pMethod === "CHEQUE" || pMethod === "ONLINE";
          const liquidAcc = isBank ? "Bank Account (Meezan Bank)" : "Cash in Hand";

          await tx.payment.create({
            data: {
              invoiceId: createdInvoice.id,
              amountPaid: pAmount,
              method: pMethod,
            },
          });

          // Ledger Entry for payment receipt (Debit Cash-Bank / Credit Accounts Receivable)
          await recordLedgerEntry(tx, {
            description: `Payment received against Invoice ${invoiceNumber} via ${pMethod}`,
            debitAccount: liquidAcc,
            creditAccount: "Accounts Receivable (Trade Debtors)",
            amount: pAmount,
            referenceType: "INVOICE",
            referenceId: createdInvoice.id,
            partyType: "CUSTOMER",
            partyName: finalClientName,
            voucherType: isBank ? "BRV" : "CRV",
            voucherNumber: invoiceNumber,
            paymentMethod: pMethod,
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
    }, {
      maxWait: 15000,
      timeout: 30000,
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
