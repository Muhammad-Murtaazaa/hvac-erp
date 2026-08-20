import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthenticatedTechnician } from "@/lib/technician-auth";
import { recordAuditSnapshot } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { context, error } = await getAuthenticatedTechnician(req);
  if (error || !context) return error;

  const { session, employee } = context;
  const jobId = params.id;

  if (!jobId) {
    return NextResponse.json({ error: "Missing job ID in route parameters" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { status, remarks } = body;

    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "Valid status string is required (e.g. ACCEPTED, EN_ROUTE, IN_PROGRESS, RESOLVED, COMPLETED)" },
        { status: 400 }
      );
    }

    const normalizedStatus = status.trim().toUpperCase();

    // 1. Fetch job and verify existence
    const ticket = await prisma.complaint.findUnique({
      where: { id: jobId },
      include: { attachments: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Job ticket not found" }, { status: 404 });
    }

    // 2. Strict Ownership Verification: Reject if not assigned to this technician
    if (ticket.assignedTechnicianId !== employee.id) {
      return NextResponse.json(
        { error: "Forbidden: This job ticket is not assigned to your technician account" },
        { status: 403 }
      );
    }

    const previousStatus = ticket.status;

    // 3. Update status and record timeline log atomically
    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id: jobId },
        data: {
          status: normalizedStatus,
          remarks: remarks ? `${ticket.remarks ? ticket.remarks + "\n" : ""}[${new Date().toLocaleTimeString()}]: ${remarks}` : ticket.remarks,
        },
        include: {
          attachments: true,
          timeline: {
            orderBy: { timestamp: "desc" },
          },
        },
      });

      // Record timeline change
      await tx.complaintTimeline.create({
        data: {
          complaintId: jobId,
          changedById: session.id,
          fromStatus: previousStatus,
          toStatus: normalizedStatus,
          remarks: remarks || `Technician ${employee.name} changed status from ${previousStatus} to ${normalizedStatus}`,
        },
      });

      return updated;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // 4. Record audit snapshot in system audit trail
    await recordAuditSnapshot({
      entityName: "Complaint",
      entityId: jobId,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      beforeState: ticket,
      afterState: updatedTicket,
    });

    return NextResponse.json({
      success: true,
      message: `Job status updated to ${normalizedStatus}`,
      job: {
        id: updatedTicket.id,
        complaintNumber: updatedTicket.complaintNumber,
        status: updatedTicket.status,
        remarks: updatedTicket.remarks,
        updatedAt: updatedTicket.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("[Technician Job Status PATCH] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error updating job status" },
      { status: 500 }
    );
  }
}
