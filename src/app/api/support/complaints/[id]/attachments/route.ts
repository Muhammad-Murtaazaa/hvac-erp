import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser(req);
  const isTechnician = session?.role?.name === "Technician";
  if (!session || (!hasPermission(session, "MANAGE_SUPPORT") && !isTechnician)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ticket = await prisma.complaint.findUnique({
      where: { id: params.id },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Complaint ticket not found" }, { status: 404 });
    }

    if (isTechnician) {
      const emp = await prisma.employee.findFirst({
        where: { name: { contains: session.name } },
      });
      if (!emp || ticket.assignedTechnicianId !== emp.id) {
        return NextResponse.json({ error: "Forbidden: Complaint ticket is not assigned to you" }, { status: 403 });
      }
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadFile(buffer, file.name, file.type);

    const currentStatus = ticket.status || "OPEN";

    const attachment = await prisma.attachment.create({
      data: {
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        complaintId: params.id,
      },
    });

    // Add to timeline
    await prisma.complaintTimeline.create({
      data: {
        complaintId: params.id,
        changedById: session.id,
        fromStatus: currentStatus,
        toStatus: currentStatus,
        remarks: `Document scan copy uploaded: ${file.name}`,
      },
    });

    // Fetch the updated complaint to return or return attachment
    return NextResponse.json({ attachment });
  } catch (error: any) {
    console.error("[Attachment POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
