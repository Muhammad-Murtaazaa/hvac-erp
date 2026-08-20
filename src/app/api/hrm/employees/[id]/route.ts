import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser(req);
  if (!session || (!hasPermission(session, "MANAGE_HRM") && !hasPermission(session, "MANAGE_SUPPORT"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        attendance: {
          take: 30,
          orderBy: { date: "desc" },
        },
        payrollRuns: {
          take: 12,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error: any) {
    console.error("[Employee GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch employee" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser(req);
  const isHRM = hasPermission(session, "MANAGE_HRM");
  const isSupport = hasPermission(session, "MANAGE_SUPPORT");

  if (!session || (!isHRM && !isSupport)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const {
      employeeNo,
      name,
      cnic,
      phone,
      address,
      department,
      position,
      joiningDate,
      baseSalary,
      status,
      bankDetails,
      fatherName,
      fatherPhone,
      responsiblePerson,
      refPhone,
    } = await req.json();

    if (!name || !cnic || !phone || !department || !position || !joiningDate || isNaN(Number(baseSalary))) {
      return NextResponse.json({ error: "Required profile fields are missing" }, { status: 400 });
    }

    // Support team can only edit Service Technicians (department === "SERVICE")
    if (!isHRM && isSupport && department !== "SERVICE") {
      return NextResponse.json({ error: "Support staff can only manage Service Technicians" }, { status: 403 });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        employeeNo: employeeNo !== undefined ? employeeNo : existingEmployee.employeeNo,
        name: name.trim(),
        cnic: cnic.trim(),
        phone: phone.trim(),
        address: address !== undefined ? address.trim() : existingEmployee.address,
        department,
        position: position.trim(),
        joiningDate: new Date(joiningDate),
        baseSalary: Number(baseSalary),
        status: status || existingEmployee.status,
        bankDetails: bankDetails !== undefined ? bankDetails.trim() : existingEmployee.bankDetails,
        fatherName: fatherName !== undefined ? fatherName.trim() : existingEmployee.fatherName,
        fatherPhone: fatherPhone !== undefined ? fatherPhone.trim() : existingEmployee.fatherPhone,
        responsiblePerson: responsiblePerson !== undefined ? responsiblePerson.trim() : existingEmployee.responsiblePerson,
        refPhone: refPhone !== undefined ? refPhone.trim() : existingEmployee.refPhone,
      },
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Employee",
      entityId: params.id,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      beforeState: existingEmployee,
      afterState: updatedEmployee,
    });

    return NextResponse.json({
      success: true,
      message: "Employee profile updated successfully",
      employee: updatedEmployee,
    });
  } catch (error: any) {
    console.error("[Employee PUT] Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "CNIC ID or Employee Number is already in use by another employee" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to update employee profile" }, { status: 500 });
  }
}
