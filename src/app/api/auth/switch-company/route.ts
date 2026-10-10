import { NextResponse } from "next/server";
import { getCurrentUser, signToken } from "@/lib/auth";
import { getPrismaClient, CompanyId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { company } = await req.json();
    if (!company || (company !== "TCE" && company !== "TECAIR")) {
      return NextResponse.json({ error: "Invalid company selected" }, { status: 400 });
    }

    const targetCompany = company as CompanyId;
    const targetDb = getPrismaClient(targetCompany);

    // Verify user exists and is active in target company's isolated database
    const targetUser = await targetDb.user.findFirst({
      where: {
        email: { equals: session.email, mode: "insensitive" },
        isActive: true,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: `You do not have active credentials in the ${targetCompany} workspace.` },
        { status: 403 }
      );
    }

    const newToken = signToken({
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      company: targetCompany,
    });

    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https");

    const response = NextResponse.json({
      message: `Switched to ${targetCompany} successfully`,
      activeCompany: targetCompany,
      token: newToken,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role.name,
        company: targetCompany,
        permissions: targetUser.role.permissions.map((rp) => rp.permission.name),
      },
    });

    // Update session cookies
    response.cookies.set("token", newToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });

    response.cookies.set("active_company", targetCompany, {
      httpOnly: false,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Switch Company API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
