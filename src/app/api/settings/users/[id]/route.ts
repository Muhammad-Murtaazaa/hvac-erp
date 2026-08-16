import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import * as bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_USERS")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, email, password, roleId, isActive } = await req.json();

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    // Check if email already in use by someone else
    if (email && email.toLowerCase() !== targetUser.email.toLowerCase()) {
      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existing) {
        return NextResponse.json({ error: "Email is already registered by another account." }, { status: 400 });
      }
    }

    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email.toLowerCase();
    if (roleId) data.roleId = roleId;
    if (isActive !== undefined) data.isActive = isActive;
    
    // Hash password if updated
    if (password && password.trim() !== "") {
      data.passwordHash = bcrypt.hashSync(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      include: {
        role: true,
      },
    });

    return NextResponse.json({
      message: "User account updated successfully",
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        isActive: updated.isActive,
        role: {
          id: updated.role.id,
          name: updated.role.name,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}
