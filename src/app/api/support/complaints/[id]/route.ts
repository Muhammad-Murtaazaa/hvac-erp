import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { recordLedgerEntry } from "@/lib/ledger";
import { recordAuditSnapshot } from "@/lib/audit";
import { ensureCustomer } from "@/lib/customerSync";
import { sendTechnicianPushNotification } from "@/lib/push-notify";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  const isTechnician = session?.role?.name === "Technician";
  if (!session || (!hasPermission(session, "MANAGE_SUPPORT") && !isTechnician)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status, assignedTechnicianId, remarks, amount, amountStatus, generateInvoice, customerName, customerPhone, customerAddress, description, customerId } = await req.json();

    const ticket = await prisma.complaint.findUnique({
      where: { id: params.id },
      include: { invoice: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Complaint ticket not found" }, { status: 404 });
    }

    if (isTechnician) {
      const emp = await prisma.employee.findFirst({
        where: { name: { contains: session.name } },
      });
      if (!emp || ticket.assignedTechnicianId !== emp.id) {
        return NextResponse.json({ error: "Forbidden: Complaint ticket is not assigned to you" }, { status: 403 });
      }

      if (
        (assignedTechnicianId !== undefined && assignedTechnicianId !== ticket.assignedTechnicianId) ||
        (amount !== undefined && Number(amount) !== Number(ticket.amount)) ||
        (amountStatus !== undefined && amountStatus !== ticket.amountStatus) ||
        customerName ||
        customerPhone ||
        customerAddress ||
        generateInvoice
      ) {
        return NextResponse.json({ error: "Forbidden: You are not authorized to update assignment, customer, or billing details" }, { status: 403 });
      }

      if (status && ["RESOLVED", "CANCELLED"].includes(status)) {
        return NextResponse.json({ error: `Forbidden: Technicians are not allowed to transition tickets to ${status}` }, { status: 403 });
      }
    }

    const finalCustomerName = customerName ? customerName.trim() : ticket.customerName;
    const finalCustomerPhone = customerPhone ? customerPhone.trim() : ticket.customerPhone;
    const finalCustomerAddress = customerAddress !== undefined ? customerAddress.trim() : ticket.customerAddress;

    // Ensure customer account exists in database
    const customer = await ensureCustomer({
      name: finalCustomerName,
      phone: finalCustomerPhone,
      address: finalCustomerAddress,
      notes: "Synced via Support Ticket",
    });

    const finalCustomerId = customer?.id || customerId || ticket.customerId;

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const timelineLogs = [];

      // Determine changes
      const finalStatus = status || ticket.status;
      const finalTechId = assignedTechnicianId !== undefined ? assignedTechnicianId : ticket.assignedTechnicianId;
      const finalAmount = amount !== undefined ? Number(amount) : Number(ticket.amount);
      const finalAmountStatus = amountStatus || ticket.amountStatus;
      const finalDescription = description !== undefined ? description.trim() : ticket.description;

      // 1. Status Transition logging
      if (finalStatus !== ticket.status) {
        timelineLogs.push({
          fromStatus: ticket.status,
          toStatus: finalStatus,
          remarks: remarks || `Status transition from ${ticket.status} to ${finalStatus}`,
        });
      }

      // Customer info change logging
      if (finalCustomerName !== ticket.customerName || finalCustomerPhone !== ticket.customerPhone) {
        timelineLogs.push({
          fromStatus: ticket.status,
          toStatus: finalStatus,
          remarks: `Customer details updated: ${finalCustomerName} (${finalCustomerPhone})`,
        });
      }

      // 2. Tech dispatch logging
      if (finalTechId !== ticket.assignedTechnicianId) {
        if (finalTechId) {
          const tech = await tx.employee.findUnique({ where: { id: finalTechId } });
          timelineLogs.push({
            fromStatus: ticket.status,
            toStatus: finalStatus,
            remarks: `Technician reassigned to ${tech?.name || "Technician"}`,
          });
        } else {
          timelineLogs.push({
            fromStatus: ticket.status,
            toStatus: finalStatus,
            remarks: `Technician assignment cleared`,
          });
        }
      }

      // 3. Optional Service Invoice Generation
      let linkedInvoiceId = ticket.invoice?.id || null;

      if (generateInvoice && finalAmount > 0 && !ticket.invoice) {
        const invCount = await tx.invoice.count();
        const invoiceNumber = `INV-${10001 + invCount}`;

        // Create Sales Service Invoice (no stock deducts)
        const inv = await tx.invoice.create({
          data: {
            invoiceNumber,
            customerId: finalCustomerId || null,
            clientName: finalCustomerName,
            clientPhone: finalCustomerPhone,
            clientAddress: finalCustomerAddress,
            date: new Date(),
            status: "UNPAID",
            totalAmount: finalAmount,
            amountPaid: 0.00,
            complaintId: ticket.id,
            lineItems: {
              create: [
                {
                  description: `Service Charges for Ticket ${ticket.complaintNumber}: ${finalDescription}`,
                  quantity: 1,
                  salesPrice: finalAmount,
                },
              ],
            },
          },
        });

        linkedInvoiceId = inv.id;

        // Post ledger entries: Debit AR / Credit Revenue
        await recordLedgerEntry(tx, {
          description: `Service billing for Complaint ${ticket.complaintNumber} (${invoiceNumber})`,
          debitAccount: "Accounts Receivable (Trade Debtors)",
          creditAccount: "Service & Maintenance Income",
          amount: finalAmount,
          referenceType: "INVOICE",
          referenceId: inv.id,
          partyType: "CUSTOMER",
          partyName: finalCustomerName,
          voucherType: "INV",
          voucherNumber: invoiceNumber,
        });

        timelineLogs.push({
          fromStatus: finalStatus,
          toStatus: finalStatus,
          remarks: `Service charge invoice generated: ${invoiceNumber} (PKR ${finalAmount.toFixed(2)})`,
        });
      }

      // 4. Update the complaint record
      const updated = await tx.complaint.update({
        where: { id: params.id },
        data: {
          status: finalStatus,
          assignedTechnicianId: finalTechId,
          amount: finalAmount,
          amountStatus: finalAmountStatus,
          customerName: finalCustomerName,
          customerPhone: finalCustomerPhone,
          customerAddress: finalCustomerAddress,
          description: finalDescription,
          customerId: finalCustomerId,
          remarks: remarks !== undefined ? remarks : ticket.remarks,
        },
        include: {
          technician: true,
          attachments: true,
          invoice: {
            include: {
              payments: true,
            },
          },
          timeline: {
            include: {
              changedBy: true,
            },
            orderBy: { timestamp: "desc" },
          },
        },
      });

      // 5. Save all timeline notes
      for (const log of timelineLogs) {
        await tx.complaintTimeline.create({
          data: {
            complaintId: ticket.id,
            changedById: session.id,
            fromStatus: log.fromStatus,
            toStatus: log.toStatus,
            remarks: log.remarks,
          },
        });
      }

      return updated;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Record audit snapshot
    await recordAuditSnapshot({
      entityName: "Complaint",
      entityId: params.id,
      action: "UPDATE",
      actor: { id: session.id, email: session.email },
      afterState: updatedTicket,
    });

    // If technician was assigned or reassigned, send push notification
    if (updatedTicket.assignedTechnicianId && updatedTicket.assignedTechnicianId !== ticket.assignedTechnicianId) {
      sendTechnicianPushNotification({
        technicianEmployeeId: updatedTicket.assignedTechnicianId,
        title: "Service Job Assigned to You",
        body: `Job ${updatedTicket.complaintNumber}: ${updatedTicket.customerName} - ${updatedTicket.description.slice(0, 60)}`,
        data: {
          jobId: updatedTicket.id,
          complaintNumber: updatedTicket.complaintNumber,
          type: "JOB_ASSIGNED",
        },
      }).catch((err) => console.error("[Complaint Update Push Trigger] Error:", err));
    }

    return NextResponse.json({ complaint: updatedTicket });
  } catch (error: any) {
    console.error("[Complaint PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
