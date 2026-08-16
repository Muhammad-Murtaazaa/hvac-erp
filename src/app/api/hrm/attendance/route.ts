import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_HRM")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date"); // YYYY-MM-DD

  const whereClause: any = {};

  if (dateStr) {
    const targetDate = new Date(dateStr);
    targetDate.setUTCHours(0, 0, 0, 0);
    whereClause.date = targetDate;
  }

  const attendance = await prisma.attendance.findMany({
    where: whereClause,
    include: {
      employee: true,
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ attendance });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_HRM")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { employeeId, date, status, checkIn, checkOut } = await req.json();

    if (!employeeId || !date || !status) {
      return NextResponse.json({ error: "Employee ID, Date, and Status are required" }, { status: 400 });
    }

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const record = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: targetDate,
        },
      },
      update: {
        status,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
      },
      create: {
        employeeId,
        date: targetDate,
        status,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
      },
    });

    return NextResponse.json({ attendance: record });
  } catch (error: any) {
    console.error("[Attendance POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
