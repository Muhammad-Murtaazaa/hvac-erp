import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const doRecord = await prisma.deliveryOrder.findUnique({
      where: { id: params.id },
    });
    if (!doRecord) {
      return NextResponse.json({ error: "Delivery Order not found" }, { status: 404 });
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

    const createdAttachments = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileUrl = await uploadFile(buffer, file.name, file.type);

      const attachment = await prisma.attachment.create({
        data: {
          fileName: file.name,
          fileUrl,
          fileType: file.type || "application/octet-stream",
          doId: params.id,
        },
      });

      createdAttachments.push(attachment);
    }

    return NextResponse.json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      attachments: createdAttachments,
    });
  } catch (error: any) {
    console.error("[DO Attachment POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_SALES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get("attachmentId");
    if (!attachmentId) {
      return NextResponse.json({ error: "Missing attachmentId parameter" }, { status: 400 });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, doId: params.id },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true, message: "Attachment deleted successfully" });
  } catch (error: any) {
    console.error("[DO Attachment DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
