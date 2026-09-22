import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, isDeveloper } from "@/lib/auth";
import { logDevEvent } from "@/lib/devLogger";

export const dynamic = "force-dynamic";

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
    const task = body.task; // "stock_recalculate" | "trial_balance_scan" | "orphan_detect" | "voucher_inspect"

    // TASK 1: Stock Recalculator (Dry-Run / Apply)
    if (task === "stock_recalculate") {
      const mode = body.mode === "apply" ? "apply" : "dry_run";

      const products = await prisma.product.findMany({
        include: {
          grnLineItems: {
            select: {
              quantityReceived: true,
            },
          },
          doLineItems: {
            select: {
              quantity: true,
            },
          },
          stockAdjustments: {
            select: {
              adjustedQty: true,
            },
          },
          returnLineItems: {
            select: {
              quantity: true,
            },
          },
        },
      });

      const discrepancies: any[] = [];
      let totalDiscrepancies = 0;

      for (const p of products) {
        // Calculate theoretical stock from GRN received - DO dispatched + returns + adjustments
        const grnIn = p.grnLineItems.reduce((sum: number, item: any) => sum + (item.quantityReceived || 0), 0);
        const doOut = p.doLineItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        const returnsIn = p.returnLineItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

        let adjustmentsDelta = 0;
        for (const adj of p.stockAdjustments) {
          adjustmentsDelta += adj.adjustedQty;
        }

        // If product has transaction history, compare
        const computedQty = grnIn - doOut + returnsIn + adjustmentsDelta;
        const currentQty = p.onHandQty;

        // Flag discrepancy if movement history exists and diverges from stored balance
        if ((grnIn > 0 || doOut > 0) && computedQty !== currentQty) {
          discrepancies.push({
            productId: p.id,
            sku: p.sku,
            name: p.name,
            currentOnHand: currentQty,
            computedFromLedger: computedQty,
            delta: computedQty - currentQty,
            breakdown: { grnIn, doOut, returnsIn, adjustmentsDelta },
          });
          totalDiscrepancies++;
        }
      }

      if (mode === "apply" && discrepancies.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const d of discrepancies) {
            await tx.product.update({
              where: { id: d.productId },
              data: { onHandQty: d.computedFromLedger },
            });
          }

          // Create audit snapshot for developer repair action
          await tx.auditSnapshot.create({
            data: {
              entityName: "ProductStockMaintenance",
              entityId: "BATCH_STOCK_RECALC",
              action: "UPDATE",
              actorId: session.id,
              actorEmail: session.email,
              diff: JSON.stringify({
                totalAdjusted: discrepancies.length,
                discrepancies,
              }),
            },
          });
        });

        logDevEvent(
          "INFO",
          "INVENTORY",
          `Stock recalculator applied repairs to ${discrepancies.length} products by ${session.email}`
        );
      }

      return NextResponse.json({
        success: true,
        mode,
        totalProductsScanned: products.length,
        discrepanciesFound: discrepancies.length,
        discrepancies: discrepancies.slice(0, 50),
        message:
          mode === "apply"
            ? `Successfully recalculated and reconciled ${discrepancies.length} products.`
            : `Dry run complete. Discovered ${discrepancies.length} products with stock deviations.`,
      });
    }

    // TASK 2: Trial Balance & Journal Entry Deep Scan
    if (task === "trial_balance_scan") {
      const entries = await prisma.journalEntry.findMany({
        include: {
          lines: {
            select: {
              debit: true,
              credit: true,
              accountId: true,
            },
          },
        },
      });

      const unbalancedEntries: any[] = [];
      let totalLines = 0;
      let totalDebit = 0;
      let totalCredit = 0;

      for (const entry of entries) {
        let entryDebit = 0;
        let entryCredit = 0;

        for (const line of entry.lines) {
          entryDebit += Number(line.debit);
          entryCredit += Number(line.credit);
          totalLines++;
        }

        totalDebit += entryDebit;
        totalCredit += entryCredit;

        const delta = Math.round(Math.abs(entryDebit - entryCredit) * 100) / 100;
        if (delta >= 0.05) {
          unbalancedEntries.push({
            id: entry.id,
            entryDate: entry.entryDate,
            narration: entry.narration,
            sourceType: entry.sourceType,
            sourceId: entry.sourceId,
            entryDebit,
            entryCredit,
            delta,
            linesCount: entry.lines.length,
          });
        }
      }

      const totalDelta = Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100;

      return NextResponse.json({
        success: true,
        totalEntriesScanned: entries.length,
        totalLinesScanned: totalLines,
        totalDebit,
        totalCredit,
        totalDelta,
        isBalanced: totalDelta < 0.05 && unbalancedEntries.length === 0,
        unbalancedCount: unbalancedEntries.length,
        unbalancedEntries,
      });
    }

    // TASK 3: Orphan Records Detector
    if (task === "orphan_detect") {
      const [
        orphanInvoiceLines,
        orphanPayments,
        orphanComplaintTimelines,
        orphanPOLines,
      ] = await Promise.all([
        prisma.invoiceLineItem.findMany({
          where: { invoice: { is: null as any } },
          select: { id: true, invoiceId: true, description: true },
          take: 20,
        }).catch(() => []),
        prisma.payment.findMany({
          where: { invoice: { is: null as any } },
          select: { id: true, invoiceId: true, amountPaid: true },
          take: 20,
        }).catch(() => []),
        prisma.complaintTimeline.findMany({
          where: { complaint: { is: null as any } },
          select: { id: true, complaintId: true, remarks: true },
          take: 20,
        }).catch(() => []),
        prisma.pOLineItem.findMany({
          where: { purchaseOrder: { is: null as any } },
          select: { id: true, poId: true, quantityOrdered: true },
          take: 20,
        }).catch(() => []),
      ]);

      const totalOrphans =
        orphanInvoiceLines.length +
        orphanPayments.length +
        orphanComplaintTimelines.length +
        orphanPOLines.length;

      return NextResponse.json({
        success: true,
        totalOrphans,
        findings: {
          orphanInvoiceLines: { count: orphanInvoiceLines.length, items: orphanInvoiceLines },
          orphanPayments: { count: orphanPayments.length, items: orphanPayments },
          orphanComplaintTimelines: { count: orphanComplaintTimelines.length, items: orphanComplaintTimelines },
          orphanPOLines: { count: orphanPOLines.length, items: orphanPOLines },
        },
      });
    }

    // TASK 4: Voucher Deep Inspection
    if (task === "voucher_inspect") {
      const voucherNo = (body.voucherNumber || "").trim();
      if (!voucherNo) {
        return NextResponse.json({ error: "Voucher number is required" }, { status: 400 });
      }

      // Look in LedgerEntry
      const ledgerEntries = await prisma.ledgerEntry.findMany({
        where: {
          OR: [
            { voucherNumber: { equals: voucherNo, mode: "insensitive" } },
            { referenceId: { equals: voucherNo, mode: "insensitive" } },
            { id: { equals: voucherNo, mode: "insensitive" } },
          ],
        },
      });

      // Look in JournalEntry
      const journalEntries = await prisma.journalEntry.findMany({
        where: {
          OR: [
            { narration: { contains: voucherNo, mode: "insensitive" } },
            { sourceId: { equals: voucherNo, mode: "insensitive" } },
            { id: { equals: voucherNo, mode: "insensitive" } },
          ],
        },
        include: {
          lines: {
            include: {
              account: { select: { name: true, type: true } },
            },
          },
        },
      });

      // Also search audit snapshots for this voucher
      const auditTrail = await prisma.auditSnapshot.findMany({
        where: {
          OR: [
            { entityId: { contains: voucherNo, mode: "insensitive" } },
            { diff: { contains: voucherNo, mode: "insensitive" } },
          ],
        },
        take: 10,
        orderBy: { timestamp: "desc" },
      });

      return NextResponse.json({
        success: true,
        voucherNumber: voucherNo,
        ledgerCount: ledgerEntries.length,
        journalCount: journalEntries.length,
        ledgerEntries,
        journalEntries,
        auditTrail,
      });
    }

    return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
  } catch (error: any) {
    console.error("[DEV MAINTENANCE API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute maintenance task" },
      { status: 500 }
    );
  }
}
