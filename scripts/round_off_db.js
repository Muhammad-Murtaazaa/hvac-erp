const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting database decimal round-off cleanup...");

  // 1. Invoices
  await prisma.$executeRawUnsafe(`
    UPDATE "Invoice"
    SET "totalAmount" = ROUND("totalAmount"),
        "amountPaid" = ROUND("amountPaid");
  `);
  console.log("Rounded Invoice totals.");

  // 2. InvoiceLineItem
  await prisma.$executeRawUnsafe(`
    UPDATE "InvoiceLineItem"
    SET "salesPrice" = ROUND("salesPrice");
  `);
  console.log("Rounded InvoiceLineItem sales prices.");

  // 3. Payments
  await prisma.$executeRawUnsafe(`
    UPDATE "Payment"
    SET "amountPaid" = ROUND("amountPaid");
  `);
  console.log("Rounded Payments.");

  // 4. Delivery Orders & Lines
  await prisma.$executeRawUnsafe(`
    UPDATE "DOLineItem"
    SET "salesPrice" = ROUND("salesPrice");
  `);
  console.log("Rounded DOLineItems.");

  // 5. Purchase Orders & Lines
  await prisma.$executeRawUnsafe(`
    UPDATE "PurchaseOrder"
    SET "totalAmount" = ROUND("totalAmount"),
        "discount" = ROUND("discount");
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "POLineItem"
    SET "unitCost" = ROUND("unitCost");
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "GRNLineItem"
    SET "unitCost" = ROUND("unitCost");
  `);
  console.log("Rounded Purchase Orders & GRNs.");

  // 6. Ledger Entries
  await prisma.$executeRawUnsafe(`
    UPDATE "LedgerEntry"
    SET "amount" = ROUND("amount");
  `);
  console.log("Rounded LedgerEntries.");

  // 7. Returns & Refunds
  await prisma.$executeRawUnsafe(`
    UPDATE "Return"
    SET "totalAmount" = ROUND("totalAmount");
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "ReturnLineItem"
    SET "refundPrice" = ROUND("refundPrice");
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "Refund"
    SET "amountRefunded" = ROUND("amountRefunded");
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "VendorReturn"
    SET "totalAmount" = ROUND("totalAmount");
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "VendorReturnLineItem"
    SET "unitCost" = ROUND("unitCost");
  `);
  console.log("Rounded Returns & Refunds.");

  // 8. Complaints & Payroll
  await prisma.$executeRawUnsafe(`
    UPDATE "Complaint"
    SET "amount" = ROUND("amount");
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "Employee"
    SET "baseSalary" = ROUND("baseSalary");
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "PayrollRun"
    SET "baseSalary" = ROUND("baseSalary"),
        "allowances" = ROUND("allowances"),
        "deductions" = ROUND("deductions"),
        "netPay" = ROUND("netPay");
  `);
  console.log("Rounded Complaints & Payroll.");

  // 9. Product sales price & average cost
  await prisma.$executeRawUnsafe(`
    UPDATE "Product"
    SET "salesPrice" = ROUND("salesPrice"),
        "averageCost" = ROUND("averageCost");
  `);
  console.log("Rounded Products.");

  console.log("Database round-off completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error rounding off database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
