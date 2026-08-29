import { NextRequest, NextResponse } from "next/server";
import { rollbackSnapshot } from "@/lib/audit";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "ADMIN")) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin privileges required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { snapshotId } = body;

    if (!snapshotId) {
      return NextResponse.json({ success: false, error: "Missing snapshotId" }, { status: 400 });
    }

    const currentActor = { id: session.id, email: session.email };

    const result = await rollbackSnapshot(snapshotId, currentActor);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Rollback API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
