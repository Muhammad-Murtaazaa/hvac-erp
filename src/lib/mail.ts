import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@hvacerp.com";

  const isConfigured = !!(host && user && pass);

  const subject = "HVAC ERP - Password Reset Request";
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-top: 0;">Password Reset</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for the HVAC ERP system. Click the button below to choose a new password. This link is valid for 1 hour.</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">If you did not request a password reset, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">HVAC Service & Trading ERP System</p>
    </div>
  `;

  if (isConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`[Mail Service] Password reset link sent to ${email}`);
    } catch (error) {
      console.error("[Mail Service] Failed to send email via SMTP:", error);
      console.log(`[Mail Service Fallback] Reset link for ${email}: ${resetLink}`);
    }
  } else {
    console.log(`[Mail Service Log (SMTP Unconfigured)] Reset link for ${email}: ${resetLink}`);
  }
}
export async function sendMail(to: string, subject: string, html: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@hvacerp.com";

  const isConfigured = !!(host && user && pass);

  if (isConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({ from, to, subject, html });
      console.log(`[Mail Service] Sent mail to ${to}`);
    } catch (error) {
      console.error("[Mail Service] Error sending mail to " + to, error);
    }
  } else {
    console.log(`[Mail Service Log (SMTP Unconfigured)] Mail to ${to} with subject "${subject}"`);
  }
}
