import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateInvoicePDF, generateQuotationPDF, generateDeliveryOrderPDF, generatePayslipPDF, generateComplaintPDF, generateEmployeeFormPDF, generateSOAPDF, generateMonthlySalarySheetPDF } from "@/lib/pdfGenerator";
import { getPartyLedgerReportData } from "@/lib/partyLedger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // invoice, quotation, do, payslip, complaint, employee-form, soa, salary-sheet
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

    if (type === "quotation") {
      const quotation = await prisma.quotation.findUnique({
        where: { id: id! },
        include: {
          lineItems: { include: { product: true } },
        },
      });
      if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
      pdfBuffer = await generateQuotationPDF(quotation);
      fileName = `quotation-${quotation.quotationNumber}.pdf`;
    } else if (type === "invoice") {
      const invoice = await prisma.invoice.findUnique({
        where: { id: id! },
        include: {
          lineItems: { include: { product: true } },
          deliveryOrder: true,
          complaint: true,
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
      
      const proto = req.headers.get("x-forwarded-proto") || (req.headers.get("host")?.includes("localhost") ? "http" : "https");
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
      const baseUrl = host ? `${proto}://${host}` : undefined;

      pdfBuffer = await generateDeliveryOrderPDF(doRecord, baseUrl);
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
      const partyType = (searchParams.get("partyType") || "CUSTOMER") as "CUSTOMER" | "VENDOR" | "EMPLOYEE";
      const partyId = searchParams.get("partyId") || undefined;
      const partyName = searchParams.get("partyName") || undefined;
      const startDateStr = searchParams.get("startDate") || undefined;
      const endDateStr = searchParams.get("endDate") || undefined;

      const soaReport = await getPartyLedgerReportData({
        partyType,
        partyId,
        partyName,
        startDateStr,
        endDateStr,
      });

      pdfBuffer = await generateSOAPDF(soaReport);
      fileName = `statement-of-account-${(soaReport.partyInfo?.name || "party").replace(/\s+/g, "_")}.pdf`;
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
