import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ success: false, error: "Database file not found." }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `hvac_erp_backup_${dateStr}.db`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Backup API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
