import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry } from "@/lib/ledger";
import { postJournalEntry } from "@/lib/journal";
import { parseInvoiceMetadata, formatInvoiceNotesPayload } from "@/lib/invoiceHelper";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: params.id },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (quotation.status === "CONVERTED" && quotation.convertedInvoiceId) {
      return NextResponse.json(
        { error: "This quotation has already been converted to an invoice." },
        { status: 400 }
      );
    }

    const meta = parseInvoiceMetadata(quotation.notes, quotation);

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Generate unique invoice number
      const lastInv = await tx.invoice.findFirst({
        orderBy: { createdAt: "desc" },
        select: { invoiceNumber: true },
      });

      let nextNum = 10001;
      if (lastInv && lastInv.invoiceNumber) {
        const match = lastInv.invoiceNumber.match(/INV-(\d+)/);
        if (match && match[1]) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      let invoiceNumber = `INV-${nextNum}`;
      while (await tx.invoice.findUnique({ where: { invoiceNumber } })) {
        nextNum++;
        invoiceNumber = `INV-${nextNum}`;
      }

      // 2. Process Line Items and COGS
      let subtotalAmount = 0;
      let totalCogs = 0;
      const lineItemsWithInfo = [];

      for (const item of quotation.lineItems) {
        const qty = item.quantity;
        const price = Number(item.salesPrice);
        const productId = item.productId || null;

        const lineTotal = Math.round(qty * price);
        subtotalAmount += lineTotal;

        let lineCogs = 0;
        if (item.product) {
          lineCogs = Math.round(qty * Number(item.product.averageCost));
          totalCogs += lineCogs;
        }

        lineItemsWithInfo.push({
          productId,
          description: item.description || null,
          quantity: qty,
          salesPrice: Math.round(price),
          extraFields: item.extraFields,
        });
      }

      subtotalAmount = Math.round(subtotalAmount);

      const discountAmount = Math.max(0, Math.min(meta.discountAmount || 0, subtotalAmount));
      const taxableAmount = Math.max(0, subtotalAmount - discountAmount);
      const taxRate = meta.taxRate || 18;
      const taxAmount = meta.isGst ? Math.round(taxableAmount * (taxRate / 100)) : 0;
      const finalTotalAmount = Math.round(taxableAmount + taxAmount);

      const formattedNotes = formatInvoiceNotesPayload({
        userNotes: meta.userNotes || "",
        isGst: meta.isGst,
        taxRate,
        taxAmount,
        discountType: meta.discountType || "FIXED",
        discountPercent: meta.discountPercent || 0,
        discountAmount,
        subtotalAmount,
        totalAmount: finalTotalAmount,
      });

      // 3. Create Live Invoice
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: quotation.customerId || undefined,
          clientName: quotation.clientName,
          clientPhone: quotation.clientPhone || null,
          clientAddress: quotation.clientAddress || null,
          date: new Date(),
          status: "UNPAID",
          totalAmount: finalTotalAmount,
          amountPaid: 0,
          notes: formattedNotes,
          subjectHeading: quotation.subjectHeading || null,
          subjectDescription: quotation.subjectDescription || null,
          isGst: meta.isGst,
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
        },
      });

      // 4. Hit Financial General Ledger and Customer Party Ledger
      const isPartyPosting = !!quotation.customerId;

      await recordLedgerEntry(tx, {
        entryDate: new Date(),
        description: `Revenue for Invoice ${invoiceNumber} issued to ${quotation.clientName} (Converted from Quotation ${quotation.quotationNumber})`,
        debitAccount: "Accounts Receivable (Trade Debtors)",
        creditAccount: "Sales Revenue",
        amount: taxableAmount,
        referenceType: "INVOICE",
        referenceId: createdInvoice.id,
        partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
        partyId: quotation.customerId || null,
        partyName: quotation.clientName,
        voucherType: "INV",
        voucherNumber: invoiceNumber,
      });

      if (taxAmount > 0) {
        await recordLedgerEntry(tx, {
          entryDate: new Date(),
          description: `Sales Tax for Invoice ${invoiceNumber}`,
          debitAccount: "Accounts Receivable (Trade Debtors)",
          creditAccount: "Sales Tax Payable",
          amount: taxAmount,
          referenceType: "INVOICE",
          referenceId: createdInvoice.id,
          partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
          partyId: quotation.customerId || null,
          partyName: quotation.clientName,
          voucherType: "INV",
          voucherNumber: invoiceNumber,
        });
      }

      // Native Double-Entry Journal: Revenue & Tax
      const revenueLines = [
        {
          accountName: "Accounts Receivable (Trade Debtors)",
          partyId: quotation.customerId || null,
          debit: finalTotalAmount,
          credit: 0,
        },
        {
          accountName: "Sales Revenue",
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
        entryDate: new Date(),
        narration: `Revenue for Invoice ${invoiceNumber} issued to ${quotation.clientName} (Converted from Quotation ${quotation.quotationNumber})`,
        sourceType: "INVOICE",
        sourceId: createdInvoice.id,
        idempotencyKey: `INVOICE:${createdInvoice.id}:revenue`,
        lines: revenueLines,
      });

      // COGS
      if (totalCogs > 0) {
        await recordLedgerEntry(tx, {
          entryDate: new Date(),
          description: `COGS release for Invoice ${invoiceNumber}`,
          debitAccount: "Cost of Goods Sold",
          creditAccount: "Inventory Asset",
          amount: totalCogs,
          referenceType: "INVOICE",
          referenceId: createdInvoice.id,
          partyType: isPartyPosting ? "CUSTOMER" : "GENERAL",
          partyId: quotation.customerId || null,
          partyName: quotation.clientName,
          voucherType: "COGS",
          voucherNumber: invoiceNumber,
        });

        await postJournalEntry(tx, {
          entryDate: new Date(),
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

      // 5. Update Quotation status to CONVERTED
      const updatedQuotation = await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          status: "CONVERTED",
          convertedInvoiceId: createdInvoice.id,
        },
      });

      return { invoice: createdInvoice, quotation: updatedQuotation };
    });

    return NextResponse.json({
      success: true,
      message: `Quotation ${quotation.quotationNumber} successfully converted to Invoice ${result.invoice.invoiceNumber}.`,
      invoice: result.invoice,
      quotation: result.quotation,
    });
  } catch (error: any) {
    console.error("[Quotation Convert] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to convert quotation" }, { status: 500 });
  }
}
