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
 * Requires API key starting with "xkeysib-"
 */
async function sendViaBrevoRest(options: SendMailOptions): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return false;

  const senderEmail =
    options.senderEmail ||
    process.env.BREVO_SENDER_EMAIL ||
    process.env.SMTP_USER ||
    process.env.SMTP_FROM ||
    "noreply@tce.com";
  const senderName =
    options.senderName ||
    process.env.BREVO_SENDER_NAME ||
    "TCE ERP";

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
    throw new Error(`Brevo REST API returned error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  console.log(`[Brevo REST] Successfully dispatched messageId: ${data.messageId || "ok"} to ${recipients.join(", ")}`);
  return true;
}

/**
 * Send an email via Brevo SMTP Relay (smtp-relay.brevo.com:587)
 * Used when using an SMTP Master Key ("xsmtpsib-...")
 */
async function sendViaBrevoSmtpRelay(options: SendMailOptions): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS;
  if (!apiKey) return false;

  const smtpUser =
    process.env.BREVO_SMTP_LOGIN ||
    process.env.SMTP_USER ||
    process.env.BREVO_SENDER_EMAIL ||
    "noreply@tce.com";

  const senderEmail =
    options.senderEmail ||
    process.env.BREVO_SENDER_EMAIL ||
    smtpUser;

  const senderName =
    options.senderName ||
    process.env.BREVO_SENDER_NAME ||
    "TCE ERP";

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: smtpUser,
      pass: apiKey,
    },
  });

  const recipients = Array.isArray(options.to) ? options.to.join(", ") : options.to;

  await transporter.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to: recipients,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
    })),
  });

  console.log(`[Brevo SMTP Relay] Successfully sent email to ${recipients}`);
  return true;
}

/**
 * Send an email via Generic SMTP (Nodemailer)
 */
async function sendViaGenericSMTP(options: SendMailOptions): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from =
    options.senderEmail
      ? `"${options.senderName || "TCE ERP"}" <${options.senderEmail}>`
      : process.env.SMTP_FROM || `"${options.senderName || "TCE ERP"}" <noreply@tce.com>`;

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

  console.log(`[Generic SMTP] Successfully sent to ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`);
  return true;
}

/**
 * Universal email dispatcher
 * Prioritizes Brevo REST API -> Brevo SMTP Relay -> Generic SMTP -> Console fallback
 */
export async function sendMail(
  toOrOptions: string | SendMailOptions,
  subject?: string,
  html?: string
): Promise<{ success: boolean; method?: string; error?: string }> {
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

  const brevoKey = process.env.BREVO_API_KEY || "";

  // 1. If Brevo REST API key is provided (starts with xkeysib-)
  if (brevoKey.startsWith("xkeysib-") || (!brevoKey.startsWith("xsmtpsib-") && brevoKey.length > 20)) {
    try {
      const sent = await sendViaBrevoRest(options);
      if (sent) return { success: true, method: "Brevo REST API" };
    } catch (error: any) {
      console.error("[Mail Service] Failed to send via Brevo REST API:", error.message);
    }
  }

  // 2. If Brevo SMTP Master Key is provided (starts with xsmtpsib-)
  if (brevoKey.startsWith("xsmtpsib-")) {
    try {
      const sent = await sendViaBrevoSmtpRelay(options);
      if (sent) return { success: true, method: "Brevo SMTP Relay" };
    } catch (error: any) {
      console.error("[Mail Service] Failed to send via Brevo SMTP Relay:", error.message);
    }
  }

  // 3. Try standard custom SMTP fallback
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const sent = await sendViaGenericSMTP(options);
      if (sent) return { success: true, method: "Generic SMTP" };
    } catch (error: any) {
      console.error("[Mail Service] Failed to send via SMTP:", error.message);
    }
  }

  // 4. Console log fallback (dev / unconfigured)
  const recipientStr = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  console.log(`[Mail Service (Unconfigured / Failed)] To: ${recipientStr} | Subject: "${options.subject}"`);
  return {
    success: false,
    error: "No working email transport succeeded. Check your Brevo API key (xkeysib-...) or Brevo SMTP Login in .env.",
  };
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;

  const subject = "TCE ERP - Password Reset Request";
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #1e3a8a; margin: 0; font-size: 24px; font-weight: 800;">TCE ERP</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Technicool Engineering Enterprise Platform</p>
      </div>
      <p style="color: #334155; font-size: 15px;">Hello,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">We received a request to reset your password for your TCE ERP account. Click the button below to choose a new password. This link is valid for 1 hour.</p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2);">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">If you did not request a password reset, you can safely disregard this email.</p>
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center;">Technicool Engineering • Powered by OMNYSYNC</p>
    </div>
  `;

  return await sendMail({
    to: email,
    subject,
    html: htmlContent,
    senderName: "TCE Security",
  });
}
