const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting reconciliation of COGS and Invoice ledger entries...");

  // 1. Clean up all COGS ledger entries to ensure they are strictly GENERAL ledger entries (no party attached)
  const cogsUpdate = await prisma.ledgerEntry.updateMany({
    where: {
      OR: [
        { voucherType: "COGS" },
        { debitAccount: { contains: "Cost of Goods Sold", mode: "insensitive" } },
        { creditAccount: { contains: "Inventory Asset", mode: "insensitive" } },
      ],
    },
    data: {
      partyType: "GENERAL",
      partyId: null,
      partyName: null,
    },
  });
  console.log(`Updated ${cogsUpdate.count} COGS entries to GENERAL ledger.`);

  // 2. Reconcile existing Invoice ledger entries with master invoices
  const allInvoices = await prisma.invoice.findMany({
    include: { payments: true },
  });

  for (const inv of allInvoices) {
    const finalAmount = Number(inv.totalAmount);
    
    // Find all INV ledger entries for this invoice
    const invLedgers = await prisma.ledgerEntry.findMany({
      where: {
        OR: [
          { referenceType: "INVOICE", referenceId: inv.id, voucherType: "INV" },
          { voucherNumber: inv.invoiceNumber, voucherType: "INV" },
        ],
      },
    });

    if (invLedgers.length > 1) {
      console.log(`Invoice ${inv.invoiceNumber} has ${invLedgers.length} ledger entries. Cleaning up duplicates...`);
      // Keep the first, delete the rest
      const [first, ...rest] = invLedgers;
      await prisma.ledgerEntry.deleteMany({
        where: { id: { in: rest.map((r) => r.id) } },
      });
      // Update the first to match exact invoice total amount
      await prisma.ledgerEntry.update({
        where: { id: first.id },
        data: {
          amount: finalAmount,
          partyName: inv.clientName,
          partyId: inv.customerId || null,
        },
      });
    } else if (invLedgers.length === 1) {
      if (Number(invLedgers[0].amount) !== finalAmount) {
        console.log(`Reconciling Invoice ${inv.invoiceNumber}: ${invLedgers[0].amount} -> ${finalAmount}`);
        await prisma.ledgerEntry.update({
          where: { id: invLedgers[0].id },
          data: {
            amount: finalAmount,
            partyName: inv.clientName,
            partyId: inv.customerId || null,
          },
        });
      }
    }
  }

  console.log("Reconciliation complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
