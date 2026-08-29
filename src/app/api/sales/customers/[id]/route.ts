import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { parseInvoiceMetadata } from "@/lib/invoiceHelper";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_SALES") && !hasPermission(session, "MANAGE_SUPPORT") && !hasPermission(session, "VIEW_FINANCIALS") && !hasPermission(session, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
  }

  let customer = await (prisma as any).customer.findUnique({
    where: { id },
    include: {
      invoices: {
        include: {
          lineItems: {
            include: {
              product: true,
            },
          },
          payments: true,
          returns: {
            include: {
              lineItems: true,
            },
          },
        },
        orderBy: { date: "desc" },
      },
      complaints: {
        include: {
          technician: true,
          timeline: {
            include: {
              changedBy: true,
            },
            orderBy: { timestamp: "desc" },
          },
          invoice: true,
        },
        orderBy: { date: "desc" },
      },
      deliveryOrders: {
        include: {
          lineItems: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!customer) {
    // Try finding by name (case-insensitive) or phone
    customer = await (prisma as any).customer.findFirst({
      where: {
        OR: [
          { name: { equals: id, mode: "insensitive" } },
          { phone: id },
        ],
      },
      include: {
        invoices: {
          include: {
            lineItems: {
              include: {
                product: true,
              },
            },
            payments: true,
            returns: {
              include: {
                lineItems: true,
              },
            },
          },
          orderBy: { date: "desc" },
        },
        complaints: {
          include: {
            technician: true,
            timeline: {
              include: {
                changedBy: true,
              },
              orderBy: { timestamp: "desc" },
            },
            invoice: true,
          },
          orderBy: { date: "desc" },
        },
        deliveryOrders: {
          include: {
            lineItems: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { date: "desc" },
        },
      },
    });
  }

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Also query any invoices/complaints matching the customer's phone or exact name where customerId was not explicitly set
  const [unlinkedInvoices, unlinkedComplaints, unlinkedDOs] = await Promise.all([
    (prisma as any).invoice.findMany({
      where: {
        customerId: null,
        clientName: { equals: customer.name, mode: "insensitive" },
      },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        payments: true,
        returns: {
          include: {
            lineItems: true,
          },
        },
      },
      orderBy: { date: "desc" },
    }),
    (prisma as any).complaint.findMany({
      where: {
        customerId: null,
        customerName: { equals: customer.name, mode: "insensitive" },
      },
      include: {
        technician: true,
        timeline: {
          include: {
            changedBy: true,
          },
          orderBy: { timestamp: "desc" },
        },
        invoice: true,
      },
      orderBy: { date: "desc" },
    }),
    (prisma as any).deliveryOrder.findMany({
      where: {
        customerId: null,
        clientName: { equals: customer.name, mode: "insensitive" },
      },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  const allInvoices = [...(customer.invoices || []), ...(unlinkedInvoices || [])];
  const allComplaints = [...(customer.complaints || []), ...(unlinkedComplaints || [])];
  const allDOs = [...(customer.deliveryOrders || []), ...(unlinkedDOs || [])];

  // Fetch all Ledger / Debit-Credit Entries for this customer
  const ledgerEntries = await (prisma as any).ledgerEntry.findMany({
    where: {
      OR: [
        { partyId: customer.id },
        { partyName: { equals: customer.name, mode: "insensitive" } },
      ],
    },
    orderBy: { entryDate: "asc" },
  });

  // Track reference keys to prevent double counting invoices/payments that might already have ledger entries
  const loggedRefKeys = new Set<string>();
  ledgerEntries.forEach((le: any) => {
    if (le.voucherNumber) loggedRefKeys.add(le.voucherNumber.toLowerCase());
    if (le.referenceId) loggedRefKeys.add(le.referenceId.toLowerCase());
    if (le.referenceType && le.referenceId) loggedRefKeys.add(`${le.referenceType.toLowerCase()}:${le.referenceId.toLowerCase()}`);
  });

  const rawLedgerItems: {
    id: string;
    date: string;
    voucherNumber?: string;
    docType: string;
    referenceNumber: string;
    description: string;
    debit: number;
    credit: number;
  }[] = [];

  // 1. Process manual ledger vouchers (CRV, BRV, CPV, BPV, OBV, JV, etc.)
  ledgerEntries.forEach((le: any, idx: number) => {
    let debit = 0;
    let credit = 0;

    if (
      le.creditAccount.toLowerCase().includes("customer") ||
      le.creditAccount.toLowerCase().includes("receivable") ||
      le.voucherType === "CRV" ||
      le.voucherType === "BRV"
    ) {
      credit = Number(le.amount || 0);
    } else {
      debit = Number(le.amount || 0);
    }

    rawLedgerItems.push({
      id: le.id || `le-${idx}`,
      date: le.entryDate.toISOString(),
      voucherNumber: le.voucherNumber || undefined,
      docType: le.voucherType || le.referenceType || "VOUCHER",
      referenceNumber: le.voucherNumber || le.referenceId || "ENTRY",
      description: le.description || (le.notes ? `${le.notes}` : "General Voucher Entry"),
      debit: Math.round(debit * 100) / 100,
      credit: Math.round(credit * 100) / 100,
    });
  });

  // 2. Add System Invoices (Debits) and Invoice Payments (Credits)
  allInvoices.forEach((inv: any) => {
    const isInvCaptured = loggedRefKeys.has(inv.invoiceNumber.toLowerCase()) || loggedRefKeys.has(inv.id.toLowerCase());
    if (!isInvCaptured) {
      let cleanNote = "";
      if (inv.notes) {
        const meta = parseInvoiceMetadata(inv.notes);
        cleanNote = meta.userNotes || "";
      }
      const descText = inv.subjectHeading || cleanNote || "Commercial Sale";

      rawLedgerItems.push({
        id: `inv-${inv.id}`,
        date: new Date(inv.date).toISOString(),
        voucherNumber: undefined,
        docType: "INVOICE",
        referenceNumber: inv.invoiceNumber,
        description: `Commercial Invoice: ${descText}`,
        debit: Math.round(Number(inv.totalAmount || 0) * 100) / 100,
        credit: 0,
      });
    }

    (inv.payments || []).forEach((p: any) => {
      const isPayCaptured = isInvCaptured || loggedRefKeys.has(`payment:${p.id.toLowerCase()}`) || loggedRefKeys.has(`rec-${inv.invoiceNumber.toLowerCase()}`);
      if (!isPayCaptured) {
        rawLedgerItems.push({
          id: `pay-${p.id}`,
          date: new Date(p.paymentDate).toISOString(),
          voucherNumber: undefined,
          docType: "PAYMENT",
          referenceNumber: `REC-${inv.invoiceNumber}`,
          description: `Payment received against ${inv.invoiceNumber} (${p.method})`,
          debit: 0,
          credit: Math.round(Number(p.amountPaid || 0) * 100) / 100,
        });
      }
    });
  });

  // 3. Add Complaints with repair work charges if not already captured through an invoice
  allComplaints.forEach((comp: any) => {
    const compAmount = Number(comp.amount || 0);
    if (compAmount > 0 && comp.amountStatus !== "WAIVED") {
      const isCaptured = comp.invoice || loggedRefKeys.has(comp.complaintNumber.toLowerCase()) || loggedRefKeys.has(comp.id.toLowerCase());
      if (!isCaptured) {
        rawLedgerItems.push({
          id: `comp-${comp.id}`,
          date: new Date(comp.date || comp.createdAt).toISOString(),
          voucherNumber: undefined,
          docType: "COMPLAINT_REPAIR",
          referenceNumber: comp.complaintNumber,
          description: `Service & Repair Work (${comp.complaintNumber}): ${comp.description}`,
          debit: Math.round(compAmount * 100) / 100,
          credit: 0,
        });

        if (comp.amountStatus === "PAID") {
          rawLedgerItems.push({
            id: `comp-pay-${comp.id}`,
            date: new Date(comp.date || comp.createdAt).toISOString(),
            voucherNumber: undefined,
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

  // Sort chronologically
  rawLedgerItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate Running Balance
  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const ledgerTransactions = rawLedgerItems.map((item) => {
    runningBalance += (item.debit - item.credit);
    runningBalance = Math.round(runningBalance * 100) / 100;
    totalDebit += item.debit;
    totalCredit += item.credit;

    return {
      ...item,
      runningBalance,
    };
  });

  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;
  const netLedgerBalance = runningBalance;

  const totalSpent = allInvoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
  const totalPaid = allInvoices.reduce((acc, inv) => acc + Number(inv.amountPaid || 0), 0);
  const outstandingBalance = Math.max(0, totalSpent - totalPaid);
  const openComplaintsCount = allComplaints.filter((comp) => comp.status !== "RESOLVED" && comp.status !== "CLOSED").length;

  return NextResponse.json({
    customer: {
      ...customer,
      invoices: allInvoices,
      complaints: allComplaints,
      deliveryOrders: allDOs,
      ledger: ledgerTransactions,
      ledgerTotals: {
        totalDebit,
        totalCredit,
        closingBalance: netLedgerBalance,
        status: netLedgerBalance > 0 ? "RECEIVABLE" : netLedgerBalance < 0 ? "ADVANCE_HELD" : "SETTLED",
      },
      stats: {
        totalInvoices: allInvoices.length,
        totalSpent,
        totalPaid,
        outstandingBalance,
        totalComplaints: allComplaints.length,
        openComplaints: openComplaintsCount,
        totalDOs: allDOs.length,
        ledgerDebits: totalDebit,
        ledgerCredits: totalCredit,
        ledgerBalance: netLedgerBalance,
      },
    },
  });
}
