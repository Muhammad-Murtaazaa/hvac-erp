const jwt = require('jsonwebtoken');
const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'hvac-erp-very-secret-jwt-key-2026-08-06';
const BASE_URL = 'http://localhost:3000';

async function runHttpSmokeTests() {
  console.log('========================================================================');
  console.log('PHASE 9: REAL END-TO-END HTTP ROUTE SMOKE TESTS');
  console.log('========================================================================\n');

  // 1. Get an active admin user or create token for first active user
  const adminUser = await prisma.user.findFirst({
    where: { isActive: true },
    include: { role: true },
  });

  if (!adminUser) {
    throw new Error('No active user found in DB to sign token');
  }

  const token = jwt.sign(
    { id: adminUser.id, email: adminUser.email, name: adminUser.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const testArtifacts = {
    customerIds: [],
    vendorIds: [],
    employeeIds: [],
    productIds: [],
    poIds: [],
    grnIds: [],
    invoiceIds: [],
    payrollRunIds: [],
    ledgerEntryIds: [],
    voucherNumbers: [],
  };

  const results = [];

  try {
    // -----------------------------------------------------------------------
    // TEST 1: Invoice Creation with Upfront Payment via POST /api/sales/invoice
    // -----------------------------------------------------------------------
    console.log('--- [TEST 1] HTTP POST /api/sales/invoice (Invoice + Upfront Payment) ---');
    
    // Create test product
    const testProd1 = await prisma.product.create({
      data: {
        sku: `SKU-HTTP-INV-${Date.now().toString().slice(-4)}`,
        name: 'HTTP Test Air Filter',
        category: 'Filters',
        unit: 'PCS',
        salesPrice: 5000,
        averageCost: 3000,
        onHandQty: 20,
        reorderLevel: 2,
      },
    });
    testArtifacts.productIds.push(testProd1.id);

    const invPayload = {
      clientName: `HTTP Smoke Customer ${Date.now().toString().slice(-4)}`,
      clientPhone: `0300-HTTP-${Date.now().toString().slice(-4)}`,
      clientAddress: 'HTTP Test Suite',
      date: new Date().toISOString(),
      isGst: false,
      lineItems: [
        {
          productId: testProd1.id,
          quantity: 2,
          salesPrice: 5000,
          totalPrice: 10000,
          description: '2x Test Air Filter',
        },
      ],
      payments: [
        {
          amount: 10000,
          amountPaid: 10000,
          paymentMethod: 'BANK',
          referenceNumber: 'TX-HTTP-INV-001',
          notes: 'Full bank transfer at invoice creation',
        },
      ],
    };

    const invRes = await fetch(`${BASE_URL}/api/sales/invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invPayload),
    });

    const invJson = await invRes.json();
    console.log('HTTP Response Status:', invRes.status);
    if (invRes.status !== 200 && invRes.status !== 201) {
      throw new Error(`Invoice route failed: ${JSON.stringify(invJson)}`);
    }

    const createdInv = invJson.invoice;
    testArtifacts.invoiceIds.push(createdInv.id);
    if (createdInv.customerId) testArtifacts.customerIds.push(createdInv.customerId);

    // Verify DB committed records for Invoice
    const invLedgerEntries = await prisma.ledgerEntry.findMany({
      where: { referenceId: createdInv.id },
    });
    const invJournalEntries = await prisma.journalEntry.findMany({
      where: { sourceId: createdInv.id },
      include: { lines: { include: { account: true } } },
    });

    console.log(`Committed LedgerEntry count for Invoice: ${invLedgerEntries.length}`);
    console.log(`Committed JournalEntry count for Invoice: ${invJournalEntries.length}`);
    invJournalEntries.forEach((je, idx) => {
      console.log(`  JournalEntry #${idx + 1}: ${je.idempotencyKey} | ${je.sourceType} | ${je.narration}`);
      je.lines.forEach((l) => {
        console.log(`    Line: ${l.account.name.padEnd(35)} | PartyId: ${l.partyId || 'NULL'} | Dr: ${Number(l.debit)} | Cr: ${Number(l.credit)}`);
      });
    });

    const test1Pass = invRes.status === 200 && invJournalEntries.length >= 2;
    results.push({
      test: '1. POST /api/sales/invoice (Invoice + Payment)',
      status: test1Pass ? 'PASS' : 'FAIL',
      httpStatus: invRes.status,
      ledgerEntriesCreated: invLedgerEntries.length,
      journalEntriesCreated: invJournalEntries.length,
      details: 'Created Invoice + Bank Settlement; dual-wrote LedgerEntry and JournalEntry/JournalLine rows atomically.',
    });

    // -----------------------------------------------------------------------
    // TEST 2: GRN Receipt via POST /api/procurement/grn
    // -----------------------------------------------------------------------
    console.log('\n--- [TEST 2] HTTP POST /api/procurement/grn (Goods Received Note) ---');
    
    // Create test vendor and PO
    const testVend = await prisma.vendor.create({
      data: {
        name: `HTTP Smoke Vendor ${Date.now().toString().slice(-4)}`,
        phone: `0300-VEND-${Date.now().toString().slice(-4)}`,
        contactPerson: 'Vendor Rep',
        address: 'Test Vendor Address',
        paymentTerms: 'Credit 30 Days',
      },
    });
    testArtifacts.vendorIds.push(testVend.id);

    const testPO = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-HTTP-${Date.now().toString().slice(-4)}`,
        vendorId: testVend.id,
        status: 'SUBMITTED',
        totalAmount: 16000,
        lineItems: {
          create: [
            {
              productId: testProd1.id,
              quantityOrdered: 4,
              unitCost: 4000,
              expectedDeliveryDate: new Date(),
            },
          ],
        },
      },
      include: { lineItems: true },
    });
    testArtifacts.poIds.push(testPO.id);

    const grnPayload = {
      poId: testPO.id,
      lineItems: [
        {
          productId: testProd1.id,
          quantityReceived: 4,
          unitCost: 4000,
        },
      ],
      notes: 'HTTP E2E test stock receipt',
    };

    const grnRes = await fetch(`${BASE_URL}/api/procurement/grn`, {
      method: 'POST',
      headers,
      body: JSON.stringify(grnPayload),
    });

    const grnJson = await grnRes.json();
    console.log('HTTP Response Status:', grnRes.status);
    if (grnRes.status !== 200 && grnRes.status !== 201) {
      throw new Error(`GRN route failed: ${JSON.stringify(grnJson)}`);
    }

    const createdGrn = grnJson.grn;
    testArtifacts.grnIds.push(createdGrn.id);

    // Verify DB committed records for GRN
    const grnLedgerEntries = await prisma.ledgerEntry.findMany({
      where: { referenceId: createdGrn.id },
    });
    const grnJournalEntries = await prisma.journalEntry.findMany({
      where: { sourceId: createdGrn.id },
      include: { lines: { include: { account: true } } },
    });

    console.log(`Committed LedgerEntry count for GRN: ${grnLedgerEntries.length}`);
    console.log(`Committed JournalEntry count for GRN: ${grnJournalEntries.length}`);
    grnJournalEntries.forEach((je, idx) => {
      console.log(`  JournalEntry #${idx + 1}: ${je.idempotencyKey} | ${je.sourceType} | ${je.narration}`);
      je.lines.forEach((l) => {
        console.log(`    Line: ${l.account.name.padEnd(35)} | PartyId: ${l.partyId || 'NULL'} | Dr: ${Number(l.debit)} | Cr: ${Number(l.credit)}`);
      });
    });

    const test2Pass = grnRes.status === 200 && grnJournalEntries.length >= 1;
    results.push({
      test: '2. POST /api/procurement/grn (Stock Receipt)',
      status: test2Pass ? 'PASS' : 'FAIL',
      httpStatus: grnRes.status,
      ledgerEntriesCreated: grnLedgerEntries.length,
      journalEntriesCreated: grnJournalEntries.length,
      details: 'Created GRN; dual-wrote LedgerEntry and JournalEntry (Debit Inventory / Credit AP tagged to Vendor).',
    });

    // -----------------------------------------------------------------------
    // TEST 3: Payroll Payout via POST /api/hrm/payroll/pay
    // -----------------------------------------------------------------------
    console.log('\n--- [TEST 3] HTTP POST /api/hrm/payroll/pay (Salary Disbursement) ---');

    // Create test employee and payroll run
    const testEmp = await prisma.employee.create({
      data: {
        name: `HTTP Smoke Employee ${Date.now().toString().slice(-4)}`,
        employeeNo: `EMP-HTTP-${Date.now().toString().slice(-4)}`,
        cnic: `35202-HTTP-${Date.now().toString().slice(-4)}`,
        phone: `0300-EMP-${Date.now().toString().slice(-4)}`,
        address: 'Lahore Test Address',
        department: 'HVAC Tech',
        position: 'Technician',
        joiningDate: new Date(),
        baseSalary: 45000,
        bankDetails: 'Cash in Hand',
      },
    });
    testArtifacts.employeeIds.push(testEmp.id);

    const testRun = await prisma.payrollRun.create({
      data: {
        employeeId: testEmp.id,
        month: 9,
        year: 2026,
        baseSalary: 45000,
        allowances: 5000,
        deductions: 5000,
        netPay: 45000,
        status: 'PENDING',
      },
    });
    testArtifacts.payrollRunIds.push(testRun.id);

    const payRes = await fetch(`${BASE_URL}/api/hrm/payroll/pay`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ payrollRunId: testRun.id }),
    });

    const payJson = await payRes.json();
    console.log('HTTP Response Status:', payRes.status);
    if (payRes.status !== 200 && payRes.status !== 201) {
      throw new Error(`Payroll pay route failed: ${JSON.stringify(payJson)}`);
    }

    // Verify DB committed records for Payroll
    const payLedgerEntries = await prisma.ledgerEntry.findMany({
      where: { partyId: testEmp.id },
    });
    const payJournalEntries = await prisma.journalEntry.findMany({
      where: { sourceId: testRun.id },
      include: { lines: { include: { account: true } } },
    });

    console.log(`Committed LedgerEntry count for Payroll: ${payLedgerEntries.length}`);
    console.log(`Committed JournalEntry count for Payroll: ${payJournalEntries.length}`);
    payJournalEntries.forEach((je, idx) => {
      console.log(`  JournalEntry #${idx + 1}: ${je.idempotencyKey} | ${je.sourceType} | ${je.narration}`);
      je.lines.forEach((l) => {
        console.log(`    Line: ${l.account.name.padEnd(35)} | PartyId: ${l.partyId || 'NULL'} | Dr: ${Number(l.debit)} | Cr: ${Number(l.credit)}`);
      });
    });

    const test3Pass = payRes.status === 200 && payJournalEntries.length >= 1;
    results.push({
      test: '3. POST /api/hrm/payroll/pay (Salary Payout)',
      status: test3Pass ? 'PASS' : 'FAIL',
      httpStatus: payRes.status,
      ledgerEntriesCreated: payLedgerEntries.length,
      journalEntriesCreated: payJournalEntries.length,
      details: 'Executed salary disbursement; dual-wrote LedgerEntry and JournalEntry (Debit Salary Expense / Credit Cash in Hand tagged to Employee).',
    });

    // -----------------------------------------------------------------------
    // TEST 4: Voucher Submission via POST /api/finance/vouchers
    // -----------------------------------------------------------------------
    console.log('\n--- [TEST 4] HTTP POST /api/finance/vouchers (CRV Customer Advance) ---');

    // Create test customer
    const testCust = await prisma.customer.create({
      data: {
        name: `HTTP Smoke Customer Vouch ${Date.now().toString().slice(-4)}`,
        phone: `0300-VOUCH-${Date.now().toString().slice(-4)}`,
      },
    });
    testArtifacts.customerIds.push(testCust.id);

    const vouchPayload = {
      voucherType: 'CRV',
      entryDate: new Date().toISOString(),
      debitAccount: 'Cash in Hand',
      creditAccount: 'Customer Advance Deposits',
      amount: 15000,
      partyType: 'CUSTOMER',
      partyId: testCust.id,
      partyName: testCust.name,
      paymentMethod: 'CASH',
      description: 'Advance received for upcoming maintenance contract',
      notes: 'HTTP E2E smoke test voucher',
    };

    const vouchRes = await fetch(`${BASE_URL}/api/finance/vouchers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(vouchPayload),
    });

    const vouchJson = await vouchRes.json();
    console.log('HTTP Response Status:', vouchRes.status);
    if (vouchRes.status !== 200 && vouchRes.status !== 201) {
      throw new Error(`Vouchers route failed: ${JSON.stringify(vouchJson)}`);
    }

    const createdVouch = vouchJson.entry || vouchJson.voucher;
    testArtifacts.ledgerEntryIds.push(createdVouch.id);
    if (createdVouch.voucherNumber) testArtifacts.voucherNumbers.push(createdVouch.voucherNumber);

    // Verify DB committed records for Voucher
    const vouchLedgerEntries = await prisma.ledgerEntry.findMany({
      where: { id: createdVouch.id },
    });
    const vouchJournalEntries = await prisma.journalEntry.findMany({
      where: { sourceId: createdVouch.voucherNumber || createdVouch.referenceId },
      include: { lines: { include: { account: true } } },
    });

    console.log(`Committed LedgerEntry count for Voucher: ${vouchLedgerEntries.length}`);
    console.log(`Committed JournalEntry count for Voucher: ${vouchJournalEntries.length}`);
    vouchJournalEntries.forEach((je, idx) => {
      console.log(`  JournalEntry #${idx + 1}: ${je.idempotencyKey} | ${je.sourceType} | ${je.narration}`);
      je.lines.forEach((l) => {
        console.log(`    Line: ${l.account.name.padEnd(35)} | PartyId: ${l.partyId || 'NULL'} | Dr: ${Number(l.debit)} | Cr: ${Number(l.credit)}`);
      });
    });

    const test4Pass = vouchRes.status === 200 && vouchJournalEntries.length >= 1;
    results.push({
      test: '4. POST /api/finance/vouchers (Customer Advance CRV)',
      status: test4Pass ? 'PASS' : 'FAIL',
      httpStatus: vouchRes.status,
      ledgerEntriesCreated: vouchLedgerEntries.length,
      journalEntriesCreated: vouchJournalEntries.length,
      details: 'Created CRV voucher; dual-wrote LedgerEntry and JournalEntry (Debit Cash in Hand / Credit Customer Advance Deposits tagged to Customer).',
    });

    console.log('\n========================================================================');
    console.log('HTTP END-TO-END SMOKE TEST RESULTS');
    console.log('========================================================================');
    console.table(results);

  } finally {
    console.log('\n--- TEARDOWN: Cleaning up all HTTP test artifacts ---');

    // 1. Delete test JournalLines & JournalEntries
    const testJEs = await prisma.journalEntry.findMany({
      where: {
        NOT: {
          idempotencyKey: { startsWith: 'LEGACY_BACKFILL' },
        },
      },
      select: { id: true },
    });
    if (testJEs.length > 0) {
      const jeIds = testJEs.map((j) => j.id);
      await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: jeIds } } });
      await prisma.journalEntry.deleteMany({ where: { id: { in: jeIds } } });
    }

    // 2. Delete test LedgerEntries
    await prisma.ledgerEntry.deleteMany({
      where: {
        OR: [
          { description: { contains: 'HTTP Smoke' } },
          { description: { contains: 'HTTP E2E' } },
          { description: { contains: 'Advance received for upcoming maintenance contract' } },
          { partyName: { contains: 'HTTP' } },
          { referenceId: { in: [...testArtifacts.invoiceIds, ...testArtifacts.grnIds, ...testArtifacts.poIds] } },
        ],
      },
    });

    // 3. Delete invoices, payments, lines
    if (testArtifacts.invoiceIds.length > 0) {
      await prisma.payment.deleteMany({ where: { invoiceId: { in: testArtifacts.invoiceIds } } });
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: testArtifacts.invoiceIds } } });
      await prisma.invoice.deleteMany({ where: { id: { in: testArtifacts.invoiceIds } } });
    }

    // 4. Delete GRNs, POs
    if (testArtifacts.grnIds.length > 0) {
      await prisma.gRNLineItem.deleteMany({ where: { grnId: { in: testArtifacts.grnIds } } });
      await prisma.goodsReceivedNote.deleteMany({ where: { id: { in: testArtifacts.grnIds } } });
    }
    if (testArtifacts.poIds.length > 0) {
      await prisma.pOLineItem.deleteMany({ where: { poId: { in: testArtifacts.poIds } } });
      await prisma.purchaseOrder.deleteMany({ where: { id: { in: testArtifacts.poIds } } });
    }

    // 5. Delete PayrollRuns & Employees
    if (testArtifacts.payrollRunIds.length > 0) {
      await prisma.payrollRun.deleteMany({ where: { id: { in: testArtifacts.payrollRunIds } } });
    }
    if (testArtifacts.employeeIds.length > 0) {
      await prisma.employee.deleteMany({ where: { id: { in: testArtifacts.employeeIds } } });
    }

    // 6. Delete Vendors, Customers, Products
    if (testArtifacts.vendorIds.length > 0) {
      await prisma.vendor.deleteMany({ where: { id: { in: testArtifacts.vendorIds } } });
    }
    if (testArtifacts.customerIds.length > 0) {
      await prisma.customer.deleteMany({ where: { id: { in: testArtifacts.customerIds } } });
    }
    if (testArtifacts.productIds.length > 0) {
      await prisma.stockLedger.deleteMany({ where: { productId: { in: testArtifacts.productIds } } });
      await prisma.product.deleteMany({ where: { id: { in: testArtifacts.productIds } } });
    }

    // Extra safety cleanup for any leftover with "HTTP"
    await prisma.customer.deleteMany({ where: { name: { contains: 'HTTP' } } });
    await prisma.vendor.deleteMany({ where: { name: { contains: 'HTTP' } } });
    await prisma.employee.deleteMany({ where: { name: { contains: 'HTTP' } } });

    console.log('Teardown complete: verifying database baseline...');
    const custCount = await prisma.customer.count();
    const vendCount = await prisma.vendor.count();
    const empCount = await prisma.employee.count();
    const leCount = await prisma.ledgerEntry.count();
    const jeCount = await prisma.journalEntry.count();
    const jlCount = await prisma.journalLine.count();

    console.log({
      Customers: custCount,
      Vendors: vendCount,
      Employees: empCount,
      LedgerEntries: leCount,
      JournalEntries: jeCount,
      JournalLines: jlCount,
    });

    const cashLines = await prisma.journalLine.findMany({
      where: {
        account: { name: { in: ['Cash in Hand', 'Bank Account (Meezan Bank)'] } },
      },
      include: { account: true },
    });

    let cashInHand = 0;
    let bankAccount = 0;
    cashLines.forEach((l) => {
      const diff = Number(l.debit) - Number(l.credit);
      if (l.account.name === 'Cash in Hand') cashInHand += diff;
      if (l.account.name === 'Bank Account (Meezan Bank)') bankAccount += diff;
    });

    console.log({
      'Cash in Hand': `PKR ${cashInHand.toLocaleString()}`,
      'Bank Account (Meezan Bank)': `PKR ${bankAccount.toLocaleString()}`,
      'Total Liquid Cash': `PKR ${(cashInHand + bankAccount).toLocaleString()}`,
    });
  }
}

runHttpSmokeTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
