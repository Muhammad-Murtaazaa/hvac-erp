import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateInvoicePDF, generateDeliveryOrderPDF, generatePayslipPDF, generateComplaintPDF, generateEmployeeFormPDF, generateSOAPDF, generateMonthlySalarySheetPDF } from "@/lib/pdfGenerator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // invoice, do, payslip, complaint, employee-form, soa, salary-sheet
    const id = searchParams.get("id");

    if (!type) {
      return NextResponse.json({ error: "Document type is required" }, { status: 400 });
    }

    if (!["soa", "salary-sheet"].includes(type) && !id) {
      return NextResponse.json({ error: "Type and ID are required" }, { status: 400 });
    }

    // Sensitive HR documents require active authenticated session
    if (["payslip", "employee-form", "salary-sheet"].includes(type) && !session) {
      return NextResponse.json({ error: "Unauthorized: Please log in to view payroll/employee files" }, { status: 401 });
    }

    let pdfBuffer: Buffer;
    let fileName = `${type}-${id || "doc"}.pdf`;

    if (type === "invoice") {
      const invoice = await prisma.invoice.findUnique({
        where: { id: id! },
        include: {
          lineItems: { include: { product: true } },
          deliveryOrder: true,
        },
      });
      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      pdfBuffer = await generateInvoicePDF(invoice);
      fileName = `invoice-${invoice.invoiceNumber}.pdf`;
    } else if (type === "do") {
      const doRecord = await prisma.deliveryOrder.findUnique({
        where: { id: id! },
        include: {
          lineItems: { include: { product: true } },
          invoices: {
            select: {
              notes: true,
            },
          },
        },
      });
      if (!doRecord) return NextResponse.json({ error: "Delivery Order not found" }, { status: 404 });
      pdfBuffer = await generateDeliveryOrderPDF(doRecord);
      fileName = `delivery-order-${doRecord.doNumber}.pdf`;
    } else if (type === "payslip") {
      const payslip: any = await prisma.payrollRun.findUnique({
        where: { id: id! },
        include: { employee: true },
      });
      if (!payslip) return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
      pdfBuffer = await generatePayslipPDF(payslip);
      fileName = `payslip-${(payslip.employee?.name || "staff").replace(/\s+/g, "_")}-${payslip.month}-${payslip.year}.pdf`;
    } else if (type === "complaint") {
      const complaint = await prisma.complaint.findUnique({
        where: { id: id! },
        include: { technician: true },
      });
      if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
      pdfBuffer = await generateComplaintPDF(complaint);
      fileName = `complaint-sheet-${complaint.complaintNumber}.pdf`;
    } else if (type === "employee-form") {
      const employee = await prisma.employee.findUnique({
        where: { id: id! },
      });
      if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      pdfBuffer = await generateEmployeeFormPDF(employee);
      fileName = `employment-form-${employee.name.replace(/\s+/g, "_")}.pdf`;
    } else if (type === "salary-sheet") {
      const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
      const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

      const employees = await prisma.employee.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
      });

      const runs = await prisma.payrollRun.findMany({
        where: { month, year },
      });
      const runMap = new Map(runs.map((r: any) => [r.employeeId, r]));

      const daysInMonth = new Date(year, month, 0).getDate();
      const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });

      const items = employees.map((emp) => {
        const r: any = runMap.get(emp.id);
        const baseSalary = Number(emp.baseSalary || 0);
        const totalDays = r?.totalDays || daysInMonth;
        const presentDays = r?.presentDays ?? daysInMonth;
        const absentDays = r?.absentDays ?? Math.max(0, totalDays - presentDays);
        const dailyWage = baseSalary / totalDays;
        const earnedBase = Math.round(dailyWage * presentDays * 100) / 100;
        const overtimeAmount = Number(r?.overtimeAmount || 0);
        const allowances = Number(r?.allowances || 0);
        const messDeductions = Number(r?.messDeductions || 0);
        const advanceDeductions = Number(r?.advanceDeductions || 0);
        const otherDeductions = Number(r?.otherDeductions || 0);
        const totalDeductions = Number(r?.deductions ?? (messDeductions + advanceDeductions + otherDeductions));
        const netPay = Number(r?.netPay ?? Math.max(0, earnedBase + overtimeAmount + allowances - totalDeductions));

        return {
          employeeNo: emp.employeeNo || "",
          name: emp.name,
          department: emp.department,
          position: emp.position,
          baseSalary,
          totalDays,
          presentDays,
          absentDays,
          overtimeAmount,
          allowances,
          messDeductions,
          advanceDeductions,
          totalDeductions,
          netPay,
          status: r?.status || "PENDING",
        };
      });

      pdfBuffer = await generateMonthlySalarySheetPDF({ month, year, monthName, items });
      fileName = `salary-sheet-${monthName}-${year}.pdf`;
    } else if (type === "soa") {
      const partyType = searchParams.get("partyType") || "CUSTOMER";
      const partyId = searchParams.get("partyId") || "";
      const partyName = searchParams.get("partyName") || "";
      const startDateStr = searchParams.get("startDate") || "2024-01-01";
      const endDateStr = searchParams.get("endDate") || new Date().toISOString().split("T")[0];

      // Query party ledger
      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);

      let resolvedPartyInfo = { name: partyName || "Party Account", phone: "" };
      if (partyType === "CUSTOMER") {
        const sampleInv = await prisma.invoice.findFirst({
          where: { clientName: { equals: partyName, mode: "insensitive" } },
        });
        if (sampleInv) resolvedPartyInfo = { name: sampleInv.clientName, phone: sampleInv.clientPhone || "" };
      } else if (partyType === "VENDOR" && partyId) {
        const vendor = await prisma.vendor.findUnique({ where: { id: partyId } });
        if (vendor) resolvedPartyInfo = { name: vendor.name, phone: vendor.phone || "" };
      } else if (partyType === "EMPLOYEE" && partyId) {
        const emp = await prisma.employee.findUnique({ where: { id: partyId } });
        if (emp) resolvedPartyInfo = { name: emp.name, phone: emp.phone || "" };
      }

      const partyLedgerEntries = await prisma.ledgerEntry.findMany({
        where: {
          OR: [
            { partyId: partyId || undefined },
            { partyName: { equals: partyName, mode: "insensitive" } },
          ],
        },
        orderBy: { entryDate: "asc" },
      });

      const rawItems: any[] = [];
      partyLedgerEntries.forEach((le) => {
        let debit = 0;
        let credit = 0;
        if (partyType === "CUSTOMER") {
          if (le.creditAccount.toLowerCase().includes("customer") || le.creditAccount.toLowerCase().includes("receivable") || le.voucherType === "CRV" || le.voucherType === "BRV") {
            credit = Number(le.amount);
          } else {
            debit = Number(le.amount);
          }
        } else if (partyType === "VENDOR") {
          if (le.debitAccount.toLowerCase().includes("vendor") || le.debitAccount.toLowerCase().includes("payable") || le.voucherType === "CPV" || le.voucherType === "BPV") {
            debit = Number(le.amount);
          } else {
            credit = Number(le.amount);
          }
        } else {
          if (le.debitAccount.toLowerCase().includes("employee") || le.voucherType === "EAV") {
            debit = Number(le.amount);
          } else {
            credit = Number(le.amount);
          }
        }

        rawItems.push({
          date: le.entryDate,
          docType: le.voucherType || le.referenceType,
          referenceNumber: le.voucherNumber || le.referenceId || "ENTRY",
          description: le.description || le.notes || "Voucher",
          debit,
          credit,
        });
      });

      if (partyType === "CUSTOMER" && partyName) {
        const invoices = await prisma.invoice.findMany({
          where: { clientName: { equals: partyName, mode: "insensitive" } },
          include: { payments: true },
        });
        invoices.forEach((inv) => {
          rawItems.push({
            date: inv.date,
            docType: "INVOICE",
            referenceNumber: inv.invoiceNumber,
            description: `Sales Invoice: ${inv.subjectHeading || "HVAC Equipment"}`,
            debit: Number(inv.totalAmount),
            credit: 0,
          });
          inv.payments.forEach((p) => {
            rawItems.push({
              date: p.paymentDate,
              docType: "PAYMENT",
              referenceNumber: `REC-${inv.invoiceNumber}`,
              description: `Payment received (${p.method})`,
              debit: 0,
              credit: Number(p.amountPaid),
            });
          });
        });
      }

      rawItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let openingBalance = 0;
      const transactions: any[] = [];
      rawItems.forEach((item) => {
        const itemTime = new Date(item.date).getTime();
        const change = item.debit - item.credit;
        if (itemTime < startDate.getTime()) {
          openingBalance += change;
        }
      });

      let runningBal = openingBalance;
      let totalDr = 0;
      let totalCr = 0;
      rawItems.forEach((item) => {
        const itemTime = new Date(item.date).getTime();
        if (itemTime >= startDate.getTime() && itemTime <= endDate.getTime()) {
          runningBal += (item.debit - item.credit);
          totalDr += item.debit;
          totalCr += item.credit;
          transactions.push({
            date: new Date(item.date).toLocaleDateString("en-GB").replace(/\//g, "-"),
            referenceNumber: item.referenceNumber,
            docType: item.docType,
            description: item.description,
            debit: item.debit,
            credit: item.credit,
            runningBalance: runningBal,
          });
        }
      });

      pdfBuffer = await generateSOAPDF({
        partyType,
        partyInfo: resolvedPartyInfo,
        period: { startDate: startDateStr, endDate: endDateStr },
        openingBalance,
        transactions,
        totals: {
          totalDebit: totalDr,
          totalCredit: totalCr,
          closingBalance: runningBal,
        },
      });
      fileName = `statement-of-account-${resolvedPartyInfo.name.replace(/\s+/g, "_")}.pdf`;
    } else {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    const inline = searchParams.get("inline") === "true";

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": inline ? `inline; filename="${fileName}"` : `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("[PDF API] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
