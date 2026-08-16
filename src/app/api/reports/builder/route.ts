import { NextRequest, NextResponse } from "next/server";
import { executeDynamicReport, ReportConfig } from "@/lib/report-compiler";

export async function POST(req: NextRequest) {
  try {
    const config: ReportConfig = await req.json();

    if (!config.entity) {
      return NextResponse.json({ success: false, error: "Missing required 'entity' field" }, { status: 400 });
    }

    const result = await executeDynamicReport(config);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Report Builder API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
