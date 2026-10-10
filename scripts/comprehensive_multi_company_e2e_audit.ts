import { prismaTCE, prismaTECAIR, getPrismaClient, CompanyId } from "../src/lib/db";
import { signToken, verifyToken } from "../src/lib/auth";
import bcrypt from "bcryptjs";

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, test: string, details?: string) {
  if (condition) {
    results.push({ suite, test, passed: true, details });
    console.log(`  ✅ [PASS] ${suite} -> ${test}`);
  } else {
    results.push({ suite, test, passed: false, details });
    console.error(`  ❌ [FAIL] ${suite} -> ${test}: ${details || "Assertion failed"}`);
  }
}

async function runComprehensiveAudit() {
  console.log("\n================================================================================");
  console.log("   🛡️ COMPREHENSIVE MULTI-COMPANY END-TO-END DATA ISOLATION AUDIT SUITE");
  console.log("================================================================================\n");

  const runId = Date.now().toString().slice(-6);

  try {
    // -----------------------------------------------------------------------------------------
    // TEST SUITE 1: DATABASE CONNECTION POOL & INSTANCE SEPARATION
    // -----------------------------------------------------------------------------------------
    console.log("\n📦 SUITE 1: DATABASE POOLS & DYNAMIC ROUTING PROXY");
    
    // Verify both pools are alive and distinct
    const tceDbInfo = await prismaTCE.$queryRawUnsafe<any[]>("SELECT current_database(), current_user;");
    const tecairDbInfo = await prismaTECAIR.$queryRawUnsafe<any[]>("SELECT current_database(), current_user;");

    const tceDbName = tceDbInfo[0]?.current_database;
    const tecairDbName = tecairDbInfo[0]?.current_database;

    assert(Boolean(tceDbName), "Connection Pool", "TCE database connected", `DB: ${tceDbName}`);
    assert(Boolean(tecairDbName), "Connection Pool", "TECAIR database connected", `DB: ${tecairDbName}`);
    assert(
      tceDbName !== tecairDbName,
      "Connection Pool",
      "Instances are physically separate databases",
      `TCE: '${tceDbName}' vs TECAIR: '${tecairDbName}'`
    );

    // Verify dynamic routing helper
    const clientTCE = getPrismaClient("TCE");
    const clientTECAIR = getPrismaClient("TECAIR");
    assert(clientTCE === prismaTCE, "Dynamic Routing", "getPrismaClient('TCE') returns prismaTCE");
    assert(clientTECAIR === prismaTECAIR, "Dynamic Routing", "getPrismaClient('TECAIR') returns prismaTECAIR");

    // -----------------------------------------------------------------------------------------
    // TEST SUITE 2: USER MANAGEMENT & STRICT PER-COMPANY RBAC ISOLATION
    // -----------------------------------------------------------------------------------------
    console.log("\n👤 SUITE 2: USER MANAGEMENT & RBAC ISOLATION");

    const testPassword = "Password@123";
    const passwordHash = bcrypt.hashSync(testPassword, 10);
    const tecairExclusiveEmail = `exclusive.officer.${runId}@tecair.com`;

    // Find Sales role in TECAIR
    const tecairSalesRole = await prismaTECAIR.role.findFirst({ where: { name: "Sales" } });
    assert(Boolean(tecairSalesRole), "RBAC", "TECAIR Sales role exists");

    // Create a user strictly inside TECAIR
    const tecairOnlyUser = await prismaTECAIR.user.create({
      data: {
        email: tecairExclusiveEmail,
        name: `TECAIR Exclusive Officer ${runId}`,
        passwordHash,
        roleId: tecairSalesRole!.id,
        isActive: true,
      },
    });

    assert(Boolean(tecairOnlyUser.id), "User Isolation", "Created user in TECAIR database");

    // Leakage Check: Ensure user does NOT exist in TCE database
    const leakUserInTCE = await prismaTCE.user.findFirst({
      where: { email: tecairExclusiveEmail },
    });
    assert(
      leakUserInTCE === null,
      "User Isolation",
      "Zero Leakage: TECAIR user does NOT exist in TCE database"
    );

    // Simulate login for this user targeted at TCE (should reject)
    const tceLoginCheck = await prismaTCE.user.findFirst({
      where: { email: tecairExclusiveEmail, isActive: true },
    });
    assert(
      tceLoginCheck === null,
      "Login Gateway",
      "TCE login rejected for user without TCE credentials"
    );

    // Simulate login for this user targeted at TECAIR (should succeed)
    const tecairLoginCheck = await prismaTECAIR.user.findFirst({
      where: { email: tecairExclusiveEmail, isActive: true },
      include: { role: true },
    });
    const tecairPasswordMatch = tecairLoginCheck
      ? bcrypt.compareSync(testPassword, tecairLoginCheck.passwordHash)
      : false;

    assert(
      tecairPasswordMatch && tecairLoginCheck?.role.name === "Sales",
      "Login Gateway",
      "TECAIR login verified with assigned Sales role"
    );

    // -----------------------------------------------------------------------------------------
    // TEST SUITE 3: INVENTORY & CATALOG ISOLATION
    // -----------------------------------------------------------------------------------------
    console.log("\n📦 SUITE 3: INVENTORY & PRODUCT CATALOG ISOLATION");

    const skuTCE = `SKU-TCE-${runId}`;
    const skuTECAIR = `SKU-TEC-${runId}`;

    // Create product in TCE
    const prodTCE = await prismaTCE.product.create({
      data: {
        sku: skuTCE,
        name: `TCE Copper Pipe Split ${runId}`,
        category: "Piping",
        unit: "RFT",
        reorderLevel: 20,
        onHandQty: 100,
        averageCost: 1500,
        salesPrice: 2200,
      },
    });

    // Create product in TECAIR
    const prodTECAIR = await prismaTECAIR.product.create({
      data: {
        sku: skuTECAIR,
        name: `TECAIR Refrigerant Gas R410A ${runId}`,
        category: "Gas",
        unit: "CYLINDER",
        reorderLevel: 10,
        onHandQty: 40,
        averageCost: 18000,
        salesPrice: 24500,
      },
    });

    // Cross-tenant search verification
    const tceProdInTECAIR = await prismaTECAIR.product.findUnique({ where: { sku: skuTCE } });
    const tecairProdInTCE = await prismaTCE.product.findUnique({ where: { sku: skuTECAIR } });

    assert(tceProdInTECAIR === null, "Inventory Isolation", "TCE product does not exist in TECAIR catalog");
    assert(tecairProdInTCE === null, "Inventory Isolation", "TECAIR product does not exist in TCE catalog");

    // Stock adjustment in TECAIR
    const stockAdjustment = await prismaTECAIR.stockAdjustment.create({
      data: {
        productId: prodTECAIR.id,
        adjustedQty: 15,
        reason: "Warehouse count variance adjustment",
        userId: tecairOnlyUser.id,
      },
    });

    await prismaTECAIR.product.update({
      where: { id: prodTECAIR.id },
      data: { onHandQty: { increment: 15 } },
    });

    const updatedProdTECAIR = await prismaTECAIR.product.findUnique({ where: { id: prodTECAIR.id } });
    const untouchedProdTCE = await prismaTCE.product.findUnique({ where: { id: prodTCE.id } });

    assert(
      updatedProdTECAIR?.onHandQty === 55,
      "Inventory Isolation",
      "TECAIR stock successfully adjusted to 55"
    );
    assert(
      untouchedProdTCE?.onHandQty === 100,
      "Inventory Isolation",
      "TCE stock remains completely untouched at 100"
    );

    // -----------------------------------------------------------------------------------------
    // TEST SUITE 4: PROCUREMENT & VENDOR ISOLATION
    // -----------------------------------------------------------------------------------------
    console.log("\n🤝 SUITE 4: PROCUREMENT & VENDOR MANAGEMENT ISOLATION");

    const vendorNameTCE = `TCE Metals Supplier ${runId}`;
    const vendorNameTECAIR = `TECAIR Chillers Ltd ${runId}`;

    const vendorTCE = await prismaTCE.vendor.create({
      data: {
        name: vendorNameTCE,
        contactPerson: "Mr. Tariq",
        phone: "0300-1112233",
        address: "Industrial Area Karachi",
        paymentTerms: "Net 30",
      },
    });

    const vendorTECAIR = await prismaTECAIR.vendor.create({
      data: {
        name: vendorNameTECAIR,
        contactPerson: "Mr. Farhan",
        phone: "0321-4445566",
        address: "DHA Phase 6 Lahore",
        paymentTerms: "Advance 50%",
      },
    });

    // Zero leakage verification
    const vendorTCEInTECAIR = await prismaTECAIR.vendor.findFirst({ where: { name: vendorNameTCE } });
    const vendorTECAIRInTCE = await prismaTCE.vendor.findFirst({ where: { name: vendorNameTECAIR } });

    assert(vendorTCEInTECAIR === null, "Procurement Isolation", "TCE vendor is not visible in TECAIR");
    assert(vendorTECAIRInTCE === null, "Procurement Isolation", "TECAIR vendor is not visible in TCE");

    // Create PO strictly in TECAIR
    const poNumberTECAIR = `PO-TEC-${runId}`;
    const poTECAIR = await prismaTECAIR.purchaseOrder.create({
      data: {
        poNumber: poNumberTECAIR,
        vendorId: vendorTECAIR.id,
        status: "APPROVED",
        totalAmount: 120000,
        lineItems: {
          create: [
            {
              productId: prodTECAIR.id,
              quantityOrdered: 5,
              unitCost: 24000,
              expectedDeliveryDate: new Date(),
            },
          ],
        },
      },
    });

    // Check PO existence in TCE
    const poInTCE = await prismaTCE.purchaseOrder.findFirst({ where: { poNumber: poNumberTECAIR } });
    assert(poInTCE === null, "Procurement Isolation", "TECAIR PO does not exist in TCE database");

    // -----------------------------------------------------------------------------------------
    // TEST SUITE 5: CUSTOMERS, SALES ORDERS & INVOICING ISOLATION
    // -----------------------------------------------------------------------------------------
    console.log("\n💼 SUITE 5: CUSTOMERS, QUOTATIONS & INVOICES ISOLATION");

    const custNameTCE = `TCE Commercial Towers ${runId}`;
    const custNameTECAIR = `TECAIR Residency Plaza ${runId}`;

    const custTCE = await prismaTCE.customer.create({
      data: {
        name: custNameTCE,
        phone: "0333-8889900",
        address: "Blue Area Islamabad",
      },
    });

    const custTECAIR = await prismaTECAIR.customer.create({
      data: {
        name: custNameTECAIR,
        phone: "0345-7778899",
        address: "Gulberg Greens Islamabad",
      },
    });

    // Verify Customer Segregation
    const custTCEInTECAIR = await prismaTECAIR.customer.findFirst({ where: { name: custNameTCE } });
    const custTECAIRInTCE = await prismaTCE.customer.findFirst({ where: { name: custNameTECAIR } });

    assert(custTCEInTECAIR === null, "Sales Isolation", "TCE customer is isolated from TECAIR");
    assert(custTECAIRInTCE === null, "Sales Isolation", "TECAIR customer is isolated from TCE");

    // Create Invoice in TECAIR
    const invNumberTECAIR = `INV-TEC-${runId}`;
    const invoiceTECAIR = await prismaTECAIR.invoice.create({
      data: {
        invoiceNumber: invNumberTECAIR,
        customerId: custTECAIR.id,
        clientName: custTECAIR.name,
        clientPhone: custTECAIR.phone,
        clientAddress: custTECAIR.address,
        date: new Date(),
        status: "PARTIALLY_PAID",
        totalAmount: 150000,
        amountPaid: 50000,
        lineItems: {
          create: [
            {
              productId: prodTECAIR.id,
              quantity: 6,
              salesPrice: 25000,
            },
          ],
        },
        payments: {
          create: [
            {
              amountPaid: 50000,
              method: "BANK",
            },
          ],
        },
      },
      include: { lineItems: true, payments: true },
    });

    // Verify Invoice does NOT exist in TCE
    const invInTCE = await prismaTCE.invoice.findFirst({ where: { invoiceNumber: invNumberTECAIR } });
    assert(invInTCE === null, "Sales Isolation", "TECAIR Invoice does NOT exist in TCE database");

    // -----------------------------------------------------------------------------------------
    // TEST SUITE 6: FINANCIAL LEDGER & VOUCHERS ISOLATION
    // -----------------------------------------------------------------------------------------
    console.log("\n💰 SUITE 6: FINANCIAL LEDGERS & GENERAL ACCOUNTING ISOLATION");

    const voucherNumTECAIR = `CPV-TEC-${runId}`;
    const ledgerEntryTECAIR = await prismaTECAIR.ledgerEntry.create({
      data: {
        entryDate: new Date(),
        description: `Payment for AC maintenance equipment ${runId}`,
        debitAccount: "Office Rent & Utilities",
        creditAccount: "Cash in Hand",
        amount: 35000,
        referenceType: "VOUCHER",
        referenceId: `REF-${runId}`,
        partyType: "VENDOR",
        partyId: vendorTECAIR.id,
        partyName: vendorTECAIR.name,
        voucherType: "CPV",
        voucherNumber: voucherNumTECAIR,
        paymentMethod: "CASH",
      },
    });

    // Check if voucher leaked into TCE LedgerEntry
    const voucherInTCE = await prismaTCE.ledgerEntry.findFirst({
      where: { voucherNumber: voucherNumTECAIR },
    });
    assert(voucherInTCE === null, "Financials Isolation", "TECAIR Ledger Voucher does not exist in TCE");

    // Check JournalEntry idempotency & segregation
    const journalEntryTECAIR = await prismaTECAIR.journalEntry.create({
      data: {
        entryDate: new Date(),
        narration: `Audit isolation test journal ${runId}`,
        sourceType: "VOUCHER",
        sourceId: ledgerEntryTECAIR.id,
        idempotencyKey: `IDEM-TEC-${runId}`,
      },
    });

    const journalInTCE = await prismaTCE.journalEntry.findUnique({
      where: { idempotencyKey: `IDEM-TEC-${runId}` },
    });
    assert(journalInTCE === null, "Financials Isolation", "TECAIR Journal Entry does not exist in TCE");

    // -----------------------------------------------------------------------------------------
    // TEST SUITE 7: HRM, ATTENDANCE & PAYROLL ISOLATION
    // -----------------------------------------------------------------------------------------
    console.log("\n👥 SUITE 7: HRM & PAYROLL ISOLATION");

    const empNoTECAIR = `TEC-EMP-${runId}`;
    const employeeTECAIR = await prismaTECAIR.employee.create({
      data: {
        employeeNo: empNoTECAIR,
        name: `Engr. Bilal Ahmad ${runId}`,
        cnic: `36302-${runId}9-1`,
        phone: "0301-9988776",
        address: "Multan Cantt",
        department: "Operations",
        position: "Site Supervisor",
        joiningDate: new Date(),
        baseSalary: 75000,
        bankDetails: "Alfalah Bank 11223344",
        status: "ACTIVE",
      },
    });

    const empInTCE = await prismaTCE.employee.findUnique({ where: { employeeNo: empNoTECAIR } });
    assert(empInTCE === null, "HRM Isolation", "TECAIR Employee does not exist in TCE database");

    // Create Payroll Run in TECAIR
    const payrollTECAIR = await prismaTECAIR.payrollRun.create({
      data: {
        employeeId: employeeTECAIR.id,
        month: 10,
        year: 2026,
        baseSalary: 75000,
        netPay: 75000,
        status: "PENDING",
      },
    });

    const payrollInTCE = await prismaTCE.payrollRun.findFirst({
      where: { employeeId: employeeTECAIR.id },
    });
    assert(payrollInTCE === null, "HRM Isolation", "TECAIR Payroll Run does not exist in TCE");

    // -----------------------------------------------------------------------------------------
    // TEST SUITE 8: FIELD SUPPORT COMPLAINTS ISOLATION
    // -----------------------------------------------------------------------------------------
    console.log("\n🔧 SUITE 8: FIELD OPERATIONS & COMPLAINTS ISOLATION");

    const complaintNumTECAIR = `TKT-TEC-${runId}`;
    const complaintTECAIR = await prismaTECAIR.complaint.create({
      data: {
        complaintNumber: complaintNumTECAIR,
        date: new Date(),
        customerId: custTECAIR.id,
        customerName: custTECAIR.name,
        customerPhone: custTECAIR.phone,
        customerAddress: custTECAIR.address || "TECAIR Test Address",
        description: "VRF Chiller cooling leak check",
        status: "OPEN",
        timeline: {
          create: [
            {
              changedById: tecairOnlyUser.id,
              fromStatus: "NEW",
              toStatus: "OPEN",
              remarks: "Dispatched initial inspection checklist",
            },
          ],
        },
      },
    });

    const complaintInTCE = await prismaTCE.complaint.findUnique({
      where: { complaintNumber: complaintNumTECAIR },
    });
    assert(complaintInTCE === null, "Support Isolation", "TECAIR Complaint ticket does not exist in TCE");

    // -----------------------------------------------------------------------------------------
    // TEST SUITE 9: SESSION SWITCHING & CONTEXT INTEGRITY
    // -----------------------------------------------------------------------------------------
    console.log("\n🔄 SUITE 9: SESSION TOKEN & CONTEXT INTEGRITY");

    // Token for TCE admin
    const tceAdmin = await prismaTCE.user.findFirst({ where: { email: "admin@tceerp.com" } });
    const tecairAdmin = await prismaTECAIR.user.findFirst({ where: { email: "admin@tceerp.com" } });

    const tokenTCE = signToken({
      id: tceAdmin!.id,
      email: tceAdmin!.email,
      name: tceAdmin!.name,
      company: "TCE",
    });

    const tokenTECAIR = signToken({
      id: tecairAdmin!.id,
      email: tecairAdmin!.email,
      name: tecairAdmin!.name,
      company: "TECAIR",
    });

    const decodedTCE = verifyToken(tokenTCE);
    const decodedTECAIR = verifyToken(tokenTECAIR);

    assert(decodedTCE?.company === "TCE", "Session Token", "TCE token contains company: 'TCE'");
    assert(decodedTECAIR?.company === "TECAIR", "Session Token", "TECAIR token contains company: 'TECAIR'");

    // -----------------------------------------------------------------------------------------
    // CLEANUP PHASE: REMOVE ALL AUDIT SEED DATA
    // -----------------------------------------------------------------------------------------
    console.log("\n🧹 TEARDOWN: CLEANING UP AUDIT TRANSACTION RECORDS");

    // Cleanup TECAIR test records in proper foreign key order
    await prismaTECAIR.complaintTimeline.deleteMany({ where: { complaintId: complaintTECAIR.id } });
    await prismaTECAIR.complaint.delete({ where: { id: complaintTECAIR.id } });
    await prismaTECAIR.payrollRun.delete({ where: { id: payrollTECAIR.id } });
    await prismaTECAIR.employee.delete({ where: { id: employeeTECAIR.id } });
    await prismaTECAIR.journalEntry.delete({ where: { id: journalEntryTECAIR.id } });
    await prismaTECAIR.ledgerEntry.delete({ where: { id: ledgerEntryTECAIR.id } });
    await prismaTECAIR.payment.deleteMany({ where: { invoiceId: invoiceTECAIR.id } });
    await prismaTECAIR.invoiceLineItem.deleteMany({ where: { invoiceId: invoiceTECAIR.id } });
    await prismaTECAIR.invoice.delete({ where: { id: invoiceTECAIR.id } });
    await prismaTECAIR.pOLineItem.deleteMany({ where: { poId: poTECAIR.id } });
    await prismaTECAIR.purchaseOrder.delete({ where: { id: poTECAIR.id } });
    await prismaTECAIR.stockAdjustment.delete({ where: { id: stockAdjustment.id } });
    await prismaTECAIR.product.delete({ where: { id: prodTECAIR.id } });
    await prismaTECAIR.customer.delete({ where: { id: custTECAIR.id } });
    await prismaTECAIR.vendor.delete({ where: { id: vendorTECAIR.id } });
    await prismaTECAIR.user.delete({ where: { id: tecairOnlyUser.id } });

    // Cleanup TCE test records
    await prismaTCE.product.delete({ where: { id: prodTCE.id } });
    await prismaTCE.customer.delete({ where: { id: custTCE.id } });
    await prismaTCE.vendor.delete({ where: { id: vendorTCE.id } });

    console.log("  ✓ All temporary audit artifacts successfully cleaned up.");

  } catch (error: any) {
    console.error("FATAL AUDIT ERROR:", error);
    assert(false, "Suite Execution", "Audit Suite encountered an unhandled error", error.message);
  } finally {
    await prismaTCE.$disconnect();
    await prismaTECAIR.$disconnect();
  }

  // -----------------------------------------------------------------------------------------
  // FINAL SCORECARD
  // -----------------------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("\n================================================================================");
  console.log("   📊 MULTI-COMPANY ISOLATION AUDIT SUMMARY SCORECARD");
  console.log("================================================================================");
  console.log(`  Total Test Assertions: ${total}`);
  console.log(`  Passed Assertions:     ${passed} ✅`);
  console.log(`  Failed Assertions:     ${failed} ❌`);
  console.log(`  Success Rate:          ${Math.round((passed / total) * 100)}%`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runComprehensiveAudit();
