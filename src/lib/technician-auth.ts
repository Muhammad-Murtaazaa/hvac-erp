import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, UserSession } from "@/lib/auth";

export interface AuthenticatedTechnicianContext {
  session: UserSession;
  employee: {
    id: string;
    name: string;
    phone: string;
    department?: string;
    position?: string;
  };
}

/**
 * Server-side RBAC and identity resolver for the Technician Android App.
 * Strictly verifies the JWT token and maps the authenticated user to their Employee record.
 * Never trusts a technician ID passed in the request body/query.
 */
export async function getAuthenticatedTechnician(
  req: Request
): Promise<{ context?: AuthenticatedTechnicianContext; error?: NextResponse }> {
  const session = await getCurrentUser(req);
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: Missing or invalid authentication token" },
        { status: 401 }
      ),
    };
  }

  const roleName = session.role?.name?.toLowerCase() || "";
  const isTechnician = roleName === "technician";
  const isAdmin = roleName === "admin";

  if (!isTechnician && !isAdmin) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Access restricted to technicians only" },
        { status: 403 }
      ),
    };
  }

  // Fetch complete user record to check employeeId linkage if set
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, employeeId: true },
  });

  let employee = null;

  // 1. Resolve by direct employeeId linkage
  if (user?.employeeId) {
    employee = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: { id: true, name: true, phone: true, department: true, position: true },
    });
  }

  // 2. Fallback: resolve by matching Employee name (standard pattern used in support desk)
  if (!employee && user?.name) {
    employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { name: { equals: user.name, mode: "insensitive" } },
          { name: { contains: user.name } },
        ],
      },
      select: { id: true, name: true, phone: true, department: true, position: true },
    });
  }

  // 3. Admin fallback (if testing with admin credentials)
  if (!employee && isAdmin) {
    // If admin is testing, find or default to the first active technician employee
    employee = await prisma.employee.findFirst({
      where: { position: { contains: "Technician", mode: "insensitive" } },
      select: { id: true, name: true, phone: true, department: true, position: true },
    });
  }

  if (!employee) {
    return {
      error: NextResponse.json(
        { error: "Employee profile not found for authenticated technician account" },
        { status: 404 }
      ),
    };
  }

  return {
    context: {
      session,
      employee,
    },
  };
}
