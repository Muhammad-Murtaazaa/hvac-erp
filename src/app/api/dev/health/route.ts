import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, isDeveloper } from "@/lib/auth";

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

    // 1. Measure DB query latency & version
    const startDb = performance.now();
    let dbStatus = "CONNECTED";
    let dbVersion = "";
    let dbTime = "";
    let latencyMs = 0;

    try {
      const rawRes: any[] = await prisma.$queryRaw`SELECT NOW() as db_time, version() as db_version`;
      latencyMs = Math.round((performance.now() - startDb) * 100) / 100;
      if (rawRes && rawRes[0]) {
        dbTime = String(rawRes[0].db_time || "");
        dbVersion = String(rawRes[0].db_version || "").split(" on ")[0];
      }
    } catch (dbErr: any) {
      dbStatus = "ERROR: " + (dbErr.message || "Unreachable");
      latencyMs = Math.round(performance.now() - startDb);
    }

    // 2. Fetch live table record counts in parallel
    const [
      usersCount,
      customersCount,
      vendorsCount,
      employeesCount,
      productsCount,
      invoicesCount,
      quotationsCount,
      deliveryOrdersCount,
      purchaseOrdersCount,
      grnsCount,
      ledgerEntriesCount,
      journalEntriesCount,
      journalLinesCount,
      accountsCount,
      complaintsCount,
      auditSnapshotsCount,
      auditLogsCount,
      loginLogsCount,
    ] = await Promise.all([
      prisma.user.count().catch(() => -1),
      prisma.customer.count().catch(() => -1),
      prisma.vendor.count().catch(() => -1),
      prisma.employee.count().catch(() => -1),
      prisma.product.count().catch(() => -1),
      prisma.invoice.count().catch(() => -1),
      prisma.quotation.count().catch(() => -1),
      prisma.deliveryOrder.count().catch(() => -1),
      prisma.purchaseOrder.count().catch(() => -1),
      prisma.goodsReceivedNote.count().catch(() => -1),
      prisma.ledgerEntry.count().catch(() => -1),
      prisma.journalEntry.count().catch(() => -1),
      prisma.journalLine.count().catch(() => -1),
      prisma.account.count().catch(() => -1),
      prisma.complaint.count().catch(() => -1),
      prisma.auditSnapshot.count().catch(() => -1),
      prisma.auditLog.count().catch(() => -1),
      prisma.loginActivityLog.count().catch(() => -1),
    ]);

    // 3. Node.js runtime stats
    const mem = process.memoryUsage();
    const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeFormatted = `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds % 60}s`;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      runtime: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptimeSeconds,
        uptimeFormatted,
        memory: {
          rssMb: toMB(mem.rss),
          heapTotalMb: toMB(mem.heapTotal),
          heapUsedMb: toMB(mem.heapUsed),
          externalMb: toMB(mem.external),
        },
      },
      database: {
        status: dbStatus,
        latencyMs,
        version: dbVersion,
        serverTime: dbTime,
      },
      counts: {
        users: usersCount,
        customers: customersCount,
        vendors: vendorsCount,
        employees: employeesCount,
        products: productsCount,
        invoices: invoicesCount,
        quotations: quotationsCount,
        deliveryOrders: deliveryOrdersCount,
        purchaseOrders: purchaseOrdersCount,
        grns: grnsCount,
        ledgerEntries: ledgerEntriesCount,
        journalEntries: journalEntriesCount,
        journalLines: journalLinesCount,
        accounts: accountsCount,
        complaints: complaintsCount,
        auditSnapshots: auditSnapshotsCount,
        auditLogs: auditLogsCount,
        loginLogs: loginLogsCount,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        hasDbUrl: Boolean(process.env.DATABASE_URL),
        hasJwtSecret: Boolean(process.env.JWT_SECRET),
        hasBrevoKey: Boolean(process.env.BREVO_API_KEY),
        hasSmtpUser: Boolean(process.env.SMTP_USER),
        hasFirebaseKey: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY),
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
        hasWhatsAppToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      },
    });
  } catch (error: any) {
    console.error("[DEV HEALTH API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query system health" },
      { status: 500 }
    );
  }
}
