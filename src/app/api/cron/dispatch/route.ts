import { NextRequest, NextResponse } from "next/server";
import { processDueScheduledReports } from "@/lib/cron-scheduler";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "hvac_erp_cron_internal_token";

    const isBearerAuthorized = authHeader === `Bearer ${cronSecret}`;
    
    // Also allow authenticated admin sessions to trigger manual cron run
    let isAdminSession = false;
    if (!isBearerAuthorized) {
      const session = await getCurrentUser(req);
      if (session && hasPermission(session, "ADMIN")) {
        isAdminSession = true;
      }
    }

    if (!isBearerAuthorized && !isAdminSession) {
      return NextResponse.json({ success: false, error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const results = await processDueScheduledReports();
    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error: any) {
    console.error("Cron Dispatch API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
