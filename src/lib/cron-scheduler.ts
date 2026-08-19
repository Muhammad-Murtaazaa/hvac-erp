import prisma from "./db";
import { sendBusinessReportPDF } from "./business-report";

export async function processDueScheduledReports() {
  const schedules = await prisma.scheduledReport.findMany({
    where: { isActive: true },
  });

  const results: any[] = [];

  for (const schedule of schedules) {
    try {
      const title = schedule.title || `${schedule.frequency} Business Performance Dossier`;
      const recipients = schedule.recipientEmails.split(",").map((e) => e.trim()).filter(Boolean);

      for (const email of recipients) {
        await sendBusinessReportPDF(email, title);
      }

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
