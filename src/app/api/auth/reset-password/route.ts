import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import * as bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/mail";

// 1. Request Reset Link (POST)
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // To prevent user enumeration, return a generic success message even if email doesn't exist
    if (user && user.isActive) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiration

      // Save token in DB (upsert/create)
      await prisma.passwordResetToken.create({
        data: {
          email,
          token,
          expiresAt,
        },
      });

      // Dispatch mail asynchronously
      await sendPasswordResetEmail(email, token);
    }

    return NextResponse.json({
      message: "If this email is registered in our system, a password reset link has been dispatched.",
    });
  } catch (error) {
    console.error("[Password Reset POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 2. Perform Reset (PUT)
export async function PUT(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // Check expiration
    if (new Date() > resetToken.expiresAt) {
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      return NextResponse.json({ error: "Token has expired" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User no longer active or exists" }, { status: 400 });
    }

    // Update password
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("[Password Reset PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
