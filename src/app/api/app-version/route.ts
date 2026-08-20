import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public endpoint returning the latest Android Technician Companion App version information.
 * No authentication required.
 * Reads dynamically from the SystemSetting table or falls back to environment variables.
 */
export async function GET() {
  try {
    // 1. Fetch any runtime settings from the database
    let settingsMap: Record<string, string> = {};
    try {
      const dbSettings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              "TECHNICIAN_APP_VERSION",
              "TECHNICIAN_APP_DOWNLOAD_URL",
              "TECHNICIAN_APP_MIN_VERSION",
              "TECHNICIAN_APP_RELEASE_NOTES",
              "TECHNICIAN_APP_FORCE_UPDATE",
            ],
          },
        },
      });
      settingsMap = dbSettings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {} as Record<string, string>);
    } catch (dbErr) {
      console.warn("[App Version GET] Database settings read warning (using env fallback):", dbErr);
    }

    // 2. Resolve values with priority: DB Settings -> Environment Variables -> Sensible Defaults
    const version =
      settingsMap["TECHNICIAN_APP_VERSION"] ||
      process.env.TECHNICIAN_APP_VERSION ||
      "1.0.0";

    const downloadUrl =
      settingsMap["TECHNICIAN_APP_DOWNLOAD_URL"] ||
      process.env.TECHNICIAN_APP_DOWNLOAD_URL ||
      "https://tce-hvac.com/downloads/technician-app-latest.apk";

    const minSupportedVersion =
      settingsMap["TECHNICIAN_APP_MIN_VERSION"] ||
      process.env.TECHNICIAN_APP_MIN_VERSION ||
      "1.0.0";

    const releaseNotes =
      settingsMap["TECHNICIAN_APP_RELEASE_NOTES"] ||
      process.env.TECHNICIAN_APP_RELEASE_NOTES ||
      "Official Technicool Engineering Companion App for field service technicians.";

    const forceUpdateRaw =
      settingsMap["TECHNICIAN_APP_FORCE_UPDATE"] ||
      process.env.TECHNICIAN_APP_FORCE_UPDATE ||
      "false";

    const forceUpdate = forceUpdateRaw === "true" || forceUpdateRaw === "1";

    return NextResponse.json({
      appName: "TCE Technician Companion",
      platform: "android",
      version,
      downloadUrl,
      minSupportedVersion,
      forceUpdate,
      releaseNotes,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[App Version GET] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve app version information" },
      { status: 500 }
    );
  }
}
