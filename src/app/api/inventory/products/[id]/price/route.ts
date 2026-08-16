import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session || !hasPermission(session, "MANAGE_INVENTORY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { salesPrice } = await req.json();
    if (salesPrice === undefined || isNaN(Number(salesPrice)) || Number(salesPrice) < 0) {
      return NextResponse.json({ error: "Invalid sales price value" }, { status: 400 });
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        salesPrice: Number(salesPrice),
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
