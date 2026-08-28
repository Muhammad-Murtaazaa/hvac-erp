import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { getPartyLedgerReportData } from "@/lib/partyLedger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "VIEW_REPORTS"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const partyType = searchParams.get("partyType") as "CUSTOMER" | "VENDOR" | "EMPLOYEE" | null;
    const partyId = searchParams.get("partyId") || undefined;
    const partyName = searchParams.get("partyName") || undefined;
    const startDateStr = searchParams.get("startDate") || undefined;
    const endDateStr = searchParams.get("endDate") || undefined;

    if (!partyType) {
      return NextResponse.json({ error: "partyType is required (CUSTOMER, VENDOR, EMPLOYEE)" }, { status: 400 });
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
