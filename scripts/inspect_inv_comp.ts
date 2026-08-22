import prisma from "../src/lib/db";

async function main() {
  const invoices = await prisma.invoice.findMany({
    include: { complaint: true },
  });

  console.log(`Found ${invoices.length} invoices:`);
  for (const inv of invoices) {
    console.log(`Invoice ${inv.invoiceNumber}: client=${inv.clientName}, total=${inv.totalAmount}, paid=${inv.amountPaid}, complaintId=${inv.complaintId}, complaintNum=${inv.complaint?.complaintNumber}`);
  }

  const complaints = await prisma.complaint.findMany();
  console.log(`\nFound ${complaints.length} complaints:`);
  for (const c of complaints) {
    console.log(`Complaint ${c.id}: ${c.complaintNumber} (${c.customerName}), amount=${c.amount}, amountStatus=${c.amountStatus}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
