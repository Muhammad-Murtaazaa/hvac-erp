import { NextRequest, NextResponse } from "next/server";
import { rollbackSnapshot } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { snapshotId, actor } = body;

    if (!snapshotId) {
      return NextResponse.json({ success: false, error: "Missing snapshotId" }, { status: 400 });
    }

    const currentActor = actor || { id: "system-admin", email: "admin@erp.local" };

    const result = await rollbackSnapshot(snapshotId, currentActor);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Rollback API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
