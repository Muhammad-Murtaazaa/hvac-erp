import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import * as bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });

    if (!user || !user.isActive) {
      await prisma.loginActivityLog.create({
        data: {
          email,
          status: "FAILED",
          userAgent: req.headers.get("user-agent"),
          ipAddress: req.headers.get("x-forwarded-for"),
        },
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);

    if (!isMatch) {
      await prisma.loginActivityLog.create({
        data: {
          userId: user.id,
          email,
          status: "FAILED",
          userAgent: req.headers.get("user-agent"),
          ipAddress: req.headers.get("x-forwarded-for"),
        },
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    await prisma.loginActivityLog.create({
      data: {
        userId: user.id,
        email,
        status: "SUCCESS",
        userAgent: req.headers.get("user-agent"),
        ipAddress: req.headers.get("x-forwarded-for"),
      },
    });

    const response = NextResponse.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
      },
    });

    const isHttps = req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https");

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Login API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
