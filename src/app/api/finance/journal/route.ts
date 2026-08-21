import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { postJournalEntry, CANONICAL_ACCOUNTS } from "@/lib/journal";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const sourceType = searchParams.get("sourceType") || undefined;

    const entries = await prisma.journalEntry.findMany({
      where: {
        sourceType,
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { entryDate: "desc" },
      take: limit,
    });

    const accounts = await prisma.account.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ entries, accounts });
  } catch (error: any) {
    console.error("[Journal GET] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      debitAccount,
      creditAccount,
      amount,
      narration,
      entryDate,
      partyType, // "CUSTOMER" | "VENDOR" | "EMPLOYEE"
      partyId,   // Specific UUID
      idempotencyKey,
    } = body;

    if (!debitAccount || !creditAccount || !amount || Number(amount) <= 0 || !narration) {
      return NextResponse.json(
        { error: "debitAccount, creditAccount, positive amount, and narration are required." },
        { status: 400 }
      );
    }

    if (debitAccount === creditAccount) {
      return NextResponse.json(
        { error: "Debit and Credit accounts must be different." },
        { status: 400 }
      );
    }

    const numAmount = Math.round(Number(amount) * 100) / 100;

    // Verify Party if provided
    let verifiedPartyId: string | null = null;
    if (partyId) {
      if (partyType === "CUSTOMER") {
        const c = await prisma.customer.findUnique({ where: { id: partyId } });
        if (!c) return NextResponse.json({ error: `Customer with ID ${partyId} not found.` }, { status: 400 });
        verifiedPartyId = c.id;
      } else if (partyType === "VENDOR") {
        const v = await prisma.vendor.findUnique({ where: { id: partyId } });
        if (!v) return NextResponse.json({ error: `Vendor with ID ${partyId} not found.` }, { status: 400 });
        verifiedPartyId = v.id;
      } else if (partyType === "EMPLOYEE") {
        const e = await prisma.employee.findUnique({ where: { id: partyId } });
        if (!e) return NextResponse.json({ error: `Employee with ID ${partyId} not found.` }, { status: 400 });
        verifiedPartyId = e.id;
      }
    }

    // Generate unique idempotency key if none supplied
    const finalKey = idempotencyKey || `MANUAL:${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    const journalEntry = await prisma.$transaction(async (tx) => {
      return await postJournalEntry(tx, {
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        narration: narration.trim(),
        sourceType: "MANUAL",
        sourceId: null,
        idempotencyKey: finalKey,
        lines: [
          {
            accountName: debitAccount,
            partyId: verifiedPartyId,
            debit: numAmount,
            credit: 0,
          },
          {
            accountName: creditAccount,
            partyId: verifiedPartyId,
            debit: 0,
            credit: numAmount,
          },
        ],
      });
    });

    return NextResponse.json({ success: true, journalEntry });
  } catch (error: any) {
    console.error("[Journal POST] Error:", error);
    if (error.message && error.message.includes("idempotencyKey")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
