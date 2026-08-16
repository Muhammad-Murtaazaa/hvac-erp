import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { convertToCSV, convertToExcelBuffer } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entity = (searchParams.get("entity") || "INVOICE").toUpperCase();
    const format = (searchParams.get("format") || "EXCEL").toUpperCase(); // CSV or EXCEL

    let data: any[] = [];
    const filename = `export_${entity.toLowerCase()}_${new Date().toISOString().split("T")[0]}`;

    switch (entity) {
      case "INVOICE": {
        const rows = await prisma.invoice.findMany({
          orderBy: { createdAt: "desc" },
          take: 10000,
        });
        data = rows.map((r) => ({
          Invoice_Number: r.invoiceNumber,
          Client_Name: r.clientName,
          Client_Phone: r.clientPhone || "N/A",
          Date: r.date.toISOString().split("T")[0],
          Status: r.status,
          Total_Amount: Number(r.totalAmount),
          Amount_Paid: Number(r.amountPaid),
          Balance_Due: Number(r.totalAmount) - Number(r.amountPaid),
          Is_GST: r.isGst ? "Yes" : "No",
          Notes: r.notes || "",
        }));
        break;
      }
      case "PRODUCT":
      case "INVENTORY": {
        const rows = await prisma.product.findMany({
          orderBy: { name: "asc" },
          take: 10000,
        });
        data = rows.map((r) => ({
          SKU: r.sku,
          Name: r.name,
          Category: r.category,
          Unit: r.unit,
          On_Hand_Qty: r.onHandQty,
          Incoming_Qty: r.incomingQty,
          Reorder_Level: r.reorderLevel,
          Average_Cost: Number(r.averageCost),
          Sales_Price: Number(r.salesPrice),
          Total_Asset_Value: r.onHandQty * Number(r.averageCost),
        }));
        break;
      }
      case "COMPLAINT":
      case "SUPPORT": {
        const rows = await prisma.complaint.findMany({
          include: { technician: true },
          orderBy: { createdAt: "desc" },
          take: 10000,
        });
        data = rows.map((r) => ({
          Complaint_Number: r.complaintNumber,
          Customer_Name: r.customerName,
          Customer_Phone: r.customerPhone,
          Address: r.customerAddress,
          Description: r.description,
          Status: r.status,
          Assigned_Technician: r.technician ? r.technician.name : "Unassigned",
          Amount: Number(r.amount),
          Amount_Status: r.amountStatus,
          Created_Date: r.createdAt.toISOString().split("T")[0],
        }));
        break;
      }
      case "EMPLOYEE":
      case "HRM": {
        const rows = await prisma.employee.findMany({
          orderBy: { name: "asc" },
        });
        data = rows.map((r) => ({
          Name: r.name,
          CNIC: r.cnic,
          Phone: r.phone,
          Department: r.department,
          Position: r.position,
          Status: r.status,
          Base_Salary: Number(r.baseSalary),
          Joining_Date: r.joiningDate.toISOString().split("T")[0],
          Bank_Details: r.bankDetails,
        }));
        break;
      }
      case "PURCHASE_ORDER":
      case "PROCUREMENT": {
        const rows = await prisma.purchaseOrder.findMany({
          include: { vendor: true },
          orderBy: { createdAt: "desc" },
        });
        data = rows.map((r) => ({
          PO_Number: r.poNumber,
          Vendor_Name: r.vendor.name,
          Status: r.status,
          Total_Amount: Number(r.totalAmount),
          Discount: Number(r.discount),
          Created_At: r.createdAt.toISOString().split("T")[0],
        }));
        break;
      }
      default:
        return NextResponse.json({ success: false, error: `Invalid entity: ${entity}` }, { status: 400 });
    }

    if (data.length === 0) {
      data = [{ Message: "No records found in this table." }];
    }

    if (format === "CSV") {
      const csv = convertToCSV(data);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      const buffer = convertToExcelBuffer(data, entity);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
  } catch (error: any) {
    console.error("Export API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
