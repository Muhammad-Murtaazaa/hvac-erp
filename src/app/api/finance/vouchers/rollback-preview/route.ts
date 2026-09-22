import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const voucherNumber = searchParams.get("voucherNumber");
    const voucherId = searchParams.get("voucherId");

    if (!voucherNumber && !voucherId) {
      return NextResponse.json({ error: "voucherNumber or voucherId is required" }, { status: 400 });
    }

    const where: any = {};
    if (voucherId) where.id = voucherId;
    if (voucherNumber) where.voucherNumber = voucherNumber;

    const ledgerEntry = await prisma.ledgerEntry.findFirst({ where });
    if (!ledgerEntry) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    const vNum = ledgerEntry.voucherNumber || ledgerEntry.referenceId;

    // Find all matching ledger entries (in case of split legs)
    const matchingLedgers = await prisma.ledgerEntry.findMany({
      where: {
        OR: [
          { id: ledgerEntry.id },
          ...(vNum ? [{ voucherNumber: vNum }] : []),
        ],
      },
    });

    // Find all linked journal entries
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        OR: [
          ...(vNum ? [{ sourceId: vNum }, { idempotencyKey: `VOUCHER:${vNum}:entry` }, { idempotencyKey: { contains: vNum } }] : []),
          { sourceId: ledgerEntry.id },
        ],
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    const totalLines = journalEntries.reduce((sum: number, je: any) => sum + (je.lines?.length || 0), 0);
    const affectedAccounts = Array.from(
      new Set(journalEntries.flatMap((je: any) => (je.lines || []).map((l: any) => l.account?.name || "")))
    ).filter(Boolean);

    return NextResponse.json({
      success: true,
      voucher: ledgerEntry,
      impact: {
        ledgerEntriesCount: matchingLedgers.length,
        journalEntriesCount: journalEntries.length,
        journalLinesCount: totalLines,
        affectedAccounts,
        amount: Number(ledgerEntry.amount),
        partyName: ledgerEntry.partyName,
        debitAccount: ledgerEntry.debitAccount,
        creditAccount: ledgerEntry.creditAccount,
        date: ledgerEntry.entryDate,
      },
      journalEntries,
    });
  } catch (error: any) {
    console.error("[Rollback Preview Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to generate preview" }, { status: 500 });
  }
}
