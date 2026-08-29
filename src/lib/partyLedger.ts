import prisma from "@/lib/db";
import { parseInvoiceMetadata } from "@/lib/invoiceHelper";

export type PartyLedgerType = "CUSTOMER" | "VENDOR" | "EMPLOYEE" | "CONSOLIDATED";

export interface LedgerTransactionItem {
  id: string;
  date: string;
  voucherNumber?: string;
  docType: string;
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  dueDate?: string;
}

export async function getPartyLedgerReportData({
  partyType,
  partyId,
  partyName,
  startDateStr,
  endDateStr,
}: {
  partyType: PartyLedgerType;
  partyId?: string;
  partyName?: string;
  startDateStr?: string;
  endDateStr?: string;
}) {
  const startDate = startDateStr ? new Date(startDateStr) : new Date("2024-01-01");
  startDate.setHours(0, 0, 0, 0);

  const endDate = endDateStr ? new Date(endDateStr) : new Date();
  endDate.setHours(23, 59, 59, 999);

  let resolvedPartyInfo: {
    id?: string;
    code: string;
    name: string;
    phone: string;
    address: string;
    contactPerson: string;
    email: string;
    roles?: string[];
  } = {
    code: "",
    name: partyName || "Party Account",
    phone: "",
    address: "",
    contactPerson: "",
    email: "",
    roles: [],
  };

  // 1. Resolve Profile Information across Customer, Vendor, and Employee directories
  if (partyType === "CUSTOMER" || partyType === "CONSOLIDATED") {
    if (partyId) {
      const cust = await prisma.customer.findUnique({ where: { id: partyId } });
      if (cust) {
        resolvedPartyInfo = {
          id: cust.id,
          code: (cust as any).customerCode || `CUS-${cust.id.slice(-6).toUpperCase()}`,
          name: cust.name,
          phone: cust.phone || "",
          address: cust.address || "Multan, Pakistan",
          contactPerson: "",
          email: cust.email || "",
          roles: ["CUSTOMER"],
        };
      }
    }
    if (!resolvedPartyInfo.code && partyName) {
      const custByName = await prisma.customer.findFirst({
        where: { name: { equals: partyName, mode: "insensitive" } },
      });
      if (custByName) {
        resolvedPartyInfo = {
          id: custByName.id,
          code: (custByName as any).customerCode || `CUS-${custByName.id.slice(-6).toUpperCase()}`,
          name: custByName.name,
          phone: custByName.phone || "",
          address: custByName.address || "Multan, Pakistan",
          contactPerson: "",
          email: custByName.email || "",
          roles: ["CUSTOMER"],
        };
      } else {
        const sampleInv = await prisma.invoice.findFirst({
          where: { clientName: { equals: partyName, mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
        });
        if (sampleInv) {
          resolvedPartyInfo = {
            id: sampleInv.customerId || undefined,
            code: "CUS-000011",
            name: sampleInv.clientName,
            phone: sampleInv.clientPhone || "",
            address: sampleInv.clientAddress || "Multan, Pakistan",
            contactPerson: "",
            email: "",
            roles: ["CUSTOMER"],
          };
        }
      }
    }
  }

  if (partyType === "VENDOR" || partyType === "CONSOLIDATED") {
    if (partyId && !resolvedPartyInfo.id) {
      const vendor = await prisma.vendor.findUnique({ where: { id: partyId } });
      if (vendor) {
        resolvedPartyInfo = {
          id: vendor.id,
          code: (vendor as any).vendorCode || `VEN-${vendor.id.slice(-6).toUpperCase()}`,
          name: vendor.name,
          phone: vendor.phone || "",
          address: vendor.address || "Multan, Pakistan",
          contactPerson: vendor.contactPerson || "",
          email: vendor.email || "",
          roles: [...(resolvedPartyInfo.roles || []), "VENDOR"],
        };
      }
    }
    if (partyName) {
      const vendorByName = await prisma.vendor.findFirst({
        where: { name: { equals: partyName, mode: "insensitive" } },
      });
      if (vendorByName) {
        if (!resolvedPartyInfo.code) {
          resolvedPartyInfo = {
            id: vendorByName.id,
            code: (vendorByName as any).vendorCode || `VEN-${vendorByName.id.slice(-6).toUpperCase()}`,
            name: vendorByName.name,
            phone: vendorByName.phone || "",
            address: vendorByName.address || "Multan, Pakistan",
            contactPerson: vendorByName.contactPerson || "",
            email: vendorByName.email || "",
            roles: [...(resolvedPartyInfo.roles || []), "VENDOR"],
          };
        } else {
          // Merge details in consolidated mode
          if (!resolvedPartyInfo.contactPerson && vendorByName.contactPerson) {
            resolvedPartyInfo.contactPerson = vendorByName.contactPerson;
          }
          if (!resolvedPartyInfo.phone && vendorByName.phone) {
            resolvedPartyInfo.phone = vendorByName.phone;
          }
          if (resolvedPartyInfo.roles && !resolvedPartyInfo.roles.includes("VENDOR")) {
            resolvedPartyInfo.roles.push("VENDOR");
          }
        }
      }
    }
  }

  if (partyType === "EMPLOYEE" || partyType === "CONSOLIDATED") {
    if (partyId && !resolvedPartyInfo.id) {
      const emp = await prisma.employee.findUnique({ where: { id: partyId } });
      if (emp) {
        resolvedPartyInfo = {
          id: emp.id,
          code: emp.employeeNo || `EMP-${emp.id.slice(-6).toUpperCase()}`,
          name: emp.name,
          phone: emp.phone || "",
          address: emp.address || "Multan, Pakistan",
          contactPerson: "",
          email: "",
          roles: [...(resolvedPartyInfo.roles || []), "EMPLOYEE"],
        };
      }
    }
    if (partyName) {
      const empByName = await prisma.employee.findFirst({
        where: { name: { equals: partyName, mode: "insensitive" } },
      });
      if (empByName) {
        if (!resolvedPartyInfo.code) {
          resolvedPartyInfo = {
            id: empByName.id,
            code: empByName.employeeNo || `EMP-${empByName.id.slice(-6).toUpperCase()}`,
            name: empByName.name,
            phone: empByName.phone || "",
            address: empByName.address || "Multan, Pakistan",
            contactPerson: "",
            email: "",
            roles: [...(resolvedPartyInfo.roles || []), "EMPLOYEE"],
          };
        } else if (resolvedPartyInfo.roles && !resolvedPartyInfo.roles.includes("EMPLOYEE")) {
          resolvedPartyInfo.roles.push("EMPLOYEE");
        }
      }
    }
  }

  if (partyType === "CONSOLIDATED" && resolvedPartyInfo.roles && resolvedPartyInfo.roles.length > 1) {
    resolvedPartyInfo.code = `PAR-${resolvedPartyInfo.code.replace(/^[A-Z]+-/, "") || "360"}`;
  }

  // 2. Pull all manual vouchers / ledger entries matching this party
  const partyLedgerEntries = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { partyId: partyId || undefined },
        { partyName: { equals: partyName, mode: "insensitive" } },
      ],
    },
    orderBy: { entryDate: "asc" },
  });

  const rawItems: {
    date: Date;
    voucherNumber?: string;
    docType: string;
    referenceNumber: string;
    description: string;
    debit: number;
    credit: number;
    dueDate?: Date;
  }[] = [];

  // Process Vouchers & Manual Ledger entries
  partyLedgerEntries.forEach((le) => {
    // Strictly exclude internal COGS and inventory movements from party statements
    if (
      le.voucherType === "COGS" ||
      le.debitAccount?.toLowerCase().includes("cost of goods sold") ||
      le.creditAccount?.toLowerCase().includes("inventory asset") ||
      le.partyType === "GENERAL"
    ) {
      return;
    }

    // Skip raw INV ledger entries when we pull master invoice records (to prevent stale/duplicated amounts)
    if ((partyType === "CUSTOMER" || partyType === "CONSOLIDATED") && (le.voucherType === "INV" || le.referenceType === "INVOICE")) {
      return;
    }

    let debit = 0;
    let credit = 0;
    let includeEntry = true;

    if (partyType === "CUSTOMER") {
      // Exclude pure vendor disbursements & vendor bills from Customer statements
      if (
        le.partyType === "VENDOR" ||
        le.voucherType === "CPV" ||
        le.voucherType === "BPV" ||
        le.voucherType === "GRN" ||
        le.referenceType === "PO_RECEIPT" ||
        le.referenceType === "VENDOR_RETURN"
      ) {
        includeEntry = false;
      } else if (
        le.creditAccount.toLowerCase().includes("customer") ||
        le.creditAccount.toLowerCase().includes("receivable") ||
        le.voucherType === "CRV" ||
        le.voucherType === "BRV"
      ) {
        credit = Number(le.amount);
      } else if (
        le.debitAccount.toLowerCase().includes("customer") ||
        le.debitAccount.toLowerCase().includes("receivable")
      ) {
        debit = Number(le.amount);
      } else {
        debit = Number(le.amount);
      }
    } else if (partyType === "VENDOR") {
      // Exclude customer sales invoices, receipts, and customer repair charges from Vendor statements
      if (
        le.partyType === "CUSTOMER" ||
        le.voucherType === "CRV" ||
        le.voucherType === "BRV" ||
        le.voucherType === "INV" ||
        le.referenceType === "INVOICE" ||
        le.referenceType === "COMPLAINT" ||
        le.debitAccount.toLowerCase().includes("receivable") ||
        le.creditAccount.toLowerCase().includes("revenue")
      ) {
        includeEntry = false;
      } else if (
        le.debitAccount.toLowerCase().includes("vendor") ||
        le.debitAccount.toLowerCase().includes("payable") ||
        le.voucherType === "CPV" ||
        le.voucherType === "BPV"
      ) {
        debit = Number(le.amount);
      } else if (
        le.creditAccount.toLowerCase().includes("vendor") ||
        le.creditAccount.toLowerCase().includes("payable") ||
        le.voucherType === "GRN"
      ) {
        credit = Number(le.amount);
      } else {
        includeEntry = false;
      }
    } else if (partyType === "EMPLOYEE") {
      if (
        le.debitAccount.toLowerCase().includes("employee") ||
        le.voucherType === "EAV" ||
        le.referenceType === "PAYROLL"
      ) {
        debit = Number(le.amount);
      } else if (le.creditAccount.toLowerCase().includes("employee")) {
        credit = Number(le.amount);
      } else {
        includeEntry = false;
      }
    } else if (partyType === "CONSOLIDATED") {
      // In 360° Consolidated view, merge both customer and vendor dealing correctly:
      // Debits = Money billed to party (Sales Invoices) + Payments disbursed to party (CPV/BPV/Staff Advances)
      // Credits = Money received from party (CRV/BRV) + Goods/services supplied by party (GRN/Vendor Bills)
      if (le.voucherType === "CRV" || le.voucherType === "BRV") {
        credit = Number(le.amount);
      } else if (le.voucherType === "CPV" || le.voucherType === "BPV") {
        debit = Number(le.amount);
      } else if (le.voucherType === "EAV") {
        debit = Number(le.amount);
      } else if (le.voucherType === "GRN" || le.referenceType === "PO_RECEIPT") {
        credit = Number(le.amount);
      } else if (
        le.creditAccount.toLowerCase().includes("customer") ||
        le.creditAccount.toLowerCase().includes("receivable")
      ) {
        credit = Number(le.amount);
      } else if (
        le.debitAccount.toLowerCase().includes("customer") ||
        le.debitAccount.toLowerCase().includes("receivable")
      ) {
        debit = Number(le.amount);
      } else if (
        le.debitAccount.toLowerCase().includes("payable") ||
        le.debitAccount.toLowerCase().includes("vendor")
      ) {
        debit = Number(le.amount);
      } else if (
        le.creditAccount.toLowerCase().includes("payable") ||
        le.creditAccount.toLowerCase().includes("vendor")
      ) {
        credit = Number(le.amount);
      } else {
        if (le.partyType === "CUSTOMER") debit = Number(le.amount);
        else if (le.partyType === "VENDOR") credit = Number(le.amount);
        else debit = Number(le.amount);
      }
    }

    if (!includeEntry || (debit === 0 && credit === 0)) {
      return;
    }

    let displayDesc = le.description || "";
    if (displayDesc && displayDesc.trim().startsWith("{") && displayDesc.trim().endsWith("}")) {
      try {
        const parsed = JSON.parse(displayDesc.trim());
        displayDesc = parsed.userNotes || "";
      } catch {}
    }
    if (!displayDesc && le.notes) {
      if (le.notes.trim().startsWith("{") && le.notes.trim().endsWith("}")) {
        try {
          const parsed = JSON.parse(le.notes.trim());
          displayDesc = parsed.userNotes || "";
        } catch {
          displayDesc = le.notes;
        }
      } else {
        displayDesc = le.notes;
      }
    }
    if (!displayDesc) {
      displayDesc = "General Voucher Entry";
    }

    rawItems.push({
      date: le.entryDate,
      voucherNumber: le.voucherNumber || undefined,
      docType: le.voucherType || le.referenceType,
      referenceNumber: le.voucherNumber || le.referenceId || "ENTRY",
      description: displayDesc,
      debit: Math.round(debit * 100) / 100,
      credit: Math.round(credit * 100) / 100,
      dueDate: le.entryDate,
    });
  });

  const loggedRefKeys = new Set<string>();
  rawItems.forEach((item) => {
    if (item.voucherNumber) loggedRefKeys.add(item.voucherNumber.toLowerCase());
    if (item.referenceNumber) loggedRefKeys.add(item.referenceNumber.toLowerCase());
  });

  // 3. Add Master System Invoices & Customer Payments
  if ((partyType === "CUSTOMER" || partyType === "CONSOLIDATED") && (partyName || partyId)) {
    const [invoices, complaints] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          OR: [
            { customerId: partyId || undefined },
            { clientName: { equals: partyName, mode: "insensitive" } },
            { clientPhone: resolvedPartyInfo.phone || undefined },
          ],
        },
        include: { payments: true },
      }),
      prisma.complaint.findMany({
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
      const isInvCaptured = loggedRefKeys.has(inv.invoiceNumber.toLowerCase()) || loggedRefKeys.has(inv.id.toLowerCase());
      if (!isInvCaptured) {
        let cleanNote = "";
        if (inv.notes) {
          const meta = parseInvoiceMetadata(inv.notes);
          cleanNote = meta.userNotes || "";
        }
        const descText = inv.subjectHeading || cleanNote || "Commercial HVAC Order";

        rawItems.push({
          date: inv.date,
          docType: "INVOICE",
          referenceNumber: inv.invoiceNumber,
          description: `Sales Billing Invoice: ${descText}`,
          debit: Math.round(Number(inv.totalAmount) * 100) / 100,
          credit: 0,
          dueDate: inv.dueDate || inv.date,
        });
        loggedRefKeys.add(inv.invoiceNumber.toLowerCase());
        loggedRefKeys.add(inv.id.toLowerCase());
      }

      (inv.payments || []).forEach((p: any) => {
        const isPayCaptured =
          loggedRefKeys.has(p.id.toLowerCase()) ||
          loggedRefKeys.has(`payment:${p.id.toLowerCase()}`) ||
          loggedRefKeys.has(`rec-${inv.invoiceNumber.toLowerCase()}`);
        if (!isPayCaptured) {
          rawItems.push({
            date: p.paymentDate,
            docType: "PAYMENT",
            referenceNumber: `REC-${inv.invoiceNumber}`,
            description: `Payment received against ${inv.invoiceNumber} (${p.method})`,
            debit: 0,
            credit: Math.round(Number(p.amountPaid) * 100) / 100,
            dueDate: p.paymentDate,
          });
          loggedRefKeys.add(p.id.toLowerCase());
          loggedRefKeys.add(`payment:${p.id.toLowerCase()}`);
          loggedRefKeys.add(`rec-${inv.invoiceNumber.toLowerCase()}`);
        }
      });
    });

    complaints.forEach((comp: any) => {
      const compAmount = Number(comp.amount || 0);
      if (compAmount > 0 && comp.amountStatus !== "WAIVED") {
        const isCaptured =
          comp.invoice ||
          loggedRefKeys.has(comp.complaintNumber.toLowerCase()) ||
          loggedRefKeys.has(comp.id.toLowerCase());
        if (!isCaptured) {
          rawItems.push({
            date: comp.date || comp.createdAt,
            docType: "COMPLAINT_REPAIR",
            referenceNumber: comp.complaintNumber,
            description: `Service & Repair Work (${comp.complaintNumber}): ${comp.description}`,
            debit: Math.round(compAmount * 100) / 100,
            credit: 0,
            dueDate: comp.date || comp.createdAt,
          });

          if (comp.amountStatus === "PAID") {
            rawItems.push({
              date: comp.date || comp.createdAt,
              docType: "PAYMENT",
              referenceNumber: `REC-${comp.complaintNumber}`,
              description: `Repair Service Payment for ${comp.complaintNumber}`,
              debit: 0,
              credit: Math.round(compAmount * 100) / 100,
              dueDate: comp.date || comp.createdAt,
            });
          }
        }
      }
    });
  }

  // 4. Add POs & GRNs for Vendor
  if ((partyType === "VENDOR" || partyType === "CONSOLIDATED") && (partyId || partyName)) {
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
            dueDate: grn.receivedAt,
          });
          loggedRefKeys.add(grn.grnNumber.toLowerCase());
          loggedRefKeys.add(grn.id.toLowerCase());
        }
      });
    });
  }

  // 5. Add Payroll for Employee
  if ((partyType === "EMPLOYEE" || partyType === "CONSOLIDATED") && (partyId || partyName)) {
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
          dueDate: pr.paymentDate || pr.createdAt,
        });
        loggedRefKeys.add(ref.toLowerCase());
        loggedRefKeys.add(pr.id.toLowerCase());
      }
    });
  }

  // 6. Sort all records chronologically
  rawItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute Opening Balance before startDate
  let openingBalance = 0;
  const periodTransactions: LedgerTransactionItem[] = [];

  rawItems.forEach((item) => {
    const itemTime = new Date(item.date).getTime();
    const change = partyType === "VENDOR" ? item.credit - item.debit : item.debit - item.credit;

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
      const delta = partyType === "VENDOR" ? item.credit - item.debit : item.debit - item.credit;
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
        dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : undefined,
      });
    }
  });

  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;
  const closingBalance = runningBalance;

  const statusLabel =
    closingBalance > 0
      ? partyType === "CUSTOMER"
        ? "Receivable (Customer Owes Us)"
        : partyType === "VENDOR"
        ? "Payable (We Owe Vendor)"
        : "Receivable (Party Owes Us)"
      : closingBalance < 0
      ? partyType === "CUSTOMER"
        ? "Advance Credit Held"
        : partyType === "VENDOR"
        ? "Advance Paid to Vendor"
        : "Payable (We Owe Party)"
      : "Balanced / Settled";

  return {
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
      status:
        closingBalance > 0
          ? partyType === "CUSTOMER"
            ? "RECEIVABLE"
            : partyType === "VENDOR"
            ? "PAYABLE"
            : "RECEIVABLE"
          : closingBalance < 0
          ? partyType === "CUSTOMER"
            ? "ADVANCE_HELD"
            : partyType === "VENDOR"
            ? "ADVANCE_PAID"
            : "PAYABLE"
          : "SETTLED",
      statusLabel,
    },
  };
}
