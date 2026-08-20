import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import * as bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_USERS")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        roleId: true,
        employeeId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_USERS")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, email, password, roleId, isActive, employeeId: inputEmployeeId } = await req.json();

    if (!name || !email || !password || !roleId) {
      return NextResponse.json({ error: "Name, email, password, and role are required." }, { status: 400 });
    }

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "Email is already registered." }, { status: 400 });
    }

    // Auto-resolve employeeId if not explicitly provided
    let employeeId = inputEmployeeId || null;
    if (!employeeId && name) {
      const matchedEmployee = await prisma.employee.findFirst({
        where: {
          OR: [
            { name: { equals: name.trim(), mode: "insensitive" } },
            { name: { contains: name.trim() } },
          ],
        },
        select: { id: true },
      });
      if (matchedEmployee) {
        employeeId = matchedEmployee.id;
      }
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        roleId,
        employeeId,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        role: true,
      },
    });

    return NextResponse.json({
      message: "User account created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        employeeId: user.employeeId,
        role: {
          id: user.role.id,
          name: user.role.name,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}
