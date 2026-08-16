import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityName = searchParams.get("entityName") || undefined;
    const action = searchParams.get("action") || undefined;
    const actorEmail = searchParams.get("actorEmail") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    const where: any = {};
    if (entityName) where.entityName = entityName;
    if (action) where.action = action;
    if (actorEmail) where.actorEmail = { contains: actorEmail };

    const [logs, total] = await Promise.all([
      prisma.auditSnapshot.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.auditSnapshot.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Audit logs API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
