import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const [invoices, deliveryOrders, complaints, products, employees, vendors] = await Promise.all([
      // 1. Invoices
      prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: query } },
            { clientName: { contains: query } },
            { clientPhone: { contains: query } },
          ],
        },
        take: 4,
      }),

      // 2. Delivery Orders
      prisma.deliveryOrder.findMany({
        where: {
          OR: [
            { doNumber: { contains: query } },
            { clientName: { contains: query } },
            { deliveryAddress: { contains: query } },
          ],
        },
        take: 4,
      }),

      // 3. Complaints / Support
      prisma.complaint.findMany({
        where: {
          OR: [
            { complaintNumber: { contains: query } },
            { customerName: { contains: query } },
            { customerPhone: { contains: query } },
            { customerAddress: { contains: query } },
          ],
        },
        take: 4,
      }),

      // 4. Products / Inventory
      prisma.product.findMany({
        where: {
          OR: [
            { sku: { contains: query } },
            { name: { contains: query } },
            { category: { contains: query } },
          ],
        },
        take: 4,
      }),

      // 5. Employees / Technicians
      prisma.employee.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } },
            { position: { contains: query } },
          ],
        },
        take: 4,
      }),

      // 6. Vendors
      prisma.vendor.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { contactPerson: { contains: query } },
            { phone: { contains: query } },
          ],
        },
        take: 4,
      }),
    ]);

    const results = [
      ...invoices.map((i) => ({
        id: i.id,
        category: "INVOICES",
        title: `${i.invoiceNumber} - ${i.clientName}`,
        subtitle: `PKR ${Number(i.totalAmount).toLocaleString()} • ${i.status}`,
        url: `/sales?tab=invoices&q=${i.invoiceNumber}`,
      })),
      ...deliveryOrders.map((d) => ({
        id: d.id,
        category: "DELIVERY_ORDERS",
        title: `${d.doNumber} - ${d.clientName}`,
        subtitle: `${d.deliveryAddress} • ${d.status}`,
        url: `/sales?tab=dos&q=${d.doNumber}`,
      })),
      ...complaints.map((c) => ({
        id: c.id,
        category: "COMPLAINTS",
        title: `${c.complaintNumber} - ${c.customerName}`,
        subtitle: `${c.customerAddress} • Status: ${c.status}`,
        url: `/support?q=${c.complaintNumber}`,
      })),
      ...products.map((p) => ({
        id: p.id,
        category: "INVENTORY",
        title: `[${p.sku}] ${p.name}`,
        subtitle: `Stock: ${p.onHandQty} ${p.unit} • Price: PKR ${Number(p.salesPrice)}`,
        url: `/inventory?q=${p.sku}`,
      })),
      ...employees.map((e) => ({
        id: e.id,
        category: "STAFF",
        title: `${e.name} (${e.position})`,
        subtitle: `${e.phone} • ${e.department}`,
        url: `/hrm?q=${e.name}`,
      })),
      ...vendors.map((v) => ({
        id: v.id,
        category: "VENDORS",
        title: v.name,
        subtitle: `Contact: ${v.contactPerson} (${v.phone})`,
        url: `/procurement?tab=vendors&q=${v.name}`,
      })),
    ];

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Global search API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
