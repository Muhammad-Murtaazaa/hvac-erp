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
    
    // Support multiple files from formData (files or file keys)
    let files: File[] = [];
    const filesList = formData.getAll("files") as File[];
    const fileList = formData.getAll("file") as File[];

    if (filesList && filesList.length > 0) {
      files = filesList.filter((f) => f && typeof f === "object" && f.name);
    } else if (fileList && fileList.length > 0) {
      files = fileList.filter((f) => f && typeof f === "object" && f.name);
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const currentStatus = ticket.status || "OPEN";
    const createdAttachments = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileUrl = await uploadFile(buffer, file.name, file.type);

      const attachment = await prisma.attachment.create({
        data: {
          fileName: file.name,
          fileUrl,
          fileType: file.type || "application/octet-stream",
          complaintId: params.id,
        },
      });

      createdAttachments.push(attachment);
    }

    // Add consolidated timeline log
    const fileNamesList = files.map((f) => f.name).join(", ");
    await prisma.complaintTimeline.create({
      data: {
        complaintId: params.id,
        changedById: session.id,
        fromStatus: currentStatus,
        toStatus: currentStatus,
        remarks: `${files.length} document/picture file(s) attached: ${fileNamesList}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      attachments: createdAttachments,
    });
  } catch (error: any) {
    console.error("[Attachment POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SUPPORT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get("attachmentId");
    if (!attachmentId) {
      return NextResponse.json({ error: "Missing attachmentId parameter" }, { status: 400 });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, complaintId: params.id },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true, message: "Attachment deleted successfully" });
  } catch (error: any) {
    console.error("[Attachment DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
