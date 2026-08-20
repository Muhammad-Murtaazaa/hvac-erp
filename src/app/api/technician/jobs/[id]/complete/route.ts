import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthenticatedTechnician } from "@/lib/technician-auth";
import { uploadFile } from "@/lib/storage";
import { recordAuditSnapshot } from "@/lib/audit";

export async function POST(
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
    // 1. Fetch job and verify existence
    const ticket = await prisma.complaint.findUnique({
      where: { id: jobId },
      include: { attachments: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Job ticket not found" }, { status: 404 });
    }

    // 2. Strict Ownership Verification
    if (ticket.assignedTechnicianId !== employee.id) {
      return NextResponse.json(
        { error: "Forbidden: This job ticket is not assigned to your technician account" },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let uploadedFilesToProcess: Array<{ buffer: Buffer; fileName: string; mimeType: string }> = [];
    let remarks = "";

    // 3. Process either multipart/form-data or application/json (base64)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      remarks = (formData.get("remarks") as string) || (formData.get("notes") as string) || "";

      // Extract photo files
      const photos = [
        ...(formData.getAll("photos") as File[]),
        ...(formData.getAll("files") as File[]),
        ...(formData.getAll("photo") as File[]),
        ...(formData.getAll("file") as File[]),
      ].filter((f) => f && typeof f === "object" && f.name);

      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const buffer = Buffer.from(await p.arrayBuffer());
        uploadedFilesToProcess.push({
          buffer,
          fileName: p.name || `job_photo_${i + 1}.jpg`,
          mimeType: p.type || "image/jpeg",
        });
      }

      // Extract signature
      const signature = formData.get("signature");
      if (signature && typeof signature === "object" && "arrayBuffer" in signature) {
        const sigFile = signature as File;
        const buffer = Buffer.from(await sigFile.arrayBuffer());
        uploadedFilesToProcess.push({
          buffer,
          fileName: sigFile.name || `customer_signature_${Date.now()}.png`,
          mimeType: sigFile.type || "image/png",
        });
      } else if (typeof signature === "string" && signature.startsWith("data:")) {
        // Base64 signature in formData string
        const match = signature.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const buffer = Buffer.from(match[2], "base64");
          uploadedFilesToProcess.push({
            buffer,
            fileName: `customer_signature_${Date.now()}.png`,
            mimeType,
          });
        }
      }
    } else {
      // JSON body handling (base64 images)
      const body = await req.json().catch(() => ({}));
      remarks = body.remarks || body.notes || body.resolutionNotes || "";

      const rawPhotos = Array.isArray(body.photos) ? body.photos : body.photo ? [body.photo] : [];
      rawPhotos.forEach((photoStr: any, idx: number) => {
        if (typeof photoStr === "string" && photoStr.startsWith("data:")) {
          const match = photoStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const buffer = Buffer.from(match[2], "base64");
            uploadedFilesToProcess.push({
              buffer,
              fileName: `job_photo_${idx + 1}_${Date.now()}.jpg`,
              mimeType,
            });
          }
        } else if (typeof photoStr === "object" && photoStr.base64) {
          const mimeType = photoStr.mimeType || "image/jpeg";
          const cleanBase64 = photoStr.base64.replace(/^data:([A-Za-z-+\/]+);base64,/, "");
          const buffer = Buffer.from(cleanBase64, "base64");
          uploadedFilesToProcess.push({
            buffer,
            fileName: photoStr.fileName || `job_photo_${idx + 1}_${Date.now()}.jpg`,
            mimeType,
          });
        }
      });

      if (body.signature) {
        const sigStr = body.signature;
        if (typeof sigStr === "string" && sigStr.startsWith("data:")) {
          const match = sigStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const buffer = Buffer.from(match[2], "base64");
            uploadedFilesToProcess.push({
              buffer,
              fileName: `customer_signature_${Date.now()}.png`,
              mimeType,
            });
          }
        } else if (typeof sigStr === "string") {
          const buffer = Buffer.from(sigStr, "base64");
          uploadedFilesToProcess.push({
            buffer,
            fileName: `customer_signature_${Date.now()}.png`,
            mimeType: "image/png",
          });
        }
      }
    }

    // 4. Upload files to storage and collect URLs
    const createdAttachmentsData: Array<{ fileName: string; fileUrl: string; fileType: string }> = [];

    for (const item of uploadedFilesToProcess) {
      try {
        const fileUrl = await uploadFile(item.buffer, item.fileName, item.mimeType);
        createdAttachmentsData.push({
          fileName: item.fileName,
          fileUrl,
          fileType: item.mimeType,
        });
      } catch (uploadErr) {
        console.error("[Technician Complete] Upload error for item:", item.fileName, uploadErr);
      }
    }

    const previousStatus = ticket.status;
    const finalResolutionRemarks = remarks
      ? `Job completed by technician ${employee.name}. Resolution remarks: ${remarks}`
      : `Job completed by technician ${employee.name}.`;

    // 5. Update ticket status to RESOLVED, attach files, record timeline
    const updatedTicket = await prisma.$transaction(async (tx) => {
      // Create Attachment records linked to the complaint
      const attachmentRecords = [];
      for (const att of createdAttachmentsData) {
        const created = await tx.attachment.create({
          data: {
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileType: att.fileType,
            complaintId: jobId,
          },
        });
        attachmentRecords.push(created);
      }

      // Update Complaint
      const updated = await tx.complaint.update({
        where: { id: jobId },
        data: {
          status: "RESOLVED",
          remarks: ticket.remarks ? `${ticket.remarks}\n[Completed]: ${remarks || "Resolved"}` : remarks || "Resolved",
        },
        include: {
          attachments: true,
          timeline: {
            orderBy: { timestamp: "desc" },
          },
        },
      });

      // Record timeline entry
      await tx.complaintTimeline.create({
        data: {
          complaintId: jobId,
          changedById: session.id,
          fromStatus: previousStatus,
          toStatus: "RESOLVED",
          remarks: `${finalResolutionRemarks} (${createdAttachmentsData.length} proof/signature attachment(s) uploaded)`,
        },
      });

      return { updated, attachmentRecords };
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // 6. Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Complaint",
      entityId: jobId,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      beforeState: ticket,
      afterState: updatedTicket.updated,
    });

    return NextResponse.json({
      success: true,
      message: "Job completed and signed off successfully",
      job: {
        id: updatedTicket.updated.id,
        complaintNumber: updatedTicket.updated.complaintNumber,
        status: updatedTicket.updated.status,
        remarks: updatedTicket.updated.remarks,
        updatedAt: updatedTicket.updated.updatedAt.toISOString(),
      },
      uploadedAttachmentsCount: updatedTicket.attachmentRecords.length,
      attachments: updatedTicket.attachmentRecords,
    });
  } catch (err: any) {
    console.error("[Technician Job Complete POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error completing technician job" },
      { status: 500 }
    );
  }
}
