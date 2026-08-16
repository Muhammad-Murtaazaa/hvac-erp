import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const templates = await prisma.savedReportTemplate.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, entity, config, createdById } = body;

    if (!title || !entity || !config) {
      return NextResponse.json({ success: false, error: "Missing required fields (title, entity, config)" }, { status: 400 });
    }

    const template = await prisma.savedReportTemplate.create({
      data: {
        title,
        description,
        entity: entity.toUpperCase(),
        config: typeof config === "string" ? config : JSON.stringify(config),
        createdById: createdById || "system-user",
      },
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing template ID" }, { status: 400 });
    }

    await prisma.savedReportTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Template deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
