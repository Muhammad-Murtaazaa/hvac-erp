import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateInvoicePDF, generateDeliveryOrderPDF, generatePayslipPDF, generateComplaintPDF, generateEmployeeFormPDF } from "@/lib/pdfGenerator";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // invoice, do, payslip, complaint, employee-form
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "Type and ID are required" }, { status: 400 });
    }

    let pdfBuffer: Buffer;
    let fileName = `${type}-${id}.pdf`;

    if (type === "invoice") {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
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
        where: { id },
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
      const payslip = await prisma.payrollRun.findUnique({
        where: { id },
        include: { employee: true },
      });
      if (!payslip) return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
      pdfBuffer = await generatePayslipPDF(payslip);
      fileName = `payslip-${payslip.employee.name.replace(/\s+/g, "_")}-${payslip.month}-${payslip.year}.pdf`;
    } else if (type === "complaint") {
      const complaint = await prisma.complaint.findUnique({
        where: { id },
        include: { technician: true },
      });
      if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
      pdfBuffer = await generateComplaintPDF(complaint);
      fileName = `complaint-sheet-${complaint.complaintNumber}.pdf`;
    } else if (type === "employee-form") {
      const employee = await prisma.employee.findUnique({
        where: { id },
      });
      if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      pdfBuffer = await generateEmployeeFormPDF(employee);
      fileName = `employment-form-${employee.name.replace(/\s+/g, "_")}.pdf`;
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
