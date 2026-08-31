import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { formatInvoiceNotesPayload } from "@/lib/invoiceHelper";
import { parseDateForStorage } from "@/lib/dateUtils";
import { ensureCustomer } from "@/lib/customerSync";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const quotations = await prisma.quotation.findMany({
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ quotations });
  } catch (error: any) {
    console.error("[Quotations GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch quotations" }, { status: 500 });
  }
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
      clientAddress,
      date,
      validUntil,
      lineItems,
      notes,
      subjectHeading,
      subjectDescription,
      isGst,
      discountType: reqDiscountType,
      discountPercent: reqDiscountPercent,
      discount: reqDiscount,
      discountAmount: reqDiscountAmount,
      taxRate: reqTaxRate,
      site,
    } = body;

    const finalClientName = (clientName || "").trim();
    const finalClientPhone = (clientPhone || "").trim();
    const finalClientAddress = (clientAddress || "").trim();

    if (!finalClientName || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: "Client details and at least one item line are required" },
        { status: 400 }
      );
    }

    // 1. Resolve or create Customer profile safely BEFORE transaction
    let resolvedCustomerId = inputCustomerId || null;
    if (!resolvedCustomerId && finalClientName) {
      const cust = await ensureCustomer({
        name: finalClientName,
        phone: finalClientPhone || null,
        address: finalClientAddress || null,
        notes: "Auto-synced Customer from Quotation",
      });
      if (cust) {
        resolvedCustomerId = cust.id;
      }
    }

    const createdQuotation = await prisma.$transaction(async (tx: any) => {
      // 2. Generate unique Quotation Number (e.g. QTN-10001)
      const lastQuo = await tx.quotation.findFirst({
        orderBy: { createdAt: "desc" },
        select: { quotationNumber: true },
      });

      let nextNum = 10001;
      if (lastQuo && lastQuo.quotationNumber) {
        const match = lastQuo.quotationNumber.match(/QTN-(\d+)/);
        if (match && match[1]) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      let quotationNumber = `QTN-${nextNum}`;
      while (await tx.quotation.findUnique({ where: { quotationNumber } })) {
        nextNum++;
        quotationNumber = `QTN-${nextNum}`;
      }

      // 3. Process Line Items and Calculate Subtotal
      let subtotalAmount = 0;
      const lineItemsWithInfo = [];

      for (const item of lineItems) {
        const qty = parseInt(item.quantity);
        const price = Number(item.salesPrice);
        const productId = item.productId || null;

        if (isNaN(qty) || qty <= 0) throw new Error("Invalid quotation quantity");
        if (isNaN(price) || price < 0) throw new Error("Invalid quotation rate");

        if (productId) {
          const productInfo = await tx.product.findUnique({ where: { id: productId } });
          if (!productInfo) throw new Error(`Product not found for line item`);
        }

        const lineTotal = Math.round(qty * price);
        subtotalAmount += lineTotal;

        let extraFieldsData: any = {};
        if (item.extraFields) {
          try {
            extraFieldsData =
              typeof item.extraFields === "string" ? JSON.parse(item.extraFields) : { ...item.extraFields };
          } catch {
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
          extraFields: Object.keys(extraFieldsData).length > 0 ? JSON.stringify(extraFieldsData) : null,
        });
      }

      subtotalAmount = Math.round(subtotalAmount);

      // 4. Calculate Discount & Tax
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

      let salesTaxRate = 18;
      if (reqTaxRate !== undefined && reqTaxRate !== null && !isNaN(Number(reqTaxRate))) {
        salesTaxRate = Number(reqTaxRate);
      } else {
        const taxSetting = await tx.systemSetting.findUnique({
          where: { key: "salesTaxRate" },
        });
        salesTaxRate = taxSetting ? Number(taxSetting.value) : 18;
      }

      const isGstEnabled = isGst !== false;
      const taxAmount = isGstEnabled ? Math.round(taxableAmount * (salesTaxRate / 100)) : 0;
      const finalTotalAmount = Math.round(taxableAmount + taxAmount);

      // Format notes JSON metadata
      const formattedNotes = formatInvoiceNotesPayload({
        userNotes: notes || "",
        isGst: isGstEnabled,
        taxRate: salesTaxRate,
        taxAmount,
        discountType,
        discountPercent,
        discountAmount,
        subtotalAmount,
        totalAmount: finalTotalAmount,
        site: site ? String(site).trim() : "",
      });

      // 5. Create Quotation Record (Zero Ledger, Zero Stock Deduction)
      const quotation = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: resolvedCustomerId || null,
          clientName: finalClientName,
          clientPhone: finalClientPhone || null,
          clientAddress: finalClientAddress || null,
          date: parseDateForStorage(date),
          validUntil: validUntil ? parseDateForStorage(validUntil) : null,
          status: "DRAFT",
          totalAmount: finalTotalAmount,
          notes: formattedNotes,
          subjectHeading: subjectHeading || null,
          subjectDescription: subjectDescription || null,
          isGst: isGstEnabled,
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
          lineItems: {
            include: {
              product: true,
            },
          },
          customer: true,
        },
      });

      return quotation;
    });

    return NextResponse.json({ quotation: createdQuotation, success: true }, { status: 201 });
  } catch (error: any) {
    console.error("[Quotations POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create quotation" }, { status: 500 });
  }
}
