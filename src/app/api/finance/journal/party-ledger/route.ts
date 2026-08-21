import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const partyId = searchParams.get("partyId");
    const partyType = searchParams.get("partyType") as "CUSTOMER" | "VENDOR" | "EMPLOYEE" | null;

    if (!partyId) {
      return NextResponse.json({ error: "partyId is required" }, { status: 400 });
    }

    // Get party profile
    let partyName = "Unknown Party";
    let partyDetails: any = null;

    if (partyType === "CUSTOMER") {
      const c = await prisma.customer.findUnique({ where: { id: partyId } });
      if (c) { partyName = c.name; partyDetails = c; }
    } else if (partyType === "VENDOR") {
      const v = await prisma.vendor.findUnique({ where: { id: partyId } });
      if (v) { partyName = v.name; partyDetails = v; }
    } else if (partyType === "EMPLOYEE") {
      const e = await prisma.employee.findUnique({ where: { id: partyId } });
      if (e) { partyName = e.name; partyDetails = e; }
    }

    // Query JournalLines strictly for this party
    const lines = await prisma.journalLine.findMany({
      where: {
        partyId,
      },
      include: {
        account: true,
        journalEntry: true,
      },
      orderBy: [
        { journalEntry: { entryDate: "asc" } },
        { createdAt: "asc" },
      ],
    });

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const transactions = lines.map((l: any) => {
      const d = Number(l.debit);
      const c = Number(l.credit);
      totalDebit += d;
      totalCredit += c;

      // In accounting:
      // For Customer (Asset / AR): Debit increases receivable, Credit decreases
      // For Vendor (Liability / AP): Credit increases payable, Debit decreases
      const delta = (partyType === "VENDOR") ? (c - d) : (d - c);
      runningBalance += delta;

      return {
        id: l.id,
        entryDate: l.journalEntry.entryDate,
        sourceType: l.journalEntry.sourceType,
        sourceId: l.journalEntry.sourceId,
        narration: l.journalEntry.narration,
        accountName: l.account.name,
        accountType: l.account.type,
        debit: d,
        credit: c,
        runningBalance,
      };
    });

    return NextResponse.json({
      party: {
        id: partyId,
        name: partyName,
        type: partyType,
        details: partyDetails,
      },
      totals: {
        totalDebit,
        totalCredit,
        closingBalance: runningBalance,
      },
      transactions,
    });
  } catch (error: any) {
    console.error("[Double-Entry Party Ledger GET] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
