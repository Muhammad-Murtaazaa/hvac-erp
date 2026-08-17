import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_ROLES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const permissions = await prisma.permission.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ roles, permissions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_ROLES")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, name, description, roleId, permissionIds } = await req.json();

    if (action === "createRole") {
      if (!name) {
        return NextResponse.json({ error: "Role name is required." }, { status: 400 });
      }

      const existing = await prisma.role.findUnique({
        where: { name },
      });
      if (existing) {
        return NextResponse.json({ error: "Role with this name already exists." }, { status: 400 });
      }

      const role = await prisma.role.create({
        data: {
          name,
          description,
        },
      });

      return NextResponse.json({ message: "Role created successfully", role });
    }

    if (action === "updateMapping") {
      if (!roleId || !Array.isArray(permissionIds)) {
        return NextResponse.json({ error: "Role ID and permission IDs array are required." }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // Clear existing mappings
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        // Insert new mappings
        for (const permId of permissionIds) {
          await tx.rolePermission.create({
            data: {
              roleId,
              permissionId: permId,
            },
          });
        }
      }, {
        maxWait: 15000,
        timeout: 30000,
      });

      return NextResponse.json({ message: "Role permission mapping updated successfully" });
    }

    return NextResponse.json({ error: "Invalid action type." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process role request" }, { status: 500 });
  }
}
