import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user: session });
}
