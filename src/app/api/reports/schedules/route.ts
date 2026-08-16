import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const schedules = await prisma.scheduledReport.findMany({
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: schedules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, frequency, timeOfDay, recipientEmails, templateId, format, dayOfWeek, dayOfMonth } = body;

    if (!title || !frequency || !recipientEmails) {
      return NextResponse.json({ success: false, error: "Missing required fields (title, frequency, recipientEmails)" }, { status: 400 });
    }

    const schedule = await prisma.scheduledReport.create({
      data: {
        title,
        frequency,
        timeOfDay: timeOfDay || "08:00",
        recipientEmails,
        templateId: templateId || null,
        format: format || "EXCEL",
        dayOfWeek: dayOfWeek ? parseInt(dayOfWeek, 10) : null,
        dayOfMonth: dayOfMonth ? parseInt(dayOfMonth, 10) : null,
      },
    });

    return NextResponse.json({ success: true, data: schedule });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing schedule ID" }, { status: 400 });
    }

    await prisma.scheduledReport.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Schedule removed" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
