import { NextResponse } from "next/server";

/**
 * WhatsApp Cloud API Webhook Endpoint
 * 
 * 1. GET: Handles Meta Webhook verification handshake (hub.mode, hub.verify_token, hub.challenge)
 * 2. POST: Ingests incoming WhatsApp events (delivery receipts, read receipts, inbound messages)
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const expectedVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "hvac_erp_meta_webhook_secret_2026";

    // Meta Webhook Verification Handshake
    if (mode === "subscribe" && token === expectedVerifyToken) {
      console.log("[WhatsApp Webhook] Meta challenge verification succeeded.");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.warn(
      `[WhatsApp Webhook] Verification failed. Token provided: "${token}", Expected: "${expectedVerifyToken}", Mode: "${mode}"`
    );
    return new Response("Verification failed", { status: 403 });
  } catch (error: any) {
    console.error("[WhatsApp Webhook GET] Error:", error);
    return new Response("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ status: "IGNORED" }, { status: 200 });
    }

    // Process Meta WhatsApp Webhook event payload
    if (body.object === "whatsapp_business_account" || Array.isArray(body.entry)) {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (!value) continue;

          // 1. Process delivery statuses (e.g. sent, delivered, read, failed)
          if (Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
              const recipientId = statusObj.recipient_id;
              const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
              const messageId = statusObj.id;
              const timestamp = statusObj.timestamp;

              console.log(
                `[WhatsApp Webhook] Delivery status update: Message ${messageId} to ${recipientId} -> [${status?.toUpperCase()}] (ts: ${timestamp})`
              );

              if (statusObj.errors) {
                console.error(
                  `[WhatsApp Webhook Delivery Error] Message ${messageId}:`,
                  JSON.stringify(statusObj.errors)
                );
              }
            }
          }

          // 2. Process incoming customer / technician messages
          if (Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              const from = msg.from;
              const msgType = msg.type;
              const textBody = msg.text?.body || "";
              const messageId = msg.id;

              console.log(
                `[WhatsApp Webhook Inbound] Received ${msgType} message (${messageId}) from ${from}: "${textBody}"`
              );
            }
          }
        }
      }
    }

    // Immediate 200 acknowledgement to prevent Meta webhook retries
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error: any) {
    console.error("[WhatsApp Webhook POST] Error parsing webhook payload:", error);
    // Return 200 with error status so Meta does not retry corrupted payloads endlessly
    return NextResponse.json({ status: "ERROR_LOGGED", error: error.message }, { status: 200 });
  }
}
