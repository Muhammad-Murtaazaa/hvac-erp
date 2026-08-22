import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface LedgerTransactionItem {
  id: string;
  date: string;
  voucherNumber?: string;
  docType: string; // INVOICE, PAYMENT, ADVANCE, GRN, RETURN, PAYROLL, JV
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "VIEW_REPORTS"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const partyType = searchParams.get("partyType") as "CUSTOMER" | "VENDOR" | "EMPLOYEE" | null;
    const partyId = searchParams.get("partyId");
    const partyName = searchParams.get("partyName") || "";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!partyType) {
      return NextResponse.json({ error: "partyType is required (CUSTOMER, VENDOR, EMPLOYEE)" }, { status: 400 });
    }

    const startDate = startDateStr ? new Date(startDateStr) : new Date("2024-01-01");
    startDate.setHours(0, 0, 0, 0);

    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    let resolvedPartyInfo = {
      name: partyName || "Party Account",
      phone: "",
      address: "",
      email: "",
    };

    if (partyType === "CUSTOMER") {
      // Find customer info from invoice records or search
      const sampleInv = await prisma.invoice.findFirst({
        where: { clientName: { equals: partyName, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
      });
      if (sampleInv) {
        resolvedPartyInfo = {
          name: sampleInv.clientName,
          phone: sampleInv.clientPhone || "",
          address: sampleInv.clientAddress || "",
          email: "",
        };
      }
    } else if (partyType === "VENDOR" && partyId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: partyId } });
      if (vendor) {
        resolvedPartyInfo = {
          name: vendor.name,
          phone: vendor.phone || "",
          address: vendor.address || "",
          email: vendor.email || "",
        };
      }
    } else if (partyType === "EMPLOYEE" && partyId) {
      const emp = await prisma.employee.findUnique({ where: { id: partyId } });
      if (emp) {
        resolvedPartyInfo = {
          name: emp.name,
          phone: emp.phone || "",
          address: emp.address || "",
          email: "",
        };
      }
    }

    // Pull all manual vouchers / ledger entries matching this party
    const partyLedgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        OR: [
          { partyId: partyId || undefined },
          { partyName: { equals: partyName, mode: "insensitive" } },
        ],
      },
      orderBy: { entryDate: "asc" },
    });

    // Also pull domain records based on party type to ensure 100% completeness
    const rawItems: {
      date: Date;
      voucherNumber?: string;
      docType: string;
      referenceNumber: string;
      description: string;
      debit: number;
      credit: number;
    }[] = [];

    // 1. Process Vouchers & Manual Ledger entries
    partyLedgerEntries.forEach((le) => {
      let debit = 0;
      let credit = 0;

      if (partyType === "CUSTOMER") {
        // For customer: Inflow from customer = Credit (reduces AR / is advance), Outflow/Invoice = Debit
        if (le.creditAccount.toLowerCase().includes("customer") || le.creditAccount.toLowerCase().includes("receivable") || le.voucherType === "CRV" || le.voucherType === "BRV") {
          credit = Number(le.amount);
        } else if (le.debitAccount.toLowerCase().includes("customer") || le.debitAccount.toLowerCase().includes("receivable")) {
          debit = Number(le.amount);
        } else {
          debit = Number(le.amount);
        }
      } else if (partyType === "VENDOR") {
        // For vendor: We pay vendor = Debit (advance/AP settlement), Vendor bills us = Credit
        if (le.debitAccount.toLowerCase().includes("vendor") || le.debitAccount.toLowerCase().includes("payable") || le.voucherType === "CPV" || le.voucherType === "BPV") {
          debit = Number(le.amount);
        } else if (le.creditAccount.toLowerCase().includes("vendor") || le.creditAccount.toLowerCase().includes("payable")) {
          credit = Number(le.amount);
        } else {
          credit = Number(le.amount);
        }
      } else if (partyType === "EMPLOYEE") {
        // For employee: Advance given = Debit (loan asset), Salary earned = Credit, Salary paid = Debit
        if (le.debitAccount.toLowerCase().includes("employee") || le.voucherType === "EAV") {
          debit = Number(le.amount);
        } else if (le.creditAccount.toLowerCase().includes("employee")) {
          credit = Number(le.amount);
        } else {
          debit = Number(le.amount);
        }
      }

      rawItems.push({
        date: le.entryDate,
        voucherNumber: le.voucherNumber || undefined,
        docType: le.voucherType || le.referenceType,
        referenceNumber: le.voucherNumber || le.referenceId || "ENTRY",
        description: le.description || (le.notes ? `${le.notes}` : "General Voucher Entry"),
        debit: Math.round(debit * 100) / 100,
        credit: Math.round(credit * 100) / 100,
      });
    });

    // Track all logged reference IDs and voucher numbers from LedgerEntry to prevent duplicate additions
    const loggedRefKeys = new Set<string>();
    partyLedgerEntries.forEach((le) => {
      if (le.voucherNumber) loggedRefKeys.add(le.voucherNumber.toLowerCase());
      if (le.referenceId) loggedRefKeys.add(le.referenceId.toLowerCase());
      if (le.referenceType && le.referenceId) loggedRefKeys.add(`${le.referenceType.toLowerCase()}:${le.referenceId.toLowerCase()}`);
    });

    // 2. Add System Invoices & Payments for Customer if partyName given
    if (partyType === "CUSTOMER" && (partyName || partyId)) {
      const [invoices, complaints] = await Promise.all([
        (prisma as any).invoice.findMany({
          where: {
            OR: [
              { customerId: partyId || undefined },
              { clientName: { equals: partyName, mode: "insensitive" } },
              { clientPhone: resolvedPartyInfo.phone || undefined },
            ],
          },
          include: { payments: true },
        }),
        (prisma as any).complaint.findMany({
          where: {
            OR: [
              { customerId: partyId || undefined },
              { customerName: { equals: partyName, mode: "insensitive" } },
              { customerPhone: resolvedPartyInfo.phone || undefined },
            ],
          },
          include: { invoice: true },
        }),
      ]);

      invoices.forEach((inv: any) => {
        // Check if invoice already captured in LedgerEntry
        const isInvCaptured = loggedRefKeys.has(inv.invoiceNumber.toLowerCase()) || loggedRefKeys.has(inv.id.toLowerCase());
        if (!isInvCaptured) {
          rawItems.push({
            date: inv.date,
            docType: "INVOICE",
            referenceNumber: inv.invoiceNumber,
            description: `Sales Billing Invoice: ${inv.subjectHeading || inv.notes || "Commercial HVAC Order"}`,
            debit: Math.round(Number(inv.totalAmount) * 100) / 100,
            credit: 0,
          });
        }

        (inv.payments || []).forEach((p: any) => {
          const isPayCaptured = isInvCaptured || loggedRefKeys.has(`payment:${p.id.toLowerCase()}`) || loggedRefKeys.has(`rec-${inv.invoiceNumber.toLowerCase()}`);
          if (!isPayCaptured) {
            rawItems.push({
              date: p.paymentDate,
              docType: "PAYMENT",
              referenceNumber: `REC-${inv.invoiceNumber}`,
              description: `Payment received against ${inv.invoiceNumber} (${p.method})`,
              debit: 0,
              credit: Math.round(Number(p.amountPaid) * 100) / 100,
            });
          }
        });
      });

      // Include Complaints with repair charges if not already invoiced
      complaints.forEach((comp: any) => {
        const compAmount = Number(comp.amount || 0);
        if (compAmount > 0 && comp.amountStatus !== "WAIVED") {
          const isCaptured = comp.invoice || loggedRefKeys.has(comp.complaintNumber.toLowerCase()) || loggedRefKeys.has(comp.id.toLowerCase());
          if (!isCaptured) {
            rawItems.push({
              date: comp.date || comp.createdAt,
              docType: "COMPLAINT_REPAIR",
              referenceNumber: comp.complaintNumber,
              description: `Service & Repair Work (${comp.complaintNumber}): ${comp.description}`,
              debit: Math.round(compAmount * 100) / 100,
              credit: 0,
            });

            if (comp.amountStatus === "PAID") {
              rawItems.push({
                date: comp.date || comp.createdAt,
                docType: "PAYMENT",
                referenceNumber: `REC-${comp.complaintNumber}`,
                description: `Repair Service Payment for ${comp.complaintNumber}`,
                debit: 0,
                credit: Math.round(compAmount * 100) / 100,
              });
            }
          }
        }
      });
    }

    // 3. Add POs & GRNs for Vendor if partyId given
    if (partyType === "VENDOR" && (partyId || partyName)) {
      const pos = await prisma.purchaseOrder.findMany({
        where: {
          OR: [
            { vendorId: partyId || undefined },
            { vendor: { name: { equals: partyName, mode: "insensitive" } } },
          ],
        },
        include: {
          grns: { include: { lineItems: true } },
          lineItems: true,
        },
      });

      pos.forEach((po) => {
        po.grns.forEach((grn) => {
          const isGrnCaptured = loggedRefKeys.has(grn.grnNumber.toLowerCase()) || loggedRefKeys.has(grn.id.toLowerCase());
          if (!isGrnCaptured) {
            const grnTotal = grn.lineItems.reduce((acc, item) => acc + item.quantityReceived * Number(item.unitCost), 0);
            rawItems.push({
              date: grn.receivedAt,
              docType: "GRN_BILL",
              referenceNumber: grn.grnNumber,
              description: `Goods Received Note (PO ${po.poNumber}): ${grn.notes || "Stock Intake"}`,
              debit: 0,
              credit: Math.round(grnTotal * 100) / 100,
            });
          }
        });
      });
    }

    // 4. Add Payroll for Employee if partyId given
    if (partyType === "EMPLOYEE" && (partyId || partyName)) {
      const payrolls = await prisma.payrollRun.findMany({
        where: {
          OR: [
            { employeeId: partyId || undefined },
            { employee: { name: { equals: partyName, mode: "insensitive" } } },
          ],
          status: "PAID",
        },
      });

      payrolls.forEach((pr) => {
        const ref = `PAY-${pr.month}/${pr.year}`;
        const isPayCaptured = loggedRefKeys.has(ref.toLowerCase()) || loggedRefKeys.has(pr.id.toLowerCase());
        if (!isPayCaptured) {
          rawItems.push({
            date: pr.paymentDate || pr.createdAt,
            docType: "PAYROLL",
            referenceNumber: ref,
            description: `Monthly Salary Payment for ${pr.month}/${pr.year} (Net Pay)`,
            debit: Math.round(Number(pr.netPay) * 100) / 100,
            credit: Math.round(Number(pr.baseSalary) * 100) / 100,
          });
        }
      });
    }

    // Sort all records chronologically
    rawItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute Opening Balance before startDate
    let openingBalance = 0;
    const periodTransactions: LedgerTransactionItem[] = [];

    rawItems.forEach((item) => {
      const itemTime = new Date(item.date).getTime();
      const change = partyType === "VENDOR" ? (item.credit - item.debit) : (item.debit - item.credit);

      if (itemTime < startDate.getTime()) {
        openingBalance += change;
      }
    });

    openingBalance = Math.round(openingBalance * 100) / 100;
    let runningBalance = openingBalance;

    let totalDebit = 0;
    let totalCredit = 0;

    rawItems.forEach((item, idx) => {
      const itemTime = new Date(item.date).getTime();
      if (itemTime >= startDate.getTime() && itemTime <= endDate.getTime()) {
        const delta = partyType === "VENDOR" ? (item.credit - item.debit) : (item.debit - item.credit);
        runningBalance += delta;
        runningBalance = Math.round(runningBalance * 100) / 100;

        totalDebit += item.debit;
        totalCredit += item.credit;

        periodTransactions.push({
          id: `tx-${idx}`,
          date: new Date(item.date).toISOString().split("T")[0],
          voucherNumber: item.voucherNumber,
          docType: item.docType,
          referenceNumber: item.referenceNumber,
          description: item.description,
          debit: item.debit,
          credit: item.credit,
          runningBalance,
        });
      }
    });

    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;
    const closingBalance = runningBalance;

    return NextResponse.json({
      partyInfo: resolvedPartyInfo,
      partyType,
      period: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      openingBalance,
      transactions: periodTransactions,
      totals: {
        totalDebit,
        totalCredit,
        closingBalance,
        status: closingBalance > 0
          ? (partyType === "CUSTOMER" ? "RECEIVABLE" : "PAYABLE")
          : closingBalance < 0
          ? (partyType === "CUSTOMER" ? "ADVANCE_HELD" : "ADVANCE_PAID")
          : "SETTLED",
      },
    });
  } catch (error: any) {
    console.error("[Party Ledger GET] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
