import { NextRequest, NextResponse } from "next/server";
import { executeCopilotQuery, checkRateLimit } from "@/lib/ai/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateCheck = checkRateLimit(ip);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please wait a minute before sending another request." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await req.json();
    const { prompt, history } = body;

    if (!prompt) {
      return NextResponse.json({ success: false, error: "Prompt is required." }, { status: 400 });
    }

    const result = await executeCopilotQuery(prompt, history || []);

    return NextResponse.json({
      success: true,
      ...result,
      remainingQuota: rateCheck.remaining,
    });
  } catch (error: any) {
    console.error("Copilot Chat API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
