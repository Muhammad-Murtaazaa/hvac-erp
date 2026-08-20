import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { getNextVoucherNumber, recordLedgerEntry } from "@/lib/ledger";
import { recordAuditSnapshot } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "MANAGE_INVENTORY"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const voucherType = searchParams.get("voucherType"); // CRV, BRV, CPV, BPV, JV, CV, EAV
    const partyType = searchParams.get("partyType"); // CUSTOMER, VENDOR, EMPLOYEE, GENERAL
    const partyId = searchParams.get("partyId");
    const search = searchParams.get("search") || "";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const where: any = {};

    if (voucherType) {
      where.voucherType = voucherType;
    }

    if (partyType) {
      where.partyType = partyType;
    }

    if (partyId) {
      where.partyId = partyId;
    }

    if (startDateStr || endDateStr) {
      where.entryDate = {};
      if (startDateStr) where.entryDate.gte = new Date(startDateStr);
      if (endDateStr) {
        const end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
        where.entryDate.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { voucherNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { partyName: { contains: search, mode: "insensitive" } },
        { debitAccount: { contains: search, mode: "insensitive" } },
        { creditAccount: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const vouchers = await prisma.ledgerEntry.findMany({
      where,
      orderBy: { entryDate: "desc" },
      take: 200,
    });

    return NextResponse.json({ vouchers });
  } catch (error: any) {
    console.error("[Vouchers GET] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_INVENTORY")) { // requires finance/admin capability
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      voucherType, // "CRV" | "BRV" | "CPV" | "BPV" | "JV" | "CV" | "EAV"
      entryDate,
      debitAccount,
      creditAccount,
      amount,
      partyType, // "CUSTOMER" | "VENDOR" | "EMPLOYEE" | "GENERAL"
      partyId,
      partyName,
      paymentMethod, // "CASH" | "BANK_TRANSFER" | "CHEQUE" | "ONLINE"
      chequeNumber,
      description,
      notes,
    } = body;

    if (!voucherType || !debitAccount || !creditAccount || !amount || Number(amount) <= 0 || !description) {
      return NextResponse.json({ error: "Required voucher fields missing (voucherType, debitAccount, creditAccount, amount, description)" }, { status: 400 });
    }

    const parsedAmount = Math.round(Number(amount) * 100) / 100;

    const voucher = await prisma.$transaction(async (tx) => {
      const voucherNumber = await getNextVoucherNumber(tx, voucherType as any);

      // Auto resolve partyName if missing but partyId provided
      let resolvedPartyName = partyName || null;
      if (partyId && !resolvedPartyName) {
        if (partyType === "VENDOR") {
          const v = await tx.vendor.findUnique({ where: { id: partyId } });
          if (v) resolvedPartyName = v.name;
        } else if (partyType === "EMPLOYEE") {
          const e = await tx.employee.findUnique({ where: { id: partyId } });
          if (e) resolvedPartyName = e.name;
        }
      }

      const entry = await recordLedgerEntry(tx, {
        description,
        debitAccount,
        creditAccount,
        amount: parsedAmount,
        referenceType: "VOUCHER",
        referenceId: voucherNumber,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        partyType: partyType || "GENERAL",
        partyId: partyId || null,
        partyName: resolvedPartyName,
        voucherType,
        voucherNumber,
        paymentMethod: paymentMethod || "CASH",
        chequeNumber: chequeNumber || null,
        notes: notes || null,
      });

      return entry;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Auto-create/upsert customer profile if this voucher was for a CUSTOMER
    if (voucher.partyType === "CUSTOMER" && voucher.partyName) {
      try {
        const pName = voucher.partyName.trim();
        const existingCust = await prisma.customer.findFirst({
          where: { name: { equals: pName, mode: "insensitive" } },
        });
        if (!existingCust) {
          // Check if there are other transactions for this party to grab phone/address
          const sampleInv = await prisma.invoice.findFirst({
            where: { clientName: { equals: pName, mode: "insensitive" } },
          });
          const phone = sampleInv?.clientPhone || `0300-${Math.floor(1000000 + Math.random() * 9000000)}`;
          const address = sampleInv?.clientAddress || null;

          await prisma.customer.create({
            data: {
              name: pName,
              phone,
              address,
              notes: `Auto-registered from financial voucher ${voucher.voucherNumber}`,
            },
          });
        }
      } catch (err) {
        console.error("Auto customer profile creation error from voucher:", err);
      }
    }

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Voucher",
      entityId: voucher.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: voucher,
    });

    return NextResponse.json({
      success: true,
      message: `Voucher ${voucher.voucherNumber} recorded successfully`,
      voucher,
    });
  } catch (error: any) {
    console.error("[Voucher POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
