import jwt from "jsonwebtoken";
import prisma from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "hvac-erp-very-secret-jwt-key-2026-08-06";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: {
    id: string;
    name: string;
  };
  permissions: string[];
}

export function signToken(payload: { id: string; email: string; name: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): { id: string; email: string; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(req: Request): Promise<UserSession | null> {
  try {
    const authHeader = req.headers.get("authorization");
    let token = "";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      // Check query parameter (useful for window.open / PDF / download links)
      try {
        const url = new URL(req.url);
        const queryToken = url.searchParams.get("token");
        if (queryToken) {
          token = queryToken;
        }
      } catch (_) {}

      // Fallback: check cookie (useful for server-side page renders/middleware)
      if (!token) {
        const cookieHeader = req.headers.get("cookie") || "";
        const match = cookieHeader.match(/token=([^;]+)/);
        if (match) {
          token = match[1];
        }
      }
    }

    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
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

    if (!user || !user.isActive) return null;

    const permissions = user.role.permissions.map((rp) => rp.permission.name);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: {
        id: user.role.id,
        name: user.role.name,
      },
      permissions,
    };
  } catch (error) {
    console.error("[Auth Helper] Error getting current user:", error);
    return null;
  }
}

export function hasPermission(session: UserSession | null, requiredPermission: string): boolean {
  if (!session) return false;
  // Admin role automatically has all permissions
  if (session.role.name.toLowerCase() === "admin") return true;
  return session.permissions.includes(requiredPermission);
}
