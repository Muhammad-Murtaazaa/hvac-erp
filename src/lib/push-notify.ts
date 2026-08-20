import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging, Message } from "firebase-admin/messaging";
import prisma from "./db";

let firebaseApp: App | null = null;

/**
 * Initializes Firebase Admin using discrete environment variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY (with \n replacement for literal newlines)
 *
 * Prevents re-initialization crashes during Next.js hot-reloads.
 * Returns null and logs a warning on missing/invalid credentials for graceful degradation.
 */
export function getFirebaseApp(): App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    console.warn(
      "[Push Service] Firebase Admin credentials missing in .env (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY). Push notifications are disabled (graceful fallback)."
    );
    return null;
  }

  try {
    // Replace escaped \n with real newlines required by RSA certificate parser
    const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    console.log(`[Push Service] Firebase Admin initialized successfully for project: ${projectId}`);
    return firebaseApp;
  } catch (error: any) {
    console.warn("[Push Service] Invalid Firebase Admin credentials in .env. Initialization failed:", error?.message || error);
    return null;
  }
}

export interface PushNotificationPayload {
  technicianEmployeeId?: string | null;
  userId?: string | null;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  reason?: string;
}

/**
 * Sends a push notification to a technician via Firebase Cloud Messaging.
 * Gracefully degrades if Firebase is not configured or if the technician has no registered FCM token.
 */
export async function sendTechnicianPushNotification(
  payload: PushNotificationPayload
): Promise<PushNotificationResult> {
  try {
    const { technicianEmployeeId, userId, title, body, data = {} } = payload;

    if (!technicianEmployeeId && !userId) {
      return { success: false, reason: "NO_RECIPIENT_SPECIFIED" };
    }

    // Resolve user's FCM token from database
    let fcmToken: string | null = null;
    let technicianName: string = "Technician";

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, fcmToken: true },
      });
      if (user) {
        fcmToken = user.fcmToken;
        technicianName = user.name;
      }
    } else if (technicianEmployeeId) {
      // 1. Try finding User directly by employeeId
      let user = await prisma.user.findFirst({
        where: { employeeId: technicianEmployeeId },
        select: { id: true, name: true, fcmToken: true },
      });

      // 2. Fallback: match by Employee name
      if (!user) {
        const employee = await prisma.employee.findUnique({
          where: { id: technicianEmployeeId },
          select: { name: true, phone: true },
        });

        if (employee) {
          technicianName = employee.name;
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { name: { equals: employee.name, mode: "insensitive" } },
                { name: { contains: employee.name } },
              ],
            },
            select: { id: true, name: true, fcmToken: true },
          });
        }
      }

      if (user) {
        fcmToken = user.fcmToken;
      }
    }

    if (!fcmToken) {
      console.log(`[Push Service] No FCM token found for technician ${technicianName}. Notification skipped.`);
      return { success: false, reason: "NO_FCM_TOKEN" };
    }

    const app = getFirebaseApp();
    if (!app) {
      console.log(`[Push Service] Firebase Admin not configured. Push to ${technicianName} simulated (Token: ${fcmToken.slice(0, 8)}...).`);
      return { success: false, reason: "FIREBASE_NOT_CONFIGURED" };
    }

    // Ensure all data payload values are strings (required by FCM)
    const stringifiedData: Record<string, string> = {
      click_action: "FLUTTER_NOTIFICATION_CLICK",
      ...data,
    };

    const message: Message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: stringifiedData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "technician_jobs_channel",
          priority: "high",
        },
      },
    };

    const messaging = getMessaging(app);
    const response = await messaging.send(message);
    console.log(`[Push Service] Push notification successfully sent to ${technicianName}. Message ID: ${response}`);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error("[Push Service] Error dispatching push notification:", error?.message || error);
    return { success: false, reason: error?.message || "DISPATCH_FAILED" };
  }
}
