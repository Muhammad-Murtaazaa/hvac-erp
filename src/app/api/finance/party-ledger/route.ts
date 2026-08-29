import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { getPartyLedgerReportData, PartyLedgerType } from "@/lib/partyLedger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "VIEW_REPORTS"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const rawPartyType = searchParams.get("partyType")?.toUpperCase();
    const partyType: PartyLedgerType =
      rawPartyType === "VENDOR"
        ? "VENDOR"
        : rawPartyType === "EMPLOYEE"
        ? "EMPLOYEE"
        : rawPartyType === "CONSOLIDATED" || rawPartyType === "ALL" || rawPartyType === "UNIFIED"
        ? "CONSOLIDATED"
        : "CUSTOMER";
    const partyId = searchParams.get("partyId") || undefined;
    const partyName = searchParams.get("partyName") || undefined;
    const startDateStr = searchParams.get("startDate") || undefined;
    const endDateStr = searchParams.get("endDate") || undefined;

    if (!partyName && !partyId) {
      return NextResponse.json({ error: "partyName or partyId is required" }, { status: 400 });
    }

    const reportData = await getPartyLedgerReportData({
      partyType,
      partyId,
      partyName,
      startDateStr,
      endDateStr,
    });

    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error("[Party Ledger GET] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
