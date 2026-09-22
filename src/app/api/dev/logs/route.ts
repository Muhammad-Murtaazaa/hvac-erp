import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, isDeveloper } from "@/lib/auth";
import { getDevLogs, clearDevLogs, logDevEvent } from "@/lib/devLogger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser(req);
    if (!session || !isDeveloper(session)) {
      return NextResponse.json(
        { error: "Access Denied: Developer clearance required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") || "ALL";
    const moduleName = searchParams.get("module") || "ALL";
    const search = searchParams.get("search") || "";
    const source = searchParams.get("source") || "RUNTIME"; // RUNTIME | LOGIN | AUDIT
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

    // 1. If requesting runtime traces
    if (source === "RUNTIME") {
      const { logs, total } = getDevLogs({
        level,
        module: moduleName,
        search,
        limit,
      });

      return NextResponse.json({
        success: true,
        source: "RUNTIME",
        logs,
        total,
      });
    }

    // 2. If requesting Login Activity logs
    if (source === "LOGIN") {
      const whereClause: any = {};
      if (search) {
        whereClause.OR = [
          { email: { contains: search, mode: "insensitive" } },
          { ipAddress: { contains: search, mode: "insensitive" } },
          { status: { contains: search, mode: "insensitive" } },
        ];
      }
      if (level === "ERROR") {
        whereClause.status = "FAILED";
      } else if (level === "INFO") {
        whereClause.status = "SUCCESS";
      }

      const [loginLogs, total] = await Promise.all([
        prisma.loginActivityLog.findMany({
          where: whereClause,
          orderBy: { timestamp: "desc" },
          take: limit,
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.loginActivityLog.count({ where: whereClause }),
      ]);

      const formatted = loginLogs.map((l) => ({
        id: l.id,
        timestamp: l.timestamp.toISOString(),
        level: l.status === "FAILED" ? ("WARN" as const) : ("INFO" as const),
        module: "AUTH" as const,
        message: `Login ${l.status}: ${l.email} (IP: ${l.ipAddress || "unknown"})`,
        metadata: {
          userAgent: l.userAgent,
          userId: l.userId,
          user: l.user,
        },
      }));

      return NextResponse.json({
        success: true,
        source: "LOGIN",
        logs: formatted,
        total,
      });
    }

    // 3. If requesting Audit Snapshot logs
    const auditWhere: any = {};
    if (search) {
      auditWhere.OR = [
        { entityName: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { actorEmail: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
      ];
    }
    if (moduleName !== "ALL") {
      auditWhere.entityName = { contains: moduleName, mode: "insensitive" };
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditSnapshot.findMany({
        where: auditWhere,
        orderBy: { timestamp: "desc" },
        take: limit,
      }),
      prisma.auditSnapshot.count({ where: auditWhere }),
    ]);

    const formattedAudit = auditLogs.map((a) => ({
      id: a.id,
      timestamp: a.timestamp.toISOString(),
      level: a.action === "DELETE" || a.action === "ROLLBACK" ? ("WARN" as const) : ("INFO" as const),
      module: (a.entityName.toUpperCase() as any) || "AUDIT",
      message: `${a.action} on ${a.entityName} #${a.entityId.slice(0, 8)} by ${a.actorEmail}`,
      metadata: {
        entityName: a.entityName,
        entityId: a.entityId,
        actorEmail: a.actorEmail,
        diff: a.diff,
        isRolledBack: a.isRolledBack,
      },
      stack: a.diff ? JSON.stringify(JSON.parse(a.diff), null, 2) : undefined,
    }));

    return NextResponse.json({
      success: true,
      source: "AUDIT",
      logs: formattedAudit,
      total,
    });
  } catch (error: any) {
    console.error("[DEV LOGS API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser(req);
    if (!session || !isDeveloper(session)) {
      return NextResponse.json(
        { error: "Access Denied: Developer clearance required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    if (body.action === "clear") {
      clearDevLogs();
      logDevEvent("INFO", "CORE", `Logs flushed by developer ${session.email}`);
      return NextResponse.json({ success: true, message: "Developer runtime logs flushed successfully" });
    }

    if (body.action === "test_log") {
      const entry = logDevEvent(
        body.level || "INFO",
        body.module || "CORE",
        body.message || "Manual test log triggered from Dev Panel",
        {
          metadata: { triggeredBy: session.email, source: "DEV_PANEL" },
          stack: body.stack || new Error().stack,
        }
      );
      return NextResponse.json({ success: true, entry });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
