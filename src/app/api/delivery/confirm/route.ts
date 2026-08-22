import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { recordAuditSnapshot } from "@/lib/audit";
import { sendMail } from "@/lib/mail";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing Delivery Order ID" }, { status: 400 });
    }

    const trimmedId = id.trim();
    const deliveryOrder = await prisma.deliveryOrder.findFirst({
      where: {
        OR: [
          { id: trimmedId },
          { doNumber: trimmedId },
          { doNumber: `DO-${trimmedId}` },
        ],
      },
      include: {
        lineItems: {
          include: { product: true },
        },
      },
    });

    if (!deliveryOrder) {
      return NextResponse.json({ success: false, error: `Delivery Order not found for identifier: ${trimmedId}` }, { status: 404 });
    }

    return NextResponse.json({ success: true, deliveryOrder });
  } catch (error: any) {
    console.error("Delivery Order lookup error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, receiverName, receiverPhone, remarks } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing Delivery Order ID" }, { status: 400 });
    }

    const trimmedId = String(id).trim();
    const existingDO = await prisma.deliveryOrder.findFirst({
      where: {
        OR: [
          { id: trimmedId },
          { doNumber: trimmedId },
          { doNumber: `DO-${trimmedId}` },
        ],
      },
      include: {
        lineItems: { include: { product: true } },
      },
    });

    if (!existingDO) {
      return NextResponse.json({ success: false, error: `Delivery Order not found for identifier: ${trimmedId}` }, { status: 404 });
    }

    if (existingDO.status === "DELIVERED") {
      return NextResponse.json({
        success: true,
        alreadyDelivered: true,
        message: "This Delivery Order has already been marked as DELIVERED.",
        deliveryOrder: existingDO,
      });
    }

    const deliveryTimestamp = new Date();
    const deliveryNote = `[DELIVERED VIA QR SCAN] Received by: ${receiverName || "Authorized Receiver"} (${receiverPhone || "No Phone"}) on ${deliveryTimestamp.toLocaleString()}.${remarks ? ` Remarks: ${remarks}` : ""}`;
    const updatedNotes = existingDO.notes ? `${existingDO.notes}\n${deliveryNote}` : deliveryNote;

    // Update DO status to DELIVERED
    const updatedDO = await prisma.deliveryOrder.update({
      where: { id },
      data: {
        status: "DELIVERED",
        notes: updatedNotes,
      },
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "DeliveryOrder",
      entityId: id,
      action: "UPDATE",
      actor: { id: "qr-receiver", email: receiverName ? `${receiverName} (QR Scan)` : "Client (QR Scan)" },
      beforeState: existingDO,
      afterState: updatedDO,
    });

    // Send Automated Delivery Notification Email
    try {
      const notifyEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || "admin@hvacerp.com";
      const formattedDN = existingDO.doNumber ? existingDO.doNumber.replace("DO-", "TCE/") : existingDO.doNumber;

      const htmlEmail = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="color: #065f46; margin: 0 0 4px 0; font-size: 22px;">✅ Delivery Order Confirmed Delivered</h2>
            <p style="color: #6b7280; margin: 0; font-size: 13px;">Automated Delivery Verification Scan</p>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; font-size: 15px; color: #166534;"><strong>Delivery Challan:</strong> ${formattedDN} (${existingDO.doNumber})</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534;"><strong>Client:</strong> ${existingDO.clientName}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534;"><strong>Delivery Address:</strong> ${existingDO.deliveryAddress}</p>
            <p style="margin: 0; font-size: 14px; color: #166534;"><strong>Delivered At:</strong> ${deliveryTimestamp.toLocaleString()}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #1f2937; font-size: 15px; margin: 0 0 10px 0;">Receiver Confirmation Details:</h3>
            <ul style="color: #4b5563; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li><strong>Received By:</strong> ${receiverName || "Authorized Receiver"}</li>
              <li><strong>Contact Phone:</strong> ${receiverPhone || "N/A"}</li>
              ${remarks ? `<li><strong>Notes / Remarks:</strong> ${remarks}</li>` : ""}
            </ul>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #1f2937; font-size: 15px; margin: 0 0 10px 0;">Delivered Line Items:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: #f9fafb; text-align: left;">
                  <th style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Product / Description</th>
                  <th style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${existingDO.lineItems
                  .map(
                    (item) => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${item.description || item.product?.name || "HVAC Part"}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: bold;">${item.quantity}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 12px;">
            HVAC ERP Automated QR Dispatch & Delivery Verification System
          </p>
        </div>
      `;

      await sendMail({
        to: notifyEmail,
        subject: `[DELIVERY CONFIRMED] ${formattedDN} - ${existingDO.clientName}`,
        html: htmlEmail,
        senderName: "HVAC Dispatch",
      });
    } catch (emailErr) {
      console.warn("Failed to send delivery email notification:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Delivery successfully confirmed and status updated to DELIVERED.",
      deliveryOrder: updatedDO,
    });
  } catch (error: any) {
    console.error("Delivery confirmation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
