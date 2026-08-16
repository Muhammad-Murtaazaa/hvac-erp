import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const doRecord = await prisma.deliveryOrder.findUnique({
      where: { id: params.id },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        invoices: {
          select: {
            notes: true,
          },
        },
      },
    });

    if (!doRecord) {
      return NextResponse.json({ error: "Delivery Order not found" }, { status: 404 });
    }

    return NextResponse.json({ deliveryOrder: doRecord });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
