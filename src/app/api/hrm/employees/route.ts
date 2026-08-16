import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_HRM") && !hasPermission(session, "MANAGE_SUPPORT"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const whereClause: any = {};

  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { cnic: { contains: search } },
      { department: { contains: search } },
      { position: { contains: search } },
    ];
  }

  const employees = await prisma.employee.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ employees });
}

export async function POST(req: Request) {
  const session = await getCurrentUser(req);
  const isHRM = hasPermission(session, "MANAGE_HRM");
  const isSupport = hasPermission(session, "MANAGE_SUPPORT");

  if (!session || (!isHRM && !isSupport)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, cnic, phone, address, department, position, joiningDate, baseSalary, bankDetails, fatherName, fatherPhone, responsiblePerson, refPhone } = await req.json();

    if (!name || !cnic || !phone || !department || !position || !joiningDate || isNaN(Number(baseSalary))) {
      return NextResponse.json({ error: "Required profile fields are missing" }, { status: 400 });
    }

    // Support team can only add Service Technicians (department === "SERVICE")
    if (!isHRM && isSupport && department !== "SERVICE") {
      return NextResponse.json({ error: "Support staff can only onboard Service Technicians" }, { status: 403 });
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        cnic,
        phone,
        address: address || "",
        department,
        position,
        joiningDate: new Date(joiningDate),
        baseSalary: Number(baseSalary),
        bankDetails: bankDetails || "",
        fatherName: fatherName || "",
        fatherPhone: fatherPhone || "",
        responsiblePerson: responsiblePerson || "",
        refPhone: refPhone || "",
      },
    });

    return NextResponse.json({ employee });
  } catch (error: any) {
    console.error("[Employees POST] Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "CNIC ID is already registered" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
