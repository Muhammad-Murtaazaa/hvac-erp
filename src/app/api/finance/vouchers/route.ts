import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission, isSuperAdmin } from "@/lib/auth";
import { getNextVoucherNumber, recordLedgerEntry } from "@/lib/ledger";
import { postJournalEntry, getAccountId } from "@/lib/journal";
import { recordAuditSnapshot } from "@/lib/audit";
import { ensureCustomer } from "@/lib/customerSync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "MANAGE_INVENTORY"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const voucherType = searchParams.get("voucherType"); // CRV, BRV, CPV, BPV, JV, CV, EAV
    const partyType = searchParams.get("partyType"); // CUSTOMER, VENDOR, EMPLOYEE, GENERAL
    const partyId = searchParams.get("partyId");
    const search = searchParams.get("search") || "";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const where: any = {};

    if (voucherType) {
      where.voucherType = voucherType;
    }

    if (partyType) {
      where.partyType = partyType;
    }

    if (partyId) {
      where.partyId = partyId;
    }

    if (startDateStr || endDateStr) {
      where.entryDate = {};
      if (startDateStr) where.entryDate.gte = new Date(startDateStr);
      if (endDateStr) {
        const end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
        where.entryDate.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { voucherNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { partyName: { contains: search, mode: "insensitive" } },
        { debitAccount: { contains: search, mode: "insensitive" } },
        { creditAccount: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const vouchers = await prisma.ledgerEntry.findMany({
      where,
      orderBy: { entryDate: "desc" },
      take: 250,
    });

    // Attach linked journal entries for rich double-entry display
    const vNumbers = vouchers.map((v) => v.voucherNumber || v.referenceId).filter(Boolean) as string[];
    let journalEntries: any[] = [];
    if (vNumbers.length > 0) {
      journalEntries = await prisma.journalEntry.findMany({
        where: {
          OR: [
            { sourceId: { in: vNumbers } },
            { idempotencyKey: { in: vNumbers.map((v) => `VOUCHER:${v}:entry`) } },
          ],
        },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      });
    }

    const journalMap = new Map<string, any>();
    for (const je of journalEntries) {
      if (je.sourceId) journalMap.set(je.sourceId, je);
      if (je.idempotencyKey) {
        const parts = je.idempotencyKey.split(":");
        if (parts.length >= 2) journalMap.set(parts[1], je);
      }
    }

    const enhancedVouchers = vouchers.map((v) => {
      const vNum = v.voucherNumber || v.referenceId || "";
      return {
        ...v,
        journalEntry: journalMap.get(vNum) || null,
      };
    });

    return NextResponse.json({ vouchers: enhancedVouchers });
  } catch (error: any) {
    console.error("[Vouchers GET] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (
    !session ||
    (!hasPermission(session, "MANAGE_FINANCIALS") &&
      !hasPermission(session, "VIEW_FINANCIALS") &&
      !hasPermission(session, "ADMIN") &&
      !hasPermission(session, "MANAGE_INVENTORY"))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      voucherType, // "CRV" | "BRV" | "CPV" | "BPV" | "JV" | "CV" | "EAV"
      entryDate,
      debitAccount,
      creditAccount,
      amount,
      partyType, // "CUSTOMER" | "VENDOR" | "EMPLOYEE" | "GENERAL"
      partyId,
      debitPartyId,
      creditPartyId,
      partyName,
      paymentMethod, // "CASH" | "BANK_TRANSFER" | "CHEQUE" | "ONLINE"
      chequeNumber,
      description,
      notes,
    } = body;

    if (!voucherType || !debitAccount || !creditAccount || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Missing required voucher fields or invalid amount" }, { status: 400 });
    }

    const parsedAmount = Math.round(Number(amount) * 100) / 100;

    const voucher = await prisma.$transaction(async (tx) => {
      const voucherNumber = await getNextVoucherNumber(tx, voucherType as any);

      // Auto resolve partyName if missing but partyId provided (and vice versa)
      let resolvedPartyId = partyId || debitPartyId || creditPartyId || null;
      let resolvedPartyName = partyName || null;
      if (resolvedPartyId && !resolvedPartyName) {
        if (partyType === "VENDOR") {
          const v = await tx.vendor.findUnique({ where: { id: resolvedPartyId } });
          if (v) resolvedPartyName = v.name;
        } else if (partyType === "EMPLOYEE") {
          const e = await tx.employee.findUnique({ where: { id: resolvedPartyId } });
          if (e) resolvedPartyName = e.name;
        } else if (partyType === "CUSTOMER") {
          const c = await tx.customer.findUnique({ where: { id: resolvedPartyId } });
          if (c) resolvedPartyName = c.name;
        }
      } else if (!resolvedPartyId && resolvedPartyName) {
        if (partyType === "VENDOR") {
          const v = await tx.vendor.findFirst({ where: { name: { equals: resolvedPartyName.trim(), mode: "insensitive" } } });
          if (v) resolvedPartyId = v.id;
        } else if (partyType === "EMPLOYEE") {
          const e = await tx.employee.findFirst({ where: { name: { equals: resolvedPartyName.trim(), mode: "insensitive" } } });
          if (e) resolvedPartyId = e.id;
        } else if (partyType === "CUSTOMER") {
          const c = await tx.customer.findFirst({ where: { name: { equals: resolvedPartyName.trim(), mode: "insensitive" } } });
          if (c) resolvedPartyId = c.id;
        }
      }

      const entry = await recordLedgerEntry(tx, {
        description,
        debitAccount,
        creditAccount,
        amount: parsedAmount,
        referenceType: "VOUCHER",
        referenceId: voucherNumber,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        partyType: partyType || "GENERAL",
        partyId: resolvedPartyId,
        partyName: resolvedPartyName,
        voucherType,
        voucherNumber,
        paymentMethod: paymentMethod || "CASH",
        chequeNumber: chequeNumber || null,
        notes: notes || null,
      });

      // Resolved party IDs for lines
      const lineDebitPartyId = debitPartyId !== undefined ? debitPartyId : resolvedPartyId;
      const lineCreditPartyId = creditPartyId !== undefined ? creditPartyId : resolvedPartyId;

      // Native Double-Entry Journal: One JournalEntry per voucher submission
      await postJournalEntry(tx, {
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        narration: description,
        sourceType: "VOUCHER",
        sourceId: voucherNumber,
        idempotencyKey: `VOUCHER:${voucherNumber}:entry`,
        lines: [
          {
            accountName: debitAccount,
            partyId: lineDebitPartyId || null,
            debit: parsedAmount,
            credit: 0,
          },
          {
            accountName: creditAccount,
            partyId: lineCreditPartyId || null,
            debit: 0,
            credit: parsedAmount,
          },
        ],
      });

      return entry;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Auto-create/upsert customer profile safely if this voucher was for a CUSTOMER
    if (voucher.partyType === "CUSTOMER" && voucher.partyName) {
      const pName = voucher.partyName.trim();
      const sampleInv = await prisma.invoice.findFirst({
        where: { clientName: { equals: pName, mode: "insensitive" } },
      });
      await ensureCustomer({
        name: pName,
        phone: sampleInv?.clientPhone || null,
        address: sampleInv?.clientAddress || null,
        notes: `Auto-registered from financial voucher ${voucher.voucherNumber}`,
      });
    }

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Voucher",
      entityId: voucher.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: voucher,
    });

    return NextResponse.json({
      success: true,
      message: `Voucher ${voucher.voucherNumber} recorded successfully`,
      voucher,
    });
  } catch (error: any) {
    console.error("[Voucher POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized. Super Admin or Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      voucherId,
      voucherNumber,
      description,
      entryDate,
      amount,
      debitAccount,
      creditAccount,
      partyName,
      partyType,
      partyId,
      paymentMethod,
      chequeNumber,
      notes,
    } = body;

    if (!voucherId && !voucherNumber) {
      return NextResponse.json({ error: "voucherId or voucherNumber is required" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ledgerWhere: any = {};
      if (voucherId) ledgerWhere.id = voucherId;
      if (voucherNumber) ledgerWhere.voucherNumber = voucherNumber;

      const currentLedger = await tx.ledgerEntry.findFirst({ where: ledgerWhere });
      if (!currentLedger) {
        throw new Error(`Financial voucher not found: ${voucherNumber || voucherId}`);
      }

      const vNum = currentLedger.voucherNumber || currentLedger.referenceId;
      const newDesc = description !== undefined ? description : currentLedger.description;
      const newDate = entryDate ? new Date(entryDate) : currentLedger.entryDate;
      const newAmount = amount !== undefined ? Math.round(Number(amount) * 100) / 100 : Number(currentLedger.amount);
      const newDebitAcc = debitAccount || currentLedger.debitAccount;
      const newCreditAcc = creditAccount || currentLedger.creditAccount;
      const newPartyName = partyName !== undefined ? partyName : currentLedger.partyName;
      const newPartyType = partyType !== undefined ? partyType : currentLedger.partyType;
      const newPartyId = partyId !== undefined ? partyId : currentLedger.partyId;

      // Update LedgerEntry
      const updatedLedger = await tx.ledgerEntry.update({
        where: { id: currentLedger.id },
        data: {
          description: newDesc,
          entryDate: newDate,
          amount: newAmount,
          debitAccount: newDebitAcc,
          creditAccount: newCreditAcc,
          partyName: newPartyName,
          partyType: newPartyType,
          partyId: newPartyId,
          paymentMethod: paymentMethod !== undefined ? paymentMethod : currentLedger.paymentMethod,
          chequeNumber: chequeNumber !== undefined ? chequeNumber : currentLedger.chequeNumber,
          notes: notes !== undefined ? notes : currentLedger.notes,
        },
      });

      // Update corresponding JournalEntry and lines
      const journalEntries = await tx.journalEntry.findMany({
        where: {
          OR: [
            ...(vNum ? [{ sourceId: vNum }, { idempotencyKey: `VOUCHER:${vNum}:entry` }, { idempotencyKey: { contains: vNum } }] : []),
            { sourceId: currentLedger.id },
          ],
        },
        include: { lines: { include: { account: true } } },
      });

      for (const je of journalEntries) {
        await tx.journalEntry.update({
          where: { id: je.id },
          data: {
            narration: newDesc,
            entryDate: newDate,
          },
        });

        // If amount, accounts, or party changed, synchronize journal lines
        const debitLine = je.lines.find((l) => Number(l.debit) > 0);
        const creditLine = je.lines.find((l) => Number(l.credit) > 0);

        if (debitLine) {
          const debitAccId = await getAccountId(tx, newDebitAcc);
          await tx.journalLine.update({
            where: { id: debitLine.id },
            data: {
              accountId: debitAccId,
              partyId: newPartyId || debitLine.partyId,
              debit: newAmount,
              credit: 0,
            },
          });
        }

        if (creditLine) {
          const creditAccId = await getAccountId(tx, newCreditAcc);
          await tx.journalLine.update({
            where: { id: creditLine.id },
            data: {
              accountId: creditAccId,
              partyId: newPartyId || creditLine.partyId,
              debit: 0,
              credit: newAmount,
            },
          });
        }
      }

      await recordAuditSnapshot({
        entityName: "Voucher",
        entityId: currentLedger.id,
        action: "UPDATE",
        actor: { id: session.id, email: session.email },
        beforeState: currentLedger,
        afterState: updatedLedger,
      });

      return updatedLedger;
    });

    return NextResponse.json({
      success: true,
      message: `Voucher ${updated.voucherNumber || updated.referenceId} updated successfully`,
      voucher: updated,
    });
  } catch (error: any) {
    console.error("[Voucher PATCH] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update voucher" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized. Super Admin or Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { voucherId, voucherNumber, reason } = body;

    if (!voucherId && !voucherNumber) {
      return NextResponse.json({ error: "voucherId or voucherNumber is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Locate the LedgerEntry
      const ledgerWhere: any = {};
      if (voucherId) ledgerWhere.id = voucherId;
      if (voucherNumber) ledgerWhere.voucherNumber = voucherNumber;

      const ledgerEntry = await tx.ledgerEntry.findFirst({ where: ledgerWhere });
      if (!ledgerEntry) {
        throw new Error(`Financial voucher not found: ${voucherNumber || voucherId}`);
      }

      const vNum = ledgerEntry.voucherNumber || ledgerEntry.referenceId;

      // 2. Locate associated JournalEntry(ies)
      const journalEntries = await tx.journalEntry.findMany({
        where: {
          OR: [
            ...(vNum ? [{ sourceId: vNum }, { idempotencyKey: `VOUCHER:${vNum}:entry` }, { idempotencyKey: { contains: vNum } }] : []),
            { sourceId: ledgerEntry.id },
          ],
        },
        include: { lines: { include: { account: true } } },
      });

      // 3. Delete Journal Entries (cascades to JournalLines)
      let linesCount = 0;
      for (const je of journalEntries) {
        linesCount += je.lines.length;
        await tx.journalEntry.delete({ where: { id: je.id } });
      }

      // 4. Delete the primary LedgerEntry and any split legs with matching voucherNumber
      await tx.ledgerEntry.delete({ where: { id: ledgerEntry.id } });
      if (vNum) {
        await tx.ledgerEntry.deleteMany({
          where: {
            voucherNumber: vNum,
            id: { not: ledgerEntry.id },
          },
        });
      }

      // 5. Create immutable audit snapshot
      await recordAuditSnapshot({
        entityName: "Voucher",
        entityId: ledgerEntry.id,
        action: "ROLLBACK",
        actor: { id: session.id, email: session.email },
        beforeState: {
          ledgerEntry,
          journalEntries,
          rollbackReason: reason || "Super Admin financial voucher rollback",
          rollbackAt: new Date().toISOString(),
        },
      });

      return {
        deletedVoucherNumber: vNum,
        deletedAmount: ledgerEntry.amount,
        partyName: ledgerEntry.partyName,
        journalsRemoved: journalEntries.length,
        linesRemoved: linesCount,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Voucher ${result.deletedVoucherNumber} rolled back successfully with zero balance leaks.`,
      result,
    });
  } catch (error: any) {
    console.error("[Voucher DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to rollback voucher" }, { status: 500 });
  }
}
