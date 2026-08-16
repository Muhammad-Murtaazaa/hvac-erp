import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
        deliveryOrder: true,
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
