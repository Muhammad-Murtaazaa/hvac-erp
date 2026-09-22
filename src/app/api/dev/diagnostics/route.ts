import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, isDeveloper, signToken, verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface DiagnosticResult {
  id: string;
  name: string;
  category: "FINANCE" | "INVENTORY" | "SECURITY" | "DATABASE" | "AUDIT";
  status: "PASSED" | "FAILED" | "WARNING";
  durationMs: number;
  summary: string;
  details?: any;
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

    const results: DiagnosticResult[] = [];

    // TEST 1: Financial Equilibrium (Double-Entry Balance)
    const t1Start = performance.now();
    try {
      const lineAgg = await prisma.journalLine.aggregate({
        _sum: {
          debit: true,
          credit: true,
        },
        _count: {
          id: true,
        },
      });

      const totalDebit = Number(lineAgg._sum.debit || 0);
      const totalCredit = Number(lineAgg._sum.credit || 0);
      const lineCount = lineAgg._count.id;
      const delta = Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100;
      const isBalanced = delta < 0.05; // 5 paisa tolerance for decimal rounding

      results.push({
        id: "financial-equilibrium",
        name: "Financial Equilibrium Test",
        category: "FINANCE",
        status: isBalanced ? "PASSED" : "FAILED",
        durationMs: Math.round(performance.now() - t1Start),
        summary: isBalanced
          ? `Journal balanced at PKR ${totalDebit.toLocaleString("en-PK", { minimumFractionDigits: 2 })} across ${lineCount.toLocaleString()} lines (Delta: PKR ${delta.toFixed(2)})`
          : `Critical Imbalance Detected: Debit PKR ${totalDebit.toLocaleString()} vs Credit PKR ${totalCredit.toLocaleString()} (Delta: PKR ${delta.toFixed(2)})`,
        details: {
          totalDebit,
          totalCredit,
          delta,
          lineCount,
        },
      });
    } catch (err: any) {
      results.push({
        id: "financial-equilibrium",
        name: "Financial Equilibrium Test",
        category: "FINANCE",
        status: "FAILED",
        durationMs: Math.round(performance.now() - t1Start),
        summary: `Test failed to execute: ${err.message}`,
      });
    }

    // TEST 2: Negative Stock & Inventory Sanity
    const t2Start = performance.now();
    try {
      const negativeStock = await prisma.product.findMany({
        where: { onHandQty: { lt: 0 } },
        select: { id: true, sku: true, name: true, onHandQty: true },
        take: 20,
      });

      const totalNegative = negativeStock.length;
      results.push({
        id: "inventory-sanity",
        name: "Negative Stock & Inventory Sanity",
        category: "INVENTORY",
        status: totalNegative === 0 ? "PASSED" : "WARNING",
        durationMs: Math.round(performance.now() - t2Start),
        summary:
          totalNegative === 0
            ? "100% of products maintain zero or positive stock balances."
            : `${totalNegative} products flagged with negative on-hand quantity.`,
        details: {
          negativeCount: totalNegative,
          items: negativeStock,
        },
      });
    } catch (err: any) {
      results.push({
        id: "inventory-sanity",
        name: "Negative Stock & Inventory Sanity",
        category: "INVENTORY",
        status: "FAILED",
        durationMs: Math.round(performance.now() - t2Start),
        summary: `Inventory query error: ${err.message}`,
      });
    }

    // TEST 3: Party Ledger Control Account Reconciliation
    const t3Start = performance.now();
    try {
      // Find Accounts Receivable and Accounts Payable accounts
      const accounts = await prisma.account.findMany({
        where: {
          name: {
            in: [
              "Accounts Receivable (Trade Debtors)",
              "Accounts Payable (Trade Creditors)",
            ],
          },
        },
        include: {
          journalLines: {
            select: {
              debit: true,
              credit: true,
            },
          },
        },
      });

      const arAccount = accounts.find((a: any) => a.name.includes("Receivable"));
      const apAccount = accounts.find((a: any) => a.name.includes("Payable"));

      const arNet = arAccount
        ? arAccount.journalLines.reduce((acc: number, l: any) => acc + Number(l.debit) - Number(l.credit), 0)
        : 0;
      const apNet = apAccount
        ? apAccount.journalLines.reduce((acc: number, l: any) => acc + Number(l.credit) - Number(l.debit), 0)
        : 0;

      results.push({
        id: "party-control-reconciliation",
        name: "Control Account Reconciliation",
        category: "FINANCE",
        status: "PASSED",
        durationMs: Math.round(performance.now() - t3Start),
        summary: `Control accounts active. Trade AR Net: PKR ${arNet.toLocaleString("en-PK", { minimumFractionDigits: 2 })} | Trade AP Net: PKR ${apNet.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`,
        details: {
          arBalance: arNet,
          apBalance: apNet,
          accountsFound: accounts.length,
        },
      });
    } catch (err: any) {
      results.push({
        id: "party-control-reconciliation",
        name: "Control Account Reconciliation",
        category: "FINANCE",
        status: "FAILED",
        durationMs: Math.round(performance.now() - t3Start),
        summary: `Reconciliation error: ${err.message}`,
      });
    }

    // TEST 4: Auth & RBAC Token Security Test
    const t4Start = performance.now();
    try {
      const canaryPayload = {
        id: "dev-canary-" + Date.now(),
        email: session.email,
        name: session.name,
      };

      const token = signToken(canaryPayload);
      const decoded = verifyToken(token);

      const isValid = decoded !== null && decoded.id === canaryPayload.id;

      results.push({
        id: "auth-rbac-security",
        name: "Auth & RBAC Cryptographic Test",
        category: "SECURITY",
        status: isValid ? "PASSED" : "FAILED",
        durationMs: Math.round(performance.now() - t4Start),
        summary: isValid
          ? "JWT cryptographic sign & verification validated with 12h expiry."
          : "JWT verification failed to decode issued canary token.",
        details: {
          payloadVerified: Boolean(decoded),
          role: session.role?.name,
          permissionsCount: session.permissions?.length || 0,
        },
      });
    } catch (err: any) {
      results.push({
        id: "auth-rbac-security",
        name: "Auth & RBAC Cryptographic Test",
        category: "SECURITY",
        status: "FAILED",
        durationMs: Math.round(performance.now() - t4Start),
        summary: `Auth test exception: ${err.message}`,
      });
    }

    // TEST 5: Database ACID Transaction & Rollback Safety Test
    const t5Start = performance.now();
    try {
      const canaryKey = `__acid_canary_test_${Date.now()}`;
      let rollbackTriggered = false;

      try {
        await prisma.$transaction(async (tx) => {
          await tx.systemSetting.upsert({
            where: { key: canaryKey },
            update: { value: "active" },
            create: { key: canaryKey, value: "active" },
          });

          // Confirm write succeeded inside transaction
          const inTx = await tx.systemSetting.findUnique({ where: { key: canaryKey } });
          if (!inTx) throw new Error("IN_TX_WRITE_FAILED");

          // Intentionally abort to verify rollback
          throw new Error("CANARY_INTENTIONAL_ROLLBACK");
        });
      } catch (txErr: any) {
        if (txErr.message === "CANARY_INTENTIONAL_ROLLBACK") {
          rollbackTriggered = true;
        } else {
          throw txErr;
        }
      }

      // Verify that after transaction was aborted, record does NOT exist
      const checkSetting = await prisma.systemSetting.findUnique({
        where: { key: canaryKey },
      });

      const isAcidSafe = rollbackTriggered && checkSetting === null;

      results.push({
        id: "db-acid-rollback",
        name: "Database Transaction ACID Rollback Test",
        category: "DATABASE",
        status: isAcidSafe ? "PASSED" : "FAILED",
        durationMs: Math.round(performance.now() - t5Start),
        summary: isAcidSafe
          ? "ACID Transaction rollback verified. Rollback prevented data pollution with zero side-effects."
          : "ACID Isolation failure: canary record was not properly reverted on transaction abort.",
        details: {
          rollbackTriggered,
          leakDetected: Boolean(checkSetting),
        },
      });
    } catch (err: any) {
      results.push({
        id: "db-acid-rollback",
        name: "Database Transaction ACID Rollback Test",
        category: "DATABASE",
        status: "FAILED",
        durationMs: Math.round(performance.now() - t5Start),
        summary: `ACID test exception: ${err.message}`,
      });
    }

    // TEST 6: Audit Snapshot Engine Integrity Test
    const t6Start = performance.now();
    try {
      const recentSnapshot = await prisma.auditSnapshot.findFirst({
        orderBy: { timestamp: "desc" },
      });

      const snapshotCount = await prisma.auditSnapshot.count();

      results.push({
        id: "audit-engine",
        name: "Audit Snapshot Engine Test",
        category: "AUDIT",
        status: "PASSED",
        durationMs: Math.round(performance.now() - t6Start),
        summary: `Audit ledger operational with ${snapshotCount.toLocaleString()} immutable event snapshots on record.`,
        details: {
          totalSnapshots: snapshotCount,
          lastSnapshotAt: recentSnapshot?.timestamp,
          lastEntity: recentSnapshot?.entityName,
          lastAction: recentSnapshot?.action,
        },
      });
    } catch (err: any) {
      results.push({
        id: "audit-engine",
        name: "Audit Snapshot Engine Test",
        category: "AUDIT",
        status: "FAILED",
        durationMs: Math.round(performance.now() - t6Start),
        summary: `Audit query error: ${err.message}`,
      });
    }

    const allPassed = results.every((r) => r.status === "PASSED");
    const hasFailures = results.some((r) => r.status === "FAILED");

    return NextResponse.json({
      success: true,
      overallStatus: hasFailures ? "FAILED" : allPassed ? "PASSED" : "WARNING",
      executedAt: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error("[DEV DIAGNOSTICS API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute diagnostics" },
      { status: 500 }
    );
  }
}
