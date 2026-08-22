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
    const limit = parseInt(searchParams.get("limit") || "150", 10);
    const sourceType = searchParams.get("sourceType") || undefined;
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const partyId = searchParams.get("partyId") || undefined;
    const accountId = searchParams.get("accountId") || undefined;

    const where: any = {};

    if (sourceType) {
      where.sourceType = sourceType;
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

    if (partyId) {
      where.lines = { some: { partyId } };
    }

    if (accountId) {
      where.lines = { some: { accountId } };
    }

    if (search) {
      where.OR = [
        { narration: { contains: search, mode: "insensitive" } },
        { sourceType: { contains: search, mode: "insensitive" } },
        { sourceId: { contains: search, mode: "insensitive" } },
        {
          lines: {
            some: {
              account: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    const [entries, accounts, customers, vendors, employees] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
        orderBy: { entryDate: "desc" },
        take: limit,
      }),
      prisma.account.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.customer.findMany({ select: { id: true, name: true, phone: true } }),
      prisma.vendor.findMany({ select: { id: true, name: true, phone: true } }),
      prisma.employee.findMany({ select: { id: true, name: true, phone: true } }),
    ]);

    const partyMap = new Map<string, { id: string; name: string; type: string }>();
    customers.forEach((c) => partyMap.set(c.id, { id: c.id, name: c.name, type: "Customer" }));
    vendors.forEach((v) => partyMap.set(v.id, { id: v.id, name: v.name, type: "Vendor" }));
    employees.forEach((e) => partyMap.set(e.id, { id: e.id, name: e.name, type: "Employee" }));

    let companyTotalDebit = 0;
    let companyTotalCredit = 0;

    const enrichedEntries = entries.map((entry: any) => {
      let entryDebit = 0;
      let entryCredit = 0;

      const enrichedLines = entry.lines.map((line: any) => {
        const d = Number(line.debit);
        const c = Number(line.credit);
        entryDebit += d;
        entryCredit += c;
        companyTotalDebit += d;
        companyTotalCredit += c;

        const party = line.partyId ? partyMap.get(line.partyId) : null;

        return {
          id: line.id,
          accountId: line.accountId,
          accountName: line.account.name,
          accountType: line.account.type,
          isPartyControl: line.account.isPartyControl,
          partyId: line.partyId,
          partyName: party ? party.name : null,
          partyType: party ? party.type : null,
          debit: d,
          credit: c,
        };
      });

      return {
        id: entry.id,
        entryDate: entry.entryDate,
        narration: entry.narration,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        idempotencyKey: entry.idempotencyKey,
        totalDebit: Math.round(entryDebit * 100) / 100,
        totalCredit: Math.round(entryCredit * 100) / 100,
        isBalanced: Math.round(entryDebit * 100) === Math.round(entryCredit * 100),
        lines: enrichedLines,
      };
    });

    return NextResponse.json({
      entries: enrichedEntries,
      accounts,
      totals: {
        totalDebit: Math.round(companyTotalDebit * 100) / 100,
        totalCredit: Math.round(companyTotalCredit * 100) / 100,
        isBalanced: Math.round(companyTotalDebit * 100) === Math.round(companyTotalCredit * 100),
        count: enrichedEntries.length,
      },
    });
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
