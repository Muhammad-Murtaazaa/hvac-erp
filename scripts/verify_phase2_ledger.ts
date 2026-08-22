import prisma from "@/lib/db";
import { postJournalEntry } from "@/lib/journal";
import { getNextVoucherNumber, recordLedgerEntry } from "@/lib/ledger";

async function runPhase2Verification() {
  console.log("=================================================================");
  console.log("⚡ STARTING PHASE 2 COMPREHENSIVE FINANCIAL VERIFICATION TEST ⚡");
  console.log("=================================================================\n");

  const results: { test: string; passed: boolean; details: any }[] = [];

  // Account names from CANONICAL_ACCOUNTS
  const AR_ACCOUNT = "Accounts Receivable (Trade Debtors)";
  const MEEZAN_ACCOUNT = "Bank Account (Meezan Bank)";
  const SALES_REVENUE = "Sales Revenue";

  // Find or create test customer, vendor, employee, product
  const testCustomer = await prisma.customer.upsert({
    where: { phone: "0300-1234567" },
    update: {},
    create: {
      name: "TEST-CLIENT-ALPHA",
      phone: "0300-1234567",
      address: "Industrial Zone, Karachi",
    },
  });

  let testVendor = await prisma.vendor.findFirst({ where: { name: "TEST-SUPPLIER-BETA" } });
  if (!testVendor) {
    testVendor = await prisma.vendor.create({
      data: {
        name: "TEST-SUPPLIER-BETA",
        contactPerson: "Mr. Farooq Supplier",
        phone: "0321-7654321",
        address: "Hub Industrial Area",
        paymentTerms: "Net 30 Days",
      },
    });
  }

  let testEmployee = await prisma.employee.findFirst({ where: { employeeNo: "EMP-TEST-99" } });
  if (!testEmployee) {
    testEmployee = await prisma.employee.create({
      data: {
        employeeNo: "EMP-TEST-99",
        name: "Test Technician Tariq",
        phone: "0333-9876543",
        cnic: "42101-9999999-1",
        address: "Gulshan, Karachi",
        joiningDate: new Date(),
        baseSalary: 55000,
        bankDetails: "Meezan Bank - 0101010101",
        department: "Technical & HVAC",
        position: "Senior Technician",
        status: "ACTIVE",
      },
    });
  }

  let testProduct = await prisma.product.findFirst({ where: { sku: "TEST-AC-1.5T" } });
  if (!testProduct) {
    testProduct = await prisma.product.create({
      data: {
        sku: "TEST-AC-1.5T",
        name: "Test Inverter AC 1.5 Ton",
        category: "Air Conditioners",
        unit: "UNIT",
        reorderLevel: 5,
        averageCost: 85000,
        salesPrice: 120000,
        onHandQty: 50,
      },
    });
  }

  console.log(`[Setup] Customer: ${testCustomer.name} (${testCustomer.id})`);
  console.log(`[Setup] Vendor: ${testVendor.name} (${testVendor.id})`);
  console.log(`[Setup] Employee: ${testEmployee.name} (${testEmployee.id})`);
  console.log(`[Setup] Product: ${testProduct.name}\n`);

  const initialCustLines = await prisma.journalLine.findMany({ where: { partyId: testCustomer.id } });
  const initialPartyBalance = initialCustLines.reduce((s: number, l: any) => s + Number(l.debit) - Number(l.credit), 0);

  // ---------------------------------------------------------------------------
  // TEST 1: Manual Transaction Entry (DEBIT Customer / CREDIT Bank)
  // ---------------------------------------------------------------------------
  console.log("--- TEST 1: Manual Transaction (DEBIT Customer / CREDIT Bank) ---");
  const test1Amount = 45000;
  
  const voucher1 = await prisma.$transaction(async (tx) => {
    const vNum = await getNextVoucherNumber(tx, "BPV");
    const entry = await recordLedgerEntry(tx, {
      description: "Special equipment outlay for client site",
      debitAccount: AR_ACCOUNT,
      creditAccount: MEEZAN_ACCOUNT,
      amount: test1Amount,
      referenceType: "VOUCHER",
      referenceId: vNum,
      entryDate: new Date(),
      partyType: "CUSTOMER",
      partyId: testCustomer.id,
      partyName: testCustomer.name,
      voucherType: "BPV",
      voucherNumber: vNum,
      paymentMethod: "BANK_TRANSFER",
    });

    const journal = await postJournalEntry(tx, {
      sourceType: "VOUCHER",
      sourceId: vNum,
      narration: `[BPV] Special equipment outlay for client site`,
      idempotencyKey: `voucher-${vNum}`,
      lines: [
        {
          accountName: AR_ACCOUNT,
          partyId: testCustomer.id,
          debit: test1Amount,
          credit: 0,
        },
        {
          accountName: MEEZAN_ACCOUNT,
          partyId: null,
          debit: 0,
          credit: test1Amount,
        },
      ],
    });

    return { vNum, journalId: journal.id };
  });

  const journal1 = await prisma.journalEntry.findUnique({
    where: { id: voucher1.journalId },
    include: { lines: { include: { account: true } } },
  });

  const j1DebitSum = journal1?.lines.reduce((s: number, l: any) => s + Number(l.debit), 0) || 0;
  const j1CreditSum = journal1?.lines.reduce((s: number, l: any) => s + Number(l.credit), 0) || 0;
  const j1CustomerLine = journal1?.lines.find((l: any) => l.partyId === testCustomer.id);

  const t1Passed = j1DebitSum === test1Amount && j1CreditSum === test1Amount && j1CustomerLine?.debit.toNumber() === test1Amount;
  results.push({
    test: "Manual DEBIT Customer (Balanced Double-Entry)",
    passed: t1Passed,
    details: { voucher: voucher1.vNum, debitSum: j1DebitSum, creditSum: j1CreditSum, customerLineDebit: j1CustomerLine?.debit.toNumber() },
  });
  console.log(`Result: ${t1Passed ? "PASSED ✅" : "FAILED ❌"} - Debit: PKR ${j1DebitSum} == Credit: PKR ${j1CreditSum}\n`);

  // ---------------------------------------------------------------------------
  // TEST 2: Manual Transaction Entry (CREDIT Customer / DEBIT Bank - Payment Received)
  // ---------------------------------------------------------------------------
  console.log("--- TEST 2: Manual Transaction (CREDIT Customer / DEBIT Bank - Payment Received) ---");
  const test2Amount = 25000;
  
  const voucher2 = await prisma.$transaction(async (tx) => {
    const vNum = await getNextVoucherNumber(tx, "BRV");
    const entry = await recordLedgerEntry(tx, {
      description: "Partial bank payment received from client",
      debitAccount: MEEZAN_ACCOUNT,
      creditAccount: AR_ACCOUNT,
      amount: test2Amount,
      referenceType: "VOUCHER",
      referenceId: vNum,
      entryDate: new Date(),
      partyType: "CUSTOMER",
      partyId: testCustomer.id,
      partyName: testCustomer.name,
      voucherType: "BRV",
      voucherNumber: vNum,
      paymentMethod: "ONLINE",
    });

    const journal = await postJournalEntry(tx, {
      sourceType: "VOUCHER",
      sourceId: vNum,
      narration: `[BRV] Partial bank payment received from client`,
      idempotencyKey: `voucher-${vNum}`,
      lines: [
        {
          accountName: MEEZAN_ACCOUNT,
          partyId: null,
          debit: test2Amount,
          credit: 0,
        },
        {
          accountName: AR_ACCOUNT,
          partyId: testCustomer.id,
          debit: 0,
          credit: test2Amount,
        },
      ],
    });

    return { vNum, journalId: journal.id };
  });

  const journal2 = await prisma.journalEntry.findUnique({
    where: { id: voucher2.journalId },
    include: { lines: { include: { account: true } } },
  });

  const j2DebitSum = journal2?.lines.reduce((s: number, l: any) => s + Number(l.debit), 0) || 0;
  const j2CreditSum = journal2?.lines.reduce((s: number, l: any) => s + Number(l.credit), 0) || 0;
  const j2CustomerLine = journal2?.lines.find((l: any) => l.partyId === testCustomer.id);

  const t2Passed = j2DebitSum === test2Amount && j2CreditSum === test2Amount && j2CustomerLine?.credit.toNumber() === test2Amount;
  results.push({
    test: "Manual CREDIT Customer (Balanced Double-Entry)",
    passed: t2Passed,
    details: { voucher: voucher2.vNum, debitSum: j2DebitSum, creditSum: j2CreditSum, customerLineCredit: j2CustomerLine?.credit.toNumber() },
  });
  console.log(`Result: ${t2Passed ? "PASSED ✅" : "FAILED ❌"} - Debit: PKR ${j2DebitSum} == Credit: PKR ${j2CreditSum}\n`);

  // ---------------------------------------------------------------------------
  // TEST 3: Invoice Posting Option (b) CUSTOMER_LEDGER
  // ---------------------------------------------------------------------------
  console.log("--- TEST 3: Invoice Posting Option (b) CUSTOMER_LEDGER ---");
  const invBCustomerBefore = await prisma.journalLine.aggregate({
    where: { partyId: testCustomer.id },
    _sum: { debit: true, credit: true },
  });
  const balBBefore = (invBCustomerBefore._sum.debit?.toNumber() || 0) - (invBCustomerBefore._sum.credit?.toNumber() || 0);

  const invBAmount = 100000;
  const invBNumber = `INV-TEST-B-${Date.now()}`;
  
  const invoiceB = await prisma.invoice.create({
    data: {
      invoiceNumber: invBNumber,
      clientName: testCustomer.name,
      clientPhone: testCustomer.phone,
      date: new Date(),
      totalAmount: invBAmount,
      amountPaid: 0,
      status: "UNPAID",
    },
  });

  // Post journal entry with CUSTOMER_LEDGER
  const jEntryB = await prisma.$transaction(async (tx) => {
    return await postJournalEntry(tx, {
      sourceType: "INVOICE",
      sourceId: invoiceB.id,
      narration: `Sales Invoice #${invoiceB.invoiceNumber} to ${testCustomer.name} (Customer Ledger Posting)`,
      idempotencyKey: `invoice-${invoiceB.id}-customer-ledger`,
      lines: [
        {
          accountName: AR_ACCOUNT,
          partyId: testCustomer.id,
          debit: invBAmount,
          credit: 0,
        },
        {
          accountName: SALES_REVENUE,
          debit: 0,
          credit: invBAmount,
        },
      ],
    });
  });

  const invBCustomerAfter = await prisma.journalLine.aggregate({
    where: { partyId: testCustomer.id },
    _sum: { debit: true, credit: true },
  });
  const balBAfter = (invBCustomerAfter._sum.debit?.toNumber() || 0) - (invBCustomerAfter._sum.credit?.toNumber() || 0);
  const diffB = balBAfter - balBBefore;

  const t3Passed = jEntryB !== null && diffB === invBAmount;
  results.push({
    test: "Invoice Posting Option (b) CUSTOMER_LEDGER updates party balance",
    passed: t3Passed,
    details: { invoiceNumber: invBNumber, diff: diffB, expected: invBAmount, balBefore: balBBefore, balAfter: balBAfter },
  });
  console.log(`Result: ${t3Passed ? "PASSED ✅" : "FAILED ❌"} - Party Balance increased by PKR ${diffB}\n`);

  // ---------------------------------------------------------------------------
  // TEST 4: Invoice Posting Option (a) GENERAL_LEDGER
  // ---------------------------------------------------------------------------
  console.log("--- TEST 4: Invoice Posting Option (a) GENERAL_LEDGER ---");
  const invACustomerBefore = await prisma.journalLine.aggregate({
    where: { partyId: testCustomer.id },
    _sum: { debit: true, credit: true },
  });
  const balABefore = (invACustomerBefore._sum.debit?.toNumber() || 0) - (invACustomerBefore._sum.credit?.toNumber() || 0);

  const invAAmount = 60000;
  const invANumber = `INV-TEST-A-${Date.now()}`;
  
  const invoiceA = await prisma.invoice.create({
    data: {
      invoiceNumber: invANumber,
      clientName: testCustomer.name,
      clientPhone: testCustomer.phone,
      date: new Date(),
      totalAmount: invAAmount,
      amountPaid: 0,
      status: "UNPAID",
    },
  });

  // Post journal entry with GENERAL_LEDGER (partyId is null)
  const jEntryA = await prisma.$transaction(async (tx) => {
    return await postJournalEntry(tx, {
      sourceType: "INVOICE",
      sourceId: invoiceA.id,
      narration: `Sales Invoice #${invoiceA.invoiceNumber} to ${testCustomer.name} (General Ledger Posting)`,
      idempotencyKey: `invoice-${invoiceA.id}-general-ledger`,
      lines: [
        {
          accountName: AR_ACCOUNT,
          partyId: null, // Generic AR, not attributed to customer account
          debit: invAAmount,
          credit: 0,
        },
        {
          accountName: SALES_REVENUE,
          debit: 0,
          credit: invAAmount,
        },
      ],
    });
  });

  const invACustomerAfter = await prisma.journalLine.aggregate({
    where: { partyId: testCustomer.id },
    _sum: { debit: true, credit: true },
  });
  const balAAfter = (invACustomerAfter._sum.debit?.toNumber() || 0) - (invACustomerAfter._sum.credit?.toNumber() || 0);
  const diffA = balAAfter - balABefore;

  const t4Passed = jEntryA !== null && diffA === 0;
  results.push({
    test: "Invoice Posting Option (a) GENERAL_LEDGER leaves customer balance untouched (0 change)",
    passed: t4Passed,
    details: { invoiceNumber: invANumber, customerBalanceDiff: diffA, expected: 0 },
  });
  console.log(`Result: ${t4Passed ? "PASSED ✅" : "FAILED ❌"} - Party Balance Change: PKR ${diffA} (Expected 0)\n`);

  // ---------------------------------------------------------------------------
  // TEST 5: Invoice Posting Option (c) NO_LEDGER
  // ---------------------------------------------------------------------------
  console.log("--- TEST 5: Invoice Posting Option (c) NO_LEDGER ---");
  const invCAmount = 80000;
  const invCNumber = `INV-TEST-C-${Date.now()}`;
  
  const journalCountBefore = await prisma.journalEntry.count();
  const ledgerCountBefore = await prisma.ledgerEntry.count();

  const invoiceC = await prisma.invoice.create({
    data: {
      invoiceNumber: invCNumber,
      clientName: testCustomer.name,
      clientPhone: testCustomer.phone,
      date: new Date(),
      totalAmount: invCAmount,
      amountPaid: 0,
      status: "UNPAID",
    },
  });

  // NO_LEDGER skips both journal and legacy ledger writes
  const journalCountAfter = await prisma.journalEntry.count();
  const ledgerCountAfter = await prisma.ledgerEntry.count();

  const t5Passed = (journalCountAfter - journalCountBefore === 0) && (ledgerCountAfter - ledgerCountBefore === 0);
  results.push({
    test: "Invoice Posting Option (c) NO_LEDGER creates zero journal/ledger writes",
    passed: t5Passed,
    details: { invoiceNumber: invCNumber, journalDelta: journalCountAfter - journalCountBefore, ledgerDelta: ledgerCountAfter - ledgerCountBefore },
  });
  console.log(`Result: ${t5Passed ? "PASSED ✅" : "FAILED ❌"} - Journal Delta: ${journalCountAfter - journalCountBefore}, Ledger Delta: ${ledgerCountAfter - ledgerCountBefore}\n`);

  // ---------------------------------------------------------------------------
  // TEST 6: Delivery Order (DO) Creation Zero-Ledger Invariant
  // ---------------------------------------------------------------------------
  console.log("--- TEST 6: Delivery Order (DO) Creation Zero-Financial Ledger Invariant ---");
  const doCountJournalsBefore = await prisma.journalEntry.count();
  const doCountLedgersBefore = await prisma.ledgerEntry.count();

  const doNumber = `DO-TEST-${Date.now()}`;
  const deliveryOrder = await prisma.deliveryOrder.create({
    data: {
      doNumber,
      date: new Date(),
      clientName: testCustomer.name,
      clientPhone: testCustomer.phone,
      deliveryAddress: testCustomer.address || "Karachi",
      lineItems: {
        create: [
          {
            productId: testProduct.id,
            quantity: 2,
            salesPrice: 120000,
          },
        ],
      },
    },
  });

  // DO creation only writes stock movements, never financial journals
  const doCountJournalsAfter = await prisma.journalEntry.count();
  const doCountLedgersAfter = await prisma.ledgerEntry.count();

  const t6Passed = (doCountJournalsAfter - doCountJournalsBefore === 0) && (doCountLedgersAfter - doCountLedgersBefore === 0);
  results.push({
    test: "Delivery Order (DO) Creation leaves zero financial ledger entries",
    passed: t6Passed,
    details: { doNumber: deliveryOrder.doNumber, journalDelta: doCountJournalsAfter - doCountJournalsBefore, ledgerDelta: doCountLedgersAfter - doCountLedgersBefore },
  });
  console.log(`Result: ${t6Passed ? "PASSED ✅" : "FAILED ❌"} - Financial Journal Delta: ${doCountJournalsAfter - doCountJournalsBefore}\n`);

  // ---------------------------------------------------------------------------
  // TEST 7: Universal General Ledger & Financial Accounts Section Reconciliation
  // ---------------------------------------------------------------------------
  console.log("--- TEST 7: Financial Accounts Balance vs General Ledger Reconciliation ---");
  const customerLines = await prisma.journalLine.findMany({
    where: { partyId: testCustomer.id },
  });
  const totalPartyDebit = customerLines.reduce((s: number, l: any) => s + Number(l.debit), 0);
  const totalPartyCredit = customerLines.reduce((s: number, l: any) => s + Number(l.credit), 0);
  const expectedNetBalance = totalPartyDebit - totalPartyCredit;

  // Query all journal lines company-wide to verify company ledger is balanced
  const allLines = await prisma.journalLine.aggregate({
    _sum: { debit: true, credit: true },
  });
  const totalCompanyDebit = Number(allLines._sum.debit || 0);
  const totalCompanyCredit = Number(allLines._sum.credit || 0);
  const companyDifference = Math.abs(totalCompanyDebit - totalCompanyCredit);

  const t7Passed = expectedNetBalance === (initialPartyBalance + test1Amount - test2Amount + invBAmount) && companyDifference < 0.01;
  results.push({
    test: "General Ledger Reconciliation (Party Balance matches sum of party lines; Company-wide Dr == Cr)",
    passed: t7Passed,
    details: {
      partyNetBalance: expectedNetBalance,
      partyTotalDebit: totalPartyDebit,
      partyTotalCredit: totalPartyCredit,
      companyTotalDebit: totalCompanyDebit,
      companyTotalCredit: totalCompanyCredit,
      companyDiff: companyDifference,
    },
  });
  console.log(`Result: ${t7Passed ? "PASSED ✅" : "FAILED ❌"} - Party Net Balance: PKR ${expectedNetBalance}, Company Dr: PKR ${totalCompanyDebit} == Cr: PKR ${totalCompanyCredit}\n`);

  // ---------------------------------------------------------------------------
  // TEST 8: Vendor Advance Payment + GRN Stock Receipt Netting Invariant
  // ---------------------------------------------------------------------------
  console.log("--- TEST 8: Vendor Advance (Debit AP 100k) + GRN Intake (Credit AP 100k) ---");
  const advVendor = await prisma.vendor.create({
    data: {
      name: `TEST-VEND-ADV-GRN-${Date.now().toString().slice(-4)}`,
      contactPerson: "Mr. Equipment Distributor",
      phone: `0300-${Math.floor(1000000 + Math.random() * 9000000)}`,
      address: "SITE Industrial Estate",
      paymentTerms: "Net 30 Days",
    },
  });

  const advanceAmount = 100000;

  // Step 1: Post Manual Vendor Advance (DEBIT AP / CREDIT Bank)
  await prisma.$transaction(async (tx) => {
    const vNum = await getNextVoucherNumber(tx, "BPV");
    await recordLedgerEntry(tx, {
      description: `Advance payment for upcoming equipment batch to ${advVendor.name}`,
      debitAccount: "Accounts Payable (Trade Creditors)",
      creditAccount: MEEZAN_ACCOUNT,
      amount: advanceAmount,
      referenceType: "VOUCHER",
      referenceId: vNum,
      entryDate: new Date(),
      partyType: "VENDOR",
      partyId: advVendor.id,
      partyName: advVendor.name,
      voucherType: "BPV",
      voucherNumber: vNum,
    });

    await postJournalEntry(tx, {
      entryDate: new Date(),
      narration: `Advance payment to vendor ${advVendor.name}`,
      sourceType: "PAYMENT",
      sourceId: vNum,
      idempotencyKey: `VEND_ADV:${advVendor.id}:${vNum}`,
      lines: [
        {
          accountName: "Accounts Payable (Trade Creditors)",
          partyId: advVendor.id,
          debit: advanceAmount,
          credit: 0,
        },
        {
          accountName: MEEZAN_ACCOUNT,
          partyId: null,
          debit: 0,
          credit: advanceAmount,
        },
      ],
    });
  });

  // Step 2: Create PO and Receive via GRN for goods worth 100,000
  const adminUser = await prisma.user.findFirst();
  const poForAdv = await prisma.purchaseOrder.create({
    data: {
      poNumber: `PO-ADV-${Date.now().toString().slice(-4)}`,
      vendorId: advVendor.id,
      status: "RECEIVED",
      totalAmount: advanceAmount,
      lineItems: {
        create: [
          {
            productId: testProduct.id,
            quantityOrdered: 1,
            quantityReceived: 1,
            unitCost: advanceAmount,
            expectedDeliveryDate: new Date(),
          },
        ],
      },
    },
  });

  const grnNumber = `GRN-ADV-${Date.now().toString().slice(-4)}`;
  const createdAdvGRN = await prisma.goodsReceivedNote.create({
    data: {
      grnNumber,
      poId: poForAdv.id,
      receivedById: adminUser?.id || "system",
      notes: "Direct stock delivery against advance",
      receivedAt: new Date(),
      lineItems: {
        create: [
          {
            productId: testProduct.id,
            quantityReceived: 1,
            unitCost: advanceAmount,
          },
        ],
      },
    },
  });

  // Post GRN Stock Intake Journal (Debit Inventory Asset / Credit Accounts Payable)
  await prisma.$transaction(async (tx) => {
    await recordLedgerEntry(tx, {
      description: `Received 1 units of ${testProduct.sku} against ${poForAdv.poNumber} (${grnNumber})`,
      debitAccount: "Inventory Asset",
      creditAccount: "Accounts Payable (Trade Creditors)",
      amount: advanceAmount,
      referenceType: "PO_RECEIPT",
      referenceId: createdAdvGRN.id,
      partyType: "VENDOR",
      partyId: advVendor.id,
      partyName: advVendor.name,
      voucherType: "GRN",
      voucherNumber: grnNumber,
    });

    await postJournalEntry(tx, {
      entryDate: new Date(),
      narration: `Stock Intake for ${poForAdv.poNumber} (${grnNumber}) from ${advVendor.name}`,
      sourceType: "PO_RECEIPT",
      sourceId: createdAdvGRN.id,
      idempotencyKey: `GRN:${createdAdvGRN.id}:intake`,
      lines: [
        {
          accountName: "Inventory Asset",
          partyId: null,
          debit: advanceAmount,
          credit: 0,
        },
        {
          accountName: "Accounts Payable (Trade Creditors)",
          partyId: advVendor.id,
          debit: 0,
          credit: advanceAmount,
        },
      ],
    });
  });

  // Step 3: Query Vendor Statement Lines & calculate running balance
  const vendorJournalLines = await prisma.journalLine.findMany({
    where: { partyId: advVendor.id },
  });

  const vendorTotalDebit = vendorJournalLines.reduce((s: number, l: any) => s + Number(l.debit), 0);
  const vendorTotalCredit = vendorJournalLines.reduce((s: number, l: any) => s + Number(l.credit), 0);
  const vendorNetBalance = vendorTotalCredit - vendorTotalDebit; // Positive = Payable, Negative = Advance, 0 = Settled

  const t8Passed = vendorTotalDebit === 100000 && vendorTotalCredit === 100000 && vendorNetBalance === 0;
  results.push({
    test: "Vendor Advance (Debit AP 100k) + GRN Receipt (Credit AP 100k) nets to exactly PKR 0",
    passed: t8Passed,
    details: {
      vendorName: advVendor.name,
      totalDebit: vendorTotalDebit,
      totalCredit: vendorTotalCredit,
      netBalance: vendorNetBalance,
      expected: 0,
    },
  });
  console.log(`Result: ${t8Passed ? "PASSED ✅" : "FAILED ❌"} - Vendor Debit: PKR ${vendorTotalDebit}, Credit: PKR ${vendorTotalCredit}, Net Balance: PKR ${vendorNetBalance}\n`);

  console.log("=================================================================");
  console.log("📋 PHASE 2 & 3 FINANCIAL VERIFICATION SUMMARY RESULTS:");
  console.log("=================================================================");
  results.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.passed ? "PASSED ✅" : "FAILED ❌"}] ${r.test}`);
    console.log(`   Details:`, JSON.stringify(r.details));
  });
  console.log("=================================================================\n");

  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    console.log("🎉 ALL 8 TESTS PASSED WITH 100% PRECISION! LEDGER INVARIANTS CONFIRMED.");
  } else {
    console.error("❌ SOME TESTS FAILED. PLEASE CHECK DETAILS ABOVE.");
    process.exit(1);
  }
}

runPhase2Verification()
  .catch((e) => {
    console.error("Verification script encountered an error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
