import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
  }

  try {
    const snapshots = await prisma.auditSnapshot.findMany({
      where: {
        entityName: "Voucher",
        action: { in: ["ROLLBACK", "UPDATE"] },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    const parsed = snapshots.map((s) => {
      let before: any = null;
      let after: any = null;
      try {
        if (s.beforeState) before = JSON.parse(s.beforeState);
      } catch (_) {}
      try {
        if (s.afterState) after = JSON.parse(s.afterState);
      } catch (_) {}

      return {
        id: s.id,
        action: s.action,
        entityId: s.entityId,
        actorEmail: s.actorEmail,
        timestamp: s.timestamp,
        before,
        after,
        reason: before?.rollbackReason || null,
        voucherNumber: before?.ledgerEntry?.voucherNumber || before?.voucherNumber || after?.voucherNumber || "VOUCHER",
        amount: before?.ledgerEntry?.amount || before?.amount || after?.amount || 0,
        partyName: before?.ledgerEntry?.partyName || before?.partyName || after?.partyName || "N/A",
      };
    });

    return NextResponse.json({ success: true, history: parsed });
  } catch (error: any) {
    console.error("[Voucher Rollbacks GET Error]:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
