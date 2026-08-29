/**
 * WhatsApp Cloud API (Meta Graph API) Messaging Service
 * 
 * Provides template-based messaging, phone number normalization,
 * and high-level notifications for customer complaints and technician job assignments.
 */

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  reason?: string;
}

export interface WhatsAppTemplateOptions {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters: Array<string | number>;
}

export interface CustomerComplaintNotificationPayload {
  customerPhone: string;
  customerName: string;
  ticketNumber: string;
  technicianName: string;
  technicianPhone: string;
  scope: string;
  languageCode?: string;
}

export interface TechnicianComplaintNotificationPayload {
  technicianPhone: string;
  customerName: string;
  customerPhone: string;
  location: string;
  issueScope: string;
  pdfUrl?: string | null;
  languageCode?: string;
}

/**
 * Normalizes phone numbers to Meta WhatsApp E.164-compatible format without '+'.
 * 
 * Examples:
 * - "+92 300 1234567" -> "923001234567"
 * - "0300-1234567"     -> "923001234567"
 * - "03001234567"      -> "923001234567"
 * - "3001234567"       -> "923001234567"
 * - "00923001234567"   -> "923001234567"
 * - "+1 (555) 234-5678"-> "15552345678"
 */
export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return "";

  // Strip all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Handle leading '00' (international prefix)
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }

  // Pakistan local formatting: '03XX' -> '923XX'
  if (cleaned.startsWith("03") && cleaned.length === 11) {
    cleaned = "92" + cleaned.substring(1);
  } else if (cleaned.startsWith("3") && cleaned.length === 10) {
    cleaned = "92" + cleaned;
  }

  return cleaned;
}

/**
 * Core dispatcher to Meta WhatsApp Cloud API endpoint
 * https://graph.facebook.com/{version}/{phone_number_id}/messages
 */
export async function sendWhatsAppTemplate(
  options: WhatsAppTemplateOptions
): Promise<WhatsAppSendResult> {
  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v22.0";

    const formattedRecipient = formatWhatsAppNumber(options.to);
    if (!formattedRecipient || formattedRecipient.length < 7) {
      console.warn(`[WhatsApp Service] Invalid recipient phone number provided: "${options.to}"`);
      return { success: false, reason: "INVALID_PHONE_NUMBER" };
    }

    // Graceful degradation when WhatsApp credentials are not yet configured in .env
    if (!token || !phoneNumberId) {
      console.warn(
        `[WhatsApp Service] Meta WhatsApp Cloud API credentials missing in .env (WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID). Notification to ${formattedRecipient} simulated.`
      );
      return { success: false, reason: "WHATSAPP_NOT_CONFIGURED" };
    }

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedRecipient,
      type: "template",
      template: {
        name: options.templateName,
        language: {
          code: options.languageCode || "en_US",
        },
        components: [
          {
            type: "body",
            parameters: options.bodyParameters.map((param) => ({
              type: "text",
              text: String(param !== undefined && param !== null ? param : ""),
            })),
          },
        ],
      },
    };

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError: any = errorText;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        // Keep raw text
      }

      const errorMessage = parsedError?.error?.message || errorText;
      console.error(
        `[WhatsApp Service] Meta API Error (${response.status}) sending "${options.templateName}" to ${formattedRecipient}:`,
        parsedError
      );
      return { success: false, reason: errorMessage };
    }

    const data = await response.json();
    const messageId = data?.messages?.[0]?.id;

    console.log(
      `[WhatsApp Service] Successfully dispatched template "${options.templateName}" to ${formattedRecipient}. Message ID: ${messageId || "ok"}`
    );

    return { success: true, messageId };
  } catch (error: any) {
    console.error("[WhatsApp Service] Unexpected error in sendWhatsAppTemplate:", error?.message || error);
    return { success: false, reason: error?.message || "INTERNAL_ERROR" };
  }
}

/**
 * Sends customer notification when their complaint/service request is received and assigned.
 * Template: customer_complaint (Utility)
 * 
 * Body Parameters:
 * {{1}}: Customer Name
 * {{2}}: Complaint / Ticket Number (e.g. COMP-10024)
 * {{3}}: Assigned Technician Name
 * {{4}}: Assigned Technician Phone Number
 * {{5}}: Scheduled Scope / Work Description
 */
export async function sendCustomerComplaintWhatsApp(
  payload: CustomerComplaintNotificationPayload
): Promise<WhatsAppSendResult> {
  const { customerPhone, customerName, ticketNumber, technicianName, technicianPhone, scope, languageCode } = payload;

  return await sendWhatsAppTemplate({
    to: customerPhone,
    templateName: "customer_complaint",
    languageCode: languageCode || "en_US",
    bodyParameters: [
      customerName || "Valued Customer",
      ticketNumber || "N/A",
      technicianName || "Assigned Technician",
      technicianPhone || "N/A",
      scope || "HVAC Inspection & Maintenance",
    ],
  });
}

/**
 * Sends technician notification when a service complaint is assigned/reassigned to them.
 * Template: complaint (Utility)
 * 
 * Body Parameters:
 * {{1}}: Customer Name
 * {{2}}: Customer Phone Number
 * {{3}}: Service Location / Address
 * {{4}}: Reported Issue / Work Scope
 * {{5}}: PDF Download Link / Web Portal Job URL
 */
export async function sendTechnicianComplaintWhatsApp(
  payload: TechnicianComplaintNotificationPayload
): Promise<WhatsAppSendResult> {
  const { technicianPhone, customerName, customerPhone, location, issueScope, pdfUrl, languageCode } = payload;

  return await sendWhatsAppTemplate({
    to: technicianPhone,
    templateName: "complaint",
    languageCode: languageCode || "en_US",
    bodyParameters: [
      customerName || "Customer",
      customerPhone || "N/A",
      location || "Customer Site",
      issueScope || "General Inspection / Repair",
      pdfUrl || "N/A",
    ],
  });
}
