import prisma from "./db";
import { generateBusinessSummaryPDF, BusinessSummaryData } from "./pdfGenerator";
import { sendMail } from "./mail";

export async function compileBusinessData(scopeTitle = "Executive Business Performance Dossier"): Promise<BusinessSummaryData> {
  // 1. Financials & Invoices
  const invoices = await prisma.invoice.findMany({
    orderBy: { date: "desc" },
    take: 50,
  });

  const totalRevenue = invoices.reduce((acc, i) => acc + Number(i.totalAmount), 0);
  const totalPaid = invoices.reduce((acc, i) => acc + Number(i.amountPaid), 0);
  const accountsReceivable = Math.max(0, totalRevenue - totalPaid);
  const paidInvoicesCount = invoices.filter((i) => i.status === "PAID").length;

  // 2. Procurement (Purchase Orders)
  const pos = await prisma.purchaseOrder.findMany({
    take: 50,
  });
  const totalProcurement = pos.reduce((acc, p) => acc + Number(p.totalAmount), 0);
  const grossProfit = totalRevenue - totalProcurement;

  // 3. Inventory & Products
  const products = await prisma.product.findMany();
  const totalValuation = products.reduce((acc, p) => acc + p.onHandQty * Number(p.averageCost || p.salesPrice || 0), 0);
  const lowStockItems = products
    .filter((p) => p.onHandQty <= p.reorderLevel)
    .map((p) => ({
      sku: p.sku,
      name: p.name,
      onHandQty: p.onHandQty,
      reorderLevel: p.reorderLevel,
    }));

  // 4. Complaints & Support
  const complaints = await prisma.complaint.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const totalComplaints = complaints.length;
  const openComplaints = complaints.filter((c) => c.status === "OPEN").length;
  const inProgressComplaints = complaints.filter((c) => c.status === "IN_PROGRESS").length;
  const resolvedComplaints = complaints.filter((c) => ["RESOLVED", "CLOSED", "DONE"].includes(c.status)).length;
  const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100;

  // 5. HRM & Payroll
  const employees = await prisma.employee.findMany();
  const totalPayrollAmount = employees.reduce((acc, e) => acc + Number(e.baseSalary || 0), 0);

  return {
    title: scopeTitle,
    period: "All Active Enterprise Operations",
    generatedDate: new Date().toLocaleDateString("en-US", { dateStyle: "full" }),
    financials: {
      totalRevenue,
      totalPaid,
      accountsReceivable,
      totalProcurement,
      grossProfit,
      invoicesCount: invoices.length,
      paidInvoicesCount,
    },
    sales: {
      recentInvoices: invoices.slice(0, 8).map((i) => ({
        invoiceNumber: i.invoiceNumber,
        clientName: i.clientName,
        date: i.date.toISOString().split("T")[0],
        totalAmount: Number(i.totalAmount),
        status: i.status,
      })),
    },
    inventory: {
      totalProducts: products.length,
      totalValuation,
      lowStockItems,
    },
    complaints: {
      total: totalComplaints,
      open: openComplaints,
      inProgress: inProgressComplaints,
      resolved: resolvedComplaints,
      resolutionRate,
      recentList: complaints.slice(0, 6).map((c) => ({
        complaintNumber: c.complaintNumber,
        customerName: c.customerName,
        status: c.status,
        amount: Number(c.amount || 0),
      })),
    },
    hrm: {
      totalEmployees: employees.length,
      totalPayrollAmount,
    },
  };
}

export async function sendBusinessReportPDF(recipientEmail: string, reportTitle = "Weekly Business Intelligence Report") {
  const businessData = await compileBusinessData(reportTitle);
  const pdfBuffer = await generateBusinessSummaryPDF(businessData);

  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `TCE_Business_Report_${dateStr}.pdf`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1e3a8a; margin: 0; font-size: 24px; font-weight: 800;">TECHNICOOL ENGINEERING</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">TCE ERP Executive Automated Business Report</p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 16px;">${reportTitle}</h3>
        <p style="color: #475569; font-size: 13px; margin: 0 0 14px 0; line-height: 1.5;">
          Your automated business intelligence report for <strong>${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}</strong> is attached as a complete PDF document containing:
        </p>
        <ul style="color: #334155; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li><strong>Financial KPIs:</strong> Revenue (PKR ${Math.round(businessData.financials.totalRevenue).toLocaleString()}), Collections & Receivables</li>
          <li><strong>Commercial Sales:</strong> Recent invoices breakdown & payment statuses</li>
          <li><strong>Service Tickets:</strong> Complaint dispatch metrics (${businessData.complaints.resolved}/${businessData.complaints.total} Resolved)</li>
          <li><strong>Inventory Assets:</strong> Warehouse valuation (PKR ${Math.round(businessData.inventory.totalValuation).toLocaleString()}) & Low stock alerts</li>
          <li><strong>Workforce & Payroll:</strong> Active technical staff & monthly liability</li>
        </ul>
      </div>

      <p style="color: #64748b; font-size: 13px; text-align: center; margin-bottom: 24px;">
        📎 <strong>Attached:</strong> <code>${filename}</code> (Complete Business Dossier PDF)
      </p>

      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Technicool Engineering Enterprise Operations • Powered by <a href="https://omnysync.com" style="color: #2563eb; text-decoration: none;">OMNYSYNC</a></p>
    </div>
  `;

  return await sendMail({
    to: recipientEmail,
    subject: `[TCE ERP] ${reportTitle} - ${dateStr}`,
    html: htmlContent,
    senderName: "TCE ERP Executive Reports",
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
