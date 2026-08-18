import prisma from "./db";
import { executeDynamicReport } from "./report-compiler";
import { convertToExcelBuffer } from "./export";
import { sendMail } from "./mail";

export async function processDueScheduledReports() {
  const schedules = await prisma.scheduledReport.findMany({
    where: { isActive: true },
    include: { template: true },
  });

  const results: any[] = [];

  for (const schedule of schedules) {
    try {
      let reportData: any = null;
      let title = schedule.title;

      if (schedule.template) {
        const config = JSON.parse(schedule.template.config);
        reportData = await executeDynamicReport({
          entity: schedule.template.entity as any,
          fields: config.fields || [],
          filters: config.filters || [],
          limit: 1000,
        });
      } else {
        // Default revenue snapshot
        const invoices = await prisma.invoice.findMany({
          orderBy: { date: "desc" },
          take: 100,
        });
        reportData = {
          entity: "INVOICES",
          totalRecords: invoices.length,
          data: invoices.map((i) => ({
            Invoice: i.invoiceNumber,
            Client: i.clientName,
            Date: i.date.toISOString().split("T")[0],
            Total: Number(i.totalAmount),
            Paid: Number(i.amountPaid),
            Status: i.status,
          })),
        };
      }

      // Generate Excel attachment
      const excelBuffer = convertToExcelBuffer(reportData.data, "Scheduled Report");
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${dateStr}.xlsx`;

      // Email HTML Body
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">${title}</h2>
          <p style="color: #64748b;">This is an automated business intelligence report generated for <strong>${dateStr}</strong>.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; color: #334155;"><strong>Total Records Included:</strong> ${reportData.totalRecords}</p>
          </div>
          <p style="color: #64748b;">The complete data report is attached as an Excel spreadsheet for zero-login analysis.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">HVAC ERP Automated Delivery Engine</p>
        </div>
      `;

      const recipients = schedule.recipientEmails.split(",").map((e) => e.trim());

      await sendMail({
        to: recipients,
        subject: `[HVAC ERP] ${title} - ${dateStr}`,
        html: htmlContent,
        senderName: "HVAC ERP Reports",
        attachments: [
          {
            filename,
            content: excelBuffer,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ],
      });

      await prisma.scheduledReport.update({
        where: { id: schedule.id },
        data: { lastRunAt: new Date() },
      });

      results.push({ scheduleId: schedule.id, title, status: "SUCCESS" });
    } catch (err: any) {
      console.error(`Error executing schedule ${schedule.id}:`, err);
      results.push({ scheduleId: schedule.id, title: schedule.title, status: "FAILED", error: err.message });
    }
  }

  return results;
}
