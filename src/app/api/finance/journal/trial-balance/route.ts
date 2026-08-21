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
    const accounts = await prisma.account.findMany({
      include: {
        journalLines: true,
      },
      orderBy: { name: "asc" },
    });

    let overallDebit = 0;
    let overallCredit = 0;

    const rows = accounts.map((acc: any) => {
      let debitTotal = 0;
      let creditTotal = 0;

      acc.journalLines.forEach((l: any) => {
        debitTotal += Number(l.debit);
        creditTotal += Number(l.credit);
      });

      overallDebit += debitTotal;
      overallCredit += creditTotal;

      const netDebit = debitTotal > creditTotal ? debitTotal - creditTotal : 0;
      const netCredit = creditTotal > debitTotal ? creditTotal - debitTotal : 0;

      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        isPartyControl: acc.isPartyControl,
        totalDebit: debitTotal,
        totalCredit: creditTotal,
        netDebit,
        netCredit,
        lineCount: acc.journalLines.length,
      };
    });

    const isBalanced = Math.abs(overallDebit - overallCredit) < 0.01;

    return NextResponse.json({
      trialBalance: rows,
      totals: {
        totalDebit: overallDebit,
        totalCredit: overallCredit,
        diff: overallDebit - overallCredit,
        isBalanced,
      },
    });
  } catch (error: any) {
    console.error("[Trial Balance GET] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
