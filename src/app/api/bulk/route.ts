import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordAuditSnapshot } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, ids, data } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "Missing required fields (action, ids array)" }, { status: 400 });
    }

    // Role-based authorization per action
    if (action === "ASSIGN_TECHNICIAN" || action === "UPDATE_COMPLAINT_STATUS") {
      if (!hasPermission(session, "MANAGE_SUPPORT") && !hasPermission(session, "ADMIN")) {
        return NextResponse.json({ success: false, error: "Forbidden: Support management permission required" }, { status: 403 });
      }
    } else if (action === "UPDATE_INVOICE_STATUS") {
      if (!hasPermission(session, "MANAGE_SALES") && !hasPermission(session, "ADMIN")) {
        return NextResponse.json({ success: false, error: "Forbidden: Sales management permission required" }, { status: 403 });
      }
    } else if (action === "DELETE_PRODUCTS") {
      if (!hasPermission(session, "MANAGE_INVENTORY") && !hasPermission(session, "ADMIN")) {
        return NextResponse.json({ success: false, error: "Forbidden: Inventory management permission required" }, { status: 403 });
      }
    } else if (!hasPermission(session, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Forbidden: Administrator permission required" }, { status: 403 });
    }

    const currentActor = { id: session.id, email: session.email };

    switch (action) {
      // 1. Bulk Assign Technicians to Complaints
      case "ASSIGN_TECHNICIAN": {
        const { technicianId } = data;
        if (!technicianId) {
          return NextResponse.json({ success: false, error: "Missing technicianId" }, { status: 400 });
        }

        const technician = await prisma.employee.findUnique({ where: { id: technicianId } });
        if (!technician) {
          return NextResponse.json({ success: false, error: "Technician not found" }, { status: 404 });
        }

        const updated = await prisma.complaint.updateMany({
          where: { id: { in: ids } },
          data: {
            assignedTechnicianId: technicianId,
            status: "IN_PROGRESS",
          },
        });

        // Add timeline updates
        for (const cid of ids) {
          await prisma.complaintTimeline.create({
            data: {
              complaintId: cid,
              changedById: currentActor.id || "admin-user",
              fromStatus: "OPEN",
              toStatus: "IN_PROGRESS",
              remarks: `Bulk assigned to technician: ${technician.name}`,
            },
          });
        }

        return NextResponse.json({
          success: true,
          message: `Successfully assigned ${technician.name} to ${updated.count} ticket(s).`,
          count: updated.count,
        });
      }

      // 2. Bulk Update Complaints Status
      case "UPDATE_COMPLAINT_STATUS": {
        const { status } = data;
        if (!status) {
          return NextResponse.json({ success: false, error: "Missing status" }, { status: 400 });
        }

        const updated = await prisma.complaint.updateMany({
          where: { id: { in: ids } },
          data: { status },
        });

        return NextResponse.json({
          success: true,
          message: `Updated status to ${status} for ${updated.count} complaint(s).`,
          count: updated.count,
        });
      }

      // 3. Bulk Update Invoices Status
      case "UPDATE_INVOICE_STATUS": {
        const { status } = data;
        if (!status) {
          return NextResponse.json({ success: false, error: "Missing status" }, { status: 400 });
        }

        const updated = await prisma.invoice.updateMany({
          where: { id: { in: ids } },
          data: { status },
        });

        return NextResponse.json({
          success: true,
          message: `Updated ${updated.count} invoice(s) to ${status}.`,
          count: updated.count,
        });
      }

      // 4. Bulk Delete Stock / Products
      case "DELETE_PRODUCTS": {
        const deletedCount = await prisma.$transaction(async (tx) => {
          // 1. Nullify productId in invoiceLineItems, doLineItems, returnLineItems to preserve historical invoices & DOs
          await tx.invoiceLineItem.updateMany({
            where: { productId: { in: ids } },
            data: { productId: null },
          });

          await tx.dOLineItem.updateMany({
            where: { productId: { in: ids } },
            data: { productId: null },
          });

          await tx.returnLineItem.updateMany({
            where: { productId: { in: ids } },
            data: { productId: null },
          });

          // 2. Delete VendorReturnLineItem referencing the products
          await tx.vendorReturnLineItem.deleteMany({
            where: { productId: { in: ids } },
          });

          // 3. Delete GRNLineItem referencing the products
          await tx.gRNLineItem.deleteMany({
            where: { productId: { in: ids } },
          });

          // 4. Delete POPendingItem referencing the products
          await tx.pOPendingItem.deleteMany({
            where: { productId: { in: ids } },
          });

          // 5. Delete POLineItem referencing the products
          await tx.pOLineItem.deleteMany({
            where: { productId: { in: ids } },
          });

          // 6. Delete StockAdjustment referencing the products
          await tx.stockAdjustment.deleteMany({
            where: { productId: { in: ids } },
          });

          // 7. Delete StockLedger logs referencing the products
          await tx.stockLedger.deleteMany({
            where: { productId: { in: ids } },
          });

          // 8. Delete Product records
          const res = await tx.product.deleteMany({
            where: { id: { in: ids } },
          });

          return res.count;
        });

        return NextResponse.json({
          success: true,
          message: `Deleted ${deletedCount} product item(s) and cleared associated stock records.`,
          count: deletedCount,
        });
      }

      default:
        return NextResponse.json({ success: false, error: `Unsupported bulk action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Bulk action error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
