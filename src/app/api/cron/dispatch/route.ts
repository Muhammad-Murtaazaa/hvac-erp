import { NextRequest, NextResponse } from "next/server";
import { processDueScheduledReports } from "@/lib/cron-scheduler";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const results = await processDueScheduledReports();
    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error: any) {
    console.error("Cron Dispatch API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
