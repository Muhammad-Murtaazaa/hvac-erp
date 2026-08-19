import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import * as bcrypt from "bcryptjs";
import { sendOtpResetEmail } from "@/lib/mail";

// 1. Request Password Reset OTP (POST)
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });

    if (!user || !user.isActive) {
      // Return clear feedback for better UX
      return NextResponse.json({ error: "No active account found with this email address." }, { status: 404 });
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    // Delete any old pending reset tokens for this user email
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    // Save fresh 6-digit OTP token in DB
    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token: otp,
        expiresAt,
      },
    });

    // Dispatch verification OTP via Brevo
    await sendOtpResetEmail(user.email, otp);

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${user.email}. Please check your inbox.`,
    });
  } catch (error: any) {
    console.error("[Password Reset POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to dispatch reset code" }, { status: 500 });
  }
}

// 2. Perform Password Reset with OTP or Token (PUT)
export async function PUT(req: Request) {
  try {
    const { email, token, otp, newPassword } = await req.json();

    const verificationCode = (otp || token || "").trim();
    const password = (newPassword || "").trim();
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!verificationCode || !password) {
      return NextResponse.json({ error: "Verification code and new password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters long" }, { status: 400 });
    }

    // Find token matching the code
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: verificationCode,
        ...(normalizedEmail ? { email: { equals: normalizedEmail, mode: "insensitive" } } : {}),
      },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "Invalid verification code. Please check and try again." }, { status: 400 });
    }

    // Check expiration
    if (new Date() > resetRecord.expiresAt) {
      await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });
      return NextResponse.json({ error: "Verification code has expired. Please request a new code." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: resetRecord.email },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User account is no longer active" }, { status: 400 });
    }

    // Hash the new password with bcrypt
    const passwordHash = bcrypt.hashSync(password, 10);

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate the reset token
    await prisma.passwordResetToken.delete({
      where: { id: resetRecord.id },
    });

    return NextResponse.json({
      success: true,
      message: "Password has been successfully reset! You can now sign in with your new password.",
    });
  } catch (error: any) {
    console.error("[Password Reset PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to reset password" }, { status: 500 });
  }
}
