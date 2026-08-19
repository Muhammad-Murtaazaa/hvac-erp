import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendBusinessReportPDF } from "@/lib/business-report";

export async function GET() {
  try {
    const schedules = await prisma.scheduledReport.findMany({
      where: {
        title: {
          in: ["Weekly Executive Business Report", "Monthly Business Performance Dossier"],
        },
      },
    });

    const weekly = schedules.find((s) => s.frequency === "WEEKLY");
    const monthly = schedules.find((s) => s.frequency === "MONTHLY");

    const recipientEmail = weekly?.recipientEmails || monthly?.recipientEmails || "mmurtaza2300@gmail.com";

    return NextResponse.json({
      success: true,
      recipientEmail,
      enableWeekly: !!(weekly && weekly.isActive),
      enableMonthly: !!(monthly && monthly.isActive),
      lastRunAt: weekly?.lastRunAt || monthly?.lastRunAt || null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, recipientEmail, enableWeekly, enableMonthly } = body;

    const email = (recipientEmail || "").trim();
    if (!email) {
      return NextResponse.json({ success: false, error: "Recipient email is required" }, { status: 400 });
    }

    // Action: Instant Test PDF Dispatch
    if (action === "trigger_test") {
      const result = await sendBusinessReportPDF(email, "Instant Business Performance Dossier (Test Dispatch)");
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || "Failed to send PDF report" }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: `Complete Business Intelligence PDF report sent successfully to ${email}`,
      });
    }

    // Action: Save & Configure Automated Schedules
    // 1. Weekly Schedule (Every Monday at 08:00 AM)
    const existingWeekly = await prisma.scheduledReport.findFirst({
      where: { title: "Weekly Executive Business Report" },
    });

    if (enableWeekly) {
      if (existingWeekly) {
        await prisma.scheduledReport.update({
          where: { id: existingWeekly.id },
          data: {
            recipientEmails: email,
            isActive: true,
            frequency: "WEEKLY",
            timeOfDay: "08:00",
            dayOfWeek: 1, // Monday
            format: "PDF",
          },
        });
      } else {
        await prisma.scheduledReport.create({
          data: {
            title: "Weekly Executive Business Report",
            frequency: "WEEKLY",
            timeOfDay: "08:00",
            dayOfWeek: 1,
            recipientEmails: email,
            format: "PDF",
            isActive: true,
          },
        });
      }
    } else if (existingWeekly) {
      await prisma.scheduledReport.update({
        where: { id: existingWeekly.id },
        data: { isActive: false },
      });
    }

    // 2. Monthly Schedule (1st of every month at 08:00 AM)
    const existingMonthly = await prisma.scheduledReport.findFirst({
      where: { title: "Monthly Business Performance Dossier" },
    });

    if (enableMonthly) {
      if (existingMonthly) {
        await prisma.scheduledReport.update({
          where: { id: existingMonthly.id },
          data: {
            recipientEmails: email,
            isActive: true,
            frequency: "MONTHLY",
            timeOfDay: "08:00",
            dayOfMonth: 1, // 1st
            format: "PDF",
          },
        });
      } else {
        await prisma.scheduledReport.create({
          data: {
            title: "Monthly Business Performance Dossier",
            frequency: "MONTHLY",
            timeOfDay: "08:00",
            dayOfMonth: 1,
            recipientEmails: email,
            format: "PDF",
            isActive: true,
          },
        });
      }
    } else if (existingMonthly) {
      await prisma.scheduledReport.update({
        where: { id: existingMonthly.id },
        data: { isActive: false },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Automated reports configured for ${email}. Weekly: ${enableWeekly ? "ON" : "OFF"}, Monthly: ${enableMonthly ? "ON" : "OFF"}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
