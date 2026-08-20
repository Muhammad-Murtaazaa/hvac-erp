import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized: Missing or invalid authentication token" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { fcmToken, deviceModel, appVersion } = body;

    if (!fcmToken || typeof fcmToken !== "string" || !fcmToken.trim()) {
      return NextResponse.json(
        { error: "A valid fcmToken string is required" },
        { status: 400 }
      );
    }

    const cleanToken = fcmToken.trim();

    // Update FCM token on User record
    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: {
        fcmToken: cleanToken,
      },
      select: {
        id: true,
        name: true,
        email: true,
        fcmToken: true,
      },
    });

    console.log(
      `[Push Token API] Updated FCM token for user ${updatedUser.name} (${updatedUser.email}). Device: ${deviceModel || "Android"}, App: ${appVersion || "v1.0"}`
    );

    return NextResponse.json({
      success: true,
      message: "Device FCM push token registered successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
      },
    });
  } catch (err: any) {
    console.error("[Push Token POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error registering push token" },
      { status: 500 }
    );
  }
}
