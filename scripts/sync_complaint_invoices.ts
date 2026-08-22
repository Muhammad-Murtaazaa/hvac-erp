import prisma from "../src/lib/db";

async function main() {
  const complaints = await prisma.complaint.findMany({
    include: { invoice: true },
  });

  console.log(`Found ${complaints.length} complaints.`);
  for (const c of complaints) {
    if (c.invoice) {
      console.log(`Complaint ${c.complaintNumber} (${c.customerName}):`);
      console.log(`  - Invoice: ${c.invoice.invoiceNumber}`);
      console.log(`  - Invoice Total: ${c.invoice.totalAmount}`);
      console.log(`  - Invoice Paid: ${c.invoice.amountPaid}`);
      console.log(`  - Complaint Amount (before): ${c.amount}`);

      const invTotal = Number(c.invoice.totalAmount);
      const invPaid = Number(c.invoice.amountPaid);
      const status = invPaid >= invTotal ? "PAID" : invPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";

      await prisma.complaint.update({
        where: { id: c.id },
        data: {
          amount: invTotal,
          amountStatus: status,
        },
      });
      console.log(`  -> Synced complaint amount to ${invTotal} (${status})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
