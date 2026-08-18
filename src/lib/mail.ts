import nodemailer from "nodemailer";

export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  senderName?: string;
  senderEmail?: string;
  attachments?: MailAttachment[];
}

/**
 * Send an email via Brevo REST API (v3)
 */
async function sendViaBrevo(options: SendMailOptions): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return false;

  const senderEmail =
    options.senderEmail ||
    process.env.BREVO_SENDER_EMAIL ||
    process.env.SMTP_FROM ||
    "noreply@hvacerp.com";
  const senderName =
    options.senderName ||
    process.env.BREVO_SENDER_NAME ||
    "HVAC ERP System";

  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const toList = recipients
    .filter(Boolean)
    .map((email) => ({ email: email.trim() }));

  if (toList.length === 0) {
    console.warn("[Brevo Mail] No valid recipients provided.");
    return false;
  }

  const payload: any = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: toList,
    subject: options.subject,
    htmlContent: options.html,
  };

  if (options.attachments && options.attachments.length > 0) {
    payload.attachment = options.attachments.map((att) => {
      let base64Content = "";
      if (Buffer.isBuffer(att.content)) {
        base64Content = att.content.toString("base64");
      } else if (typeof att.content === "string") {
        base64Content = Buffer.from(att.content).toString("base64");
      }
      return {
        name: att.filename,
        content: base64Content,
      };
    });
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo API returned error status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  console.log(`[Brevo Mail] Successfully sent messageId: ${data.messageId || "ok"} to ${recipients.join(", ")}`);
  return true;
}

/**
 * Send an email via SMTP (Nodemailer)
 */
async function sendViaSMTP(options: SendMailOptions): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from =
    options.senderEmail
      ? `"${options.senderName || "HVAC ERP"}" <${options.senderEmail}>`
      : process.env.SMTP_FROM || `"${options.senderName || "HVAC ERP"}" <noreply@hvacerp.com>`;

  const isConfigured = !!(host && user && pass);
  if (!isConfigured) return false;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
    })),
  });

  console.log(`[SMTP Mail] Successfully sent to ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`);
  return true;
}

/**
 * Universal email dispatcher
 * Prioritizes Brevo API -> Nodemailer SMTP -> Console fallback
 */
export async function sendMail(
  toOrOptions: string | SendMailOptions,
  subject?: string,
  html?: string
) {
  let options: SendMailOptions;
  if (typeof toOrOptions === "string") {
    options = {
      to: toOrOptions,
      subject: subject || "Notification",
      html: html || "",
    };
  } else {
    options = toOrOptions;
  }

  // 1. Try Brevo API if key is present
  if (process.env.BREVO_API_KEY) {
    try {
      const sent = await sendViaBrevo(options);
      if (sent) return;
    } catch (error) {
      console.error("[Mail Service] Failed to send via Brevo API, attempting SMTP fallback:", error);
    }
  }

  // 2. Try SMTP fallback
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const sent = await sendViaSMTP(options);
      if (sent) return;
    } catch (error) {
      console.error("[Mail Service] Failed to send via SMTP:", error);
    }
  }

  // 3. Fallback log (dev / unconfigured)
  const recipientStr = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  console.log(`[Mail Service Log (Unconfigured)] To: ${recipientStr} | Subject: "${options.subject}"`);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;

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

  await sendMail({
    to: email,
    subject,
    html: htmlContent,
    senderName: "HVAC ERP Security",
  });
}
