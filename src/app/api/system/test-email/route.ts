import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "ADMIN") && !hasPermission(session, "MANAGE_SETTINGS"))) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin permissions required" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetEmail = (body.to || "").trim();

    if (!targetEmail) {
      return NextResponse.json({ success: false, error: "Recipient email address is required" }, { status: 400 });
    }

    const result = await sendMail({
      to: targetEmail,
      subject: "TCE ERP - Test Email Dispatch",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1e3a8a; margin: 0; font-size: 24px; font-weight: 800;">TCE ERP</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Technicool Engineering Enterprise Platform</p>
          </div>
          <div style="padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 20px;">
            <p style="color: #166534; font-weight: bold; margin: 0 0 6px 0;">Email Dispatch Succeeded!</p>
            <p style="color: #15803d; font-size: 13px; margin: 0;">This test confirms that your email configuration in TCE ERP is active and delivering messages properly.</p>
          </div>
          <p style="color: #64748b; font-size: 12px;">Sent to: ${targetEmail} | Timestamp: ${new Date().toISOString()}</p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center;">Technicool Engineering • Powered by OMNYSYNC</p>
        </div>
      `,
      senderName: "TCE ERP Notifications",
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to dispatch email",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully dispatched to ${targetEmail}`,
      method: result.method,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
