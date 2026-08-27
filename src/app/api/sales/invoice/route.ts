import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { recordLedgerEntry, recordStockMovement } from "@/lib/ledger";
import { postJournalEntry, mapPaymentMethodToAccount } from "@/lib/journal";
import { recordAuditSnapshot } from "@/lib/audit";
import { formatInvoiceNotesPayload } from "@/lib/invoiceHelper";

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
      postingOption,
    } = await req.json();

    const finalClientName = (clientName || "").trim();
    const finalClientPhone = (clientPhone || "").trim();
    const finalClientAddress = (clientAddress || "").trim();

    if (!finalClientName || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Client details and billing line items are required" }, { status: 400 });
    }

    const invoice = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

        let extraFieldsData: any = {};
        if (item.extraFields) {
          try {
            extraFieldsData = typeof item.extraFields === "string" ? JSON.parse(item.extraFields) : { ...item.extraFields };
          } catch (e) {
            extraFieldsData = {};
          }
        }
        if (item.unit) {
          extraFieldsData.unit = item.unit;
        }

        lineItemsWithInfo.push({
          productId,
          description: item.description || null,
          quantity: qty,
          salesPrice: Math.round(price),
          cogs: lineCogs,
          extraFields: Object.keys(extraFieldsData).length > 0 ? JSON.stringify(extraFieldsData) : null,
        });
      }

      subtotalAmount = Math.round(subtotalAmount);

      // Handle Discount
      const {
        discountType: reqDiscountType,
        discountPercent: reqDiscountPercent,
        discount: reqDiscount,
        discountAmount: reqDiscountAmount,
        taxRate: reqTaxRate,
      } = await req.json().catch(() => ({} as any));

      // Calculate discount amount
      const discountType: "FIXED" | "PERCENTAGE" = reqDiscountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
      const discountPercent = Number(reqDiscountPercent || 0);
      let discountAmount = 0;
      if (discountType === "PERCENTAGE" && discountPercent > 0 && subtotalAmount > 0) {
        discountAmount = Math.round(subtotalAmount * (discountPercent / 100));
      } else {
        discountAmount = Math.round(Number(reqDiscountAmount ?? reqDiscount ?? 0));
      }
      discountAmount = Math.max(0, Math.min(discountAmount, subtotalAmount));
      const taxableAmount = Math.max(0, subtotalAmount - discountAmount);

      // Fetch active sales tax rate setting (defaults to 18)
      let salesTaxRate = 18;
      if (reqTaxRate !== undefined && reqTaxRate !== null && !isNaN(Number(reqTaxRate))) {
        salesTaxRate = Number(reqTaxRate);
      } else {
        const taxSetting = await tx.systemSetting.findUnique({
          where: { key: "salesTaxRate" },
        });
        salesTaxRate = taxSetting ? Number(taxSetting.value) : 18;
      }

      const taxAmount = isGst !== false ? Math.round(taxableAmount * (salesTaxRate / 100)) : 0;
      const finalTotalAmount = Math.round(taxableAmount + taxAmount);

      // Format notes payload including discount and tax metadata
      const formattedNotes = formatInvoiceNotesPayload({
        userNotes: notes || "",
        isGst: isGst !== false,
        taxRate: salesTaxRate,
        taxAmount,
        discountType,
        discountPercent,
        discountAmount,
        subtotalAmount,
        totalAmount: finalTotalAmount,
      });

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
          amountPaid += Math.round(Number(p.amountPaid ?? p.amount ?? 0));
        });
        amountPaid = Math.max(0, Math.min(finalTotalAmount, amountPaid));
        if (amountPaid >= finalTotalAmount && finalTotalAmount > 0) {
          invoiceStatus = "PAID";
        } else if (amountPaid > 0) {
          invoiceStatus = "PARTIALLY_PAID";
        }
      }

      // Create the Invoice record
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customer: resolvedCustomerId ? { connect: { id: resolvedCustomerId } } : undefined,
          clientName: finalClientName,
          clientPhone: finalClientPhone || null,
          clientAddress: finalClientAddress || null,
          date: new Date(date || Date.now()),
          status: invoiceStatus,
          totalAmount: finalTotalAmount,
          amountPaid,
          notes: formattedNotes,
          subjectHeading: subjectHeading || null,
          subjectDescription: subjectDescription || null,
          deliveryOrder: doId ? { connect: { id: doId } } : undefined,
          complaint: complaintId ? { connect: { id: complaintId } } : undefined,
          isGst: isGst !== false,
          dispatchStatus: "PENDING_DISPATCH",
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
              amount: finalTotalAmount,
              amountStatus: invoiceStatus,
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

      // Removed stock deduction: Stock is now handled exclusively by Delivery Orders.

      // Determine posting option: "CUSTOMER_LEDGER" | "GENERAL_LEDGER" | "NO_LEDGER"
      const selectedPosting = postingOption || "CUSTOMER_LEDGER";
      const isPartyPosting = selectedPosting === "CUSTOMER_LEDGER";
      const isNoLedger = selectedPosting === "NO_LEDGER";

      // General Ledger Journal Entry (Debit Accounts Receivable / Credit Sales Revenue)
      if (!isNoLedger) {
        await recordLedgerEntry(tx, {
          description: `Revenue for Invoice ${invoiceNumber} issued to ${finalClientName}${!isPartyPosting ? " (GL Only)" : ""}`,
          debitAccount: "Accounts Receivable (Trade Debtors)",
          creditAccount: complaintId ? "Service & Maintenance Income" : "Sales Revenue",
          amount: taxableAmount,
          referenceType: "INVOICE",
          referenceId: createdInvoice.id,
          partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
          partyId: isPartyPosting ? resolvedCustomerId : null,
          partyName: isPartyPosting ? finalClientName : null,
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
            partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
            partyId: isPartyPosting ? resolvedCustomerId : null,
            partyName: isPartyPosting ? finalClientName : null,
            voucherType: "INV",
            voucherNumber: invoiceNumber,
          });
        }

        // Native Double-Entry Journal: Revenue & Tax grouped together
        const revenueLines = [
          {
            accountName: "Accounts Receivable (Trade Debtors)",
            partyId: isPartyPosting ? resolvedCustomerId : null,
            debit: finalTotalAmount,
            credit: 0,
          },
          {
            accountName: complaintId ? "Service & Maintenance Income" : "Sales Revenue",
            partyId: null,
            debit: 0,
            credit: taxableAmount,
          },
        ];
        if (taxAmount > 0) {
          revenueLines.push({
            accountName: "Sales Tax Payable",
            partyId: null,
            debit: 0,
            credit: taxAmount,
          });
        }

        await postJournalEntry(tx, {
          entryDate: new Date(date || Date.now()),
          narration: `Revenue for Invoice ${invoiceNumber} issued to ${finalClientName}${!isPartyPosting ? " (GL Only)" : ""}`,
          sourceType: "INVOICE",
          sourceId: createdInvoice.id,
          idempotencyKey: `INVOICE:${createdInvoice.id}:revenue`,
          lines: revenueLines,
        });

        // General Ledger COGS entries (Debit COGS / Credit Inventory Asset)
        if (totalCogs > 0) {
          await recordLedgerEntry(tx, {
            description: `COGS release for Invoice ${invoiceNumber}`,
            debitAccount: "Cost of Goods Sold",
            creditAccount: "Inventory Asset",
            amount: totalCogs,
            referenceType: "INVOICE",
            referenceId: createdInvoice.id,
            partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
            partyId: isPartyPosting ? resolvedCustomerId : null,
            partyName: isPartyPosting ? finalClientName : null,
            voucherType: "COGS",
            voucherNumber: invoiceNumber,
          });

          // Native Double-Entry Journal: COGS separate
          await postJournalEntry(tx, {
            entryDate: new Date(date || Date.now()),
            narration: `COGS release for Invoice ${invoiceNumber}`,
            sourceType: "INVOICE",
            sourceId: createdInvoice.id,
            idempotencyKey: `INVOICE:${createdInvoice.id}:cogs`,
            lines: [
              {
                accountName: "Cost of Goods Sold",
                partyId: null,
                debit: totalCogs,
                credit: 0,
              },
              {
                accountName: "Inventory Asset",
                partyId: null,
                debit: 0,
                credit: totalCogs,
              },
            ],
          });
        }
      }

      // Process payments if provided
      if (payments && payments.length > 0) {
        for (let pIdx = 0; pIdx < payments.length; pIdx++) {
          const payment = payments[pIdx];
          const pAmount = Number(payment.amountPaid ?? payment.amount ?? 0);
          const pMethod = payment.paymentMethod || payment.method || "CASH";
          const isBank = pMethod === "BANK" || pMethod === "BANK_TRANSFER" || pMethod === "CHEQUE" || pMethod === "ONLINE";
          const liquidAcc = isBank ? "Bank Account (Meezan Bank)" : "Cash in Hand";

          const createdPayment = await tx.payment.create({
            data: {
              invoiceId: createdInvoice.id,
              amountPaid: pAmount,
              method: pMethod,
            },
          });

          if (!isNoLedger) {
            // Ledger Entry for payment receipt (Debit Cash-Bank / Credit Accounts Receivable)
            await recordLedgerEntry(tx, {
              description: `Payment received against Invoice ${invoiceNumber} via ${pMethod}${!isPartyPosting ? " (GL Only)" : ""}`,
              debitAccount: liquidAcc,
              creditAccount: "Accounts Receivable (Trade Debtors)",
              amount: pAmount,
              referenceType: "INVOICE",
              referenceId: createdInvoice.id,
              partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
              partyId: isPartyPosting ? resolvedCustomerId : null,
              partyName: isPartyPosting ? finalClientName : null,
              voucherType: isBank ? "BRV" : "CRV",
              voucherNumber: invoiceNumber,
              paymentMethod: pMethod,
            });

            // Native Double-Entry Journal: Payment separate
            await postJournalEntry(tx, {
              entryDate: new Date(date || Date.now()),
              narration: `Payment received against Invoice ${invoiceNumber} via ${pMethod}${!isPartyPosting ? " (GL Only)" : ""}`,
              sourceType: "INVOICE",
              sourceId: createdInvoice.id,
              idempotencyKey: `INVOICE:${createdInvoice.id}:payment:${createdPayment.id}`,
              lines: [
                {
                  accountName: mapPaymentMethodToAccount(pMethod),
                  partyId: null,
                  debit: pAmount,
                  credit: 0,
                },
                {
                  accountName: "Accounts Receivable (Trade Debtors)",
                  partyId: isPartyPosting ? resolvedCustomerId : null,
                  debit: 0,
                  credit: pAmount,
                },
              ],
            });
          }
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
