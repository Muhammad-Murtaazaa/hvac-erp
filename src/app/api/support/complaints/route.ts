import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  const isTechnician = session?.role?.name === "Technician";
  if (!session || (!hasPermission(session, "MANAGE_SUPPORT") && !isTechnician)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const whereClause: any = {};
  if (status) whereClause.status = status;

  if (search) {
    whereClause.OR = [
      { complaintNumber: { contains: search } },
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
    ];
  }

  // Role Scope check: Technicians only see their assigned complaints
  if (session.role.name === "Technician") {
    // Find employee by user name (seeds match names)
    const emp = await prisma.employee.findFirst({
      where: { name: { contains: session.name } },
    });
    if (emp) {
      whereClause.assignedTechnicianId = emp.id;
    } else {
      // Return empty if technician employee record not found
      return NextResponse.json({ complaints: [] });
    }
  }

  const complaints = await prisma.complaint.findMany({
    where: whereClause,
    include: {
      technician: true,
      attachments: true,
      invoice: {
        include: {
          payments: true,
        },
      },
      timeline: {
        include: {
          changedBy: true,
        },
        orderBy: { timestamp: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ complaints });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SUPPORT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { customerName, customerPhone, customerAddress, description, remarks, assignedTechnicianId, amount } = await req.json();

    if (!customerName || !customerPhone || !customerAddress || !description) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const count = await prisma.complaint.count();
    const complaintNumber = `COMP-${10001 + count}`;

    const complaint = await prisma.$transaction(async (tx) => {
      const ticket = await tx.complaint.create({
        data: {
          complaintNumber,
          date: new Date(),
          customerName,
          customerPhone,
          customerAddress,
          description,
          remarks: remarks || "",
          assignedTechnicianId: assignedTechnicianId || null,
          amount: amount ? Number(amount) : 0.00,
          status: "OPEN",
          amountStatus: "UNPAID",
        },
      });

      await tx.complaintTimeline.create({
        data: {
          complaintId: ticket.id,
          changedById: session.id,
          fromStatus: "OPEN",
          toStatus: "OPEN",
          remarks: "Complaint ticket registered in support desk.",
        },
      });

      if (assignedTechnicianId) {
        const tech = await tx.employee.findUnique({ where: { id: assignedTechnicianId } });
        await tx.complaintTimeline.create({
          data: {
            complaintId: ticket.id,
            changedById: session.id,
            fromStatus: "OPEN",
            toStatus: "OPEN",
            remarks: `Assigned to technician ${tech?.name || "Technician"}`,
          },
        });
      }

      return ticket;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Complaint",
      entityId: complaint.id,
      action: "CREATE",
      actor: { id: session.id, email: session.email },
      afterState: complaint,
    });

    return NextResponse.json({ complaint });
  } catch (error: any) {
    console.error("[Complaint POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
