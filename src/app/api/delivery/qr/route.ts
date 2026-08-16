import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing DO ID" }, { status: 400 });
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const confirmUrl = `${proto}://${host}/delivery/confirm/${id}`;

    // Generate PNG Data URL
    const qrDataUrl = await QRCode.toDataURL(confirmUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 250,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    return NextResponse.json({
      success: true,
      url: confirmUrl,
      qrDataUrl,
    });
  } catch (error: any) {
    console.error("QR Code Generation Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
