import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthenticatedTechnician } from "@/lib/technician-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { context, error } = await getAuthenticatedTechnician(req);
  if (error || !context) return error;

  const { employee } = context;

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status"); // optional filter by status

    const whereClause: any = {
      assignedTechnicianId: employee.id,
    };

    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    const complaints = await prisma.complaint.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            email: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        timeline: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            remarks: true,
            timestamp: true,
            changedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { timestamp: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format fields specifically for mobile companion consumption
    const jobs = complaints.map((c) => {
      // Determine priority from remarks if tagged, else normal
      const isUrgent = (c.remarks || "").toUpperCase().includes("URGENT") || (c.description || "").toUpperCase().includes("URGENT");
      const priority = isUrgent ? "HIGH" : "NORMAL";

      return {
        id: c.id,
        complaintNumber: c.complaintNumber,
        clientName: c.customerName,
        address: c.customerAddress,
        phone: c.customerPhone,
        problemDescription: c.description,
        remarks: c.remarks || "",
        status: c.status,
        assignedDate: c.createdAt.toISOString(),
        priority,
        amount: Number(c.amount || 0),
        amountStatus: c.amountStatus,
        customer: c.customer,
        attachments: c.attachments,
        timeline: c.timeline,
      };
    });

    return NextResponse.json({
      technician: {
        id: employee.id,
        name: employee.name,
        phone: employee.phone,
      },
      count: jobs.length,
      jobs,
    });
  } catch (err: any) {
    console.error("[Technician Jobs GET] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error retrieving technician jobs" },
      { status: 500 }
    );
  }
}
