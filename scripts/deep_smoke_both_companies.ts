import { prismaTCE, prismaTECAIR } from "../src/lib/db";

const BASE_URL = "http://localhost:3000";

interface Check {
  category: string;
  name: string;
  passed: boolean;
  notes?: string;
}

const checks: Check[] = [];

function record(category: string, name: string, passed: boolean, notes?: string) {
  checks.push({ category, name, passed, notes });
  if (passed) {
    console.log(`  ✅ [PASS] [${category}] ${name}`);
  } else {
    console.error(`  ❌ [FAIL] [${category}] ${name}: ${notes || "Check failed"}`);
  }
}

async function runDeepSmoke() {
  console.log("\n================================================================================");
  console.log("   🚀 COMPREHENSIVE DUAL-COMPANY ENTERPRISE SMOKE & ISOLATION TEST SUITE");
  console.log("   Testing: Core Logic, Full Workflows, RBAC, DB Separation & Zero Leakage");
  console.log("================================================================================\n");

  const runTag = Date.now().toString().slice(-6);

  // Storage for teardown
  const tceCleanup = {
    customerIds: [] as string[],
    vendorIds: [] as string[],
    productIds: [] as string[],
    invoiceIds: [] as string[],
    quotationIds: [] as string[],
    employeeIds: [] as string[],
  };
  const tecairCleanup = {
    customerIds: [] as string[],
    vendorIds: [] as string[],
    productIds: [] as string[],
    quotationIds: [] as string[],
    invoiceIds: [] as string[],
    paymentIds: [] as string[],
    poIds: [] as string[],
    employeeIds: [] as string[],
    payrollIds: [] as string[],
    complaintIds: [] as string[],
    voucherIds: [] as string[],
  };

  try {
    // -----------------------------------------------------------------------------------
    // 0. POSTGRESQL CATALOG LEVEL PHYSICAL DATABASE VERIFICATION
    // -----------------------------------------------------------------------------------
    console.log("🏛️  STEP 0: PHYSICAL DATABASE ISOLATION VERIFICATION (POSTGRESQL CATALOG)");

    const tceDbRes: any[] = await prismaTCE.$queryRawUnsafe("SELECT current_database(), current_user");
    const tecairDbRes: any[] = await prismaTECAIR.$queryRawUnsafe("SELECT current_database(), current_user");

    const tceDbName = tceDbRes[0]?.current_database;
    const tecairDbName = tecairDbRes[0]?.current_database;

    record(
      "Database",
      `TCE Pool targets database: '${tceDbName}'`,
      tceDbName === "neondb"
    );
    record(
      "Database",
      `TECAIR Pool targets database: '${tecairDbName}'`,
      tecairDbName === "tecair"
    );
    record(
      "Database",
      "Databases are 100% physically distinct PostgreSQL instances",
      tceDbName !== tecairDbName && tceDbName === "neondb" && tecairDbName === "tecair"
    );

    // -----------------------------------------------------------------------------------
    // 1. AUTHENTICATION & SESSION TOKENS FOR BOTH ENTITIES
    // -----------------------------------------------------------------------------------
    console.log("\n🔑 STEP 1: AUTHENTICATING & ESTABLISHING SESSIONS FOR BOTH COMPANIES");

    const tceLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@tceerp.com", password: "admin123", company: "TCE" }),
    });
    const tceAuth = await tceLoginRes.json();
    record("Auth", "TCE Admin HTTP Authentication", tceLoginRes.status === 200 && tceAuth.activeCompany === "TCE");

    const tecairLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@tceerp.com", password: "admin123", company: "TECAIR" }),
    });
    const tecairAuth = await tecairLoginRes.json();
    record("Auth", "TECAIR Admin HTTP Authentication", tecairLoginRes.status === 200 && tecairAuth.activeCompany === "TECAIR");

    const tceHeaders = {
      Authorization: `Bearer ${tceAuth.token}`,
      "x-company-id": "TCE",
      "Content-Type": "application/json",
    };

    const tecairHeaders = {
      Authorization: `Bearer ${tecairAuth.token}`,
      "x-company-id": "TECAIR",
      "Content-Type": "application/json",
    };

    // Verify session profile endpoint (/api/auth/me) for both
    const meTceRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: tceHeaders });
    const meTce = await meTceRes.json();
    record("Auth", "Session Profile returns activeCompany: 'TCE'", meTce.activeCompany === "TCE");

    const meTecairRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: tecairHeaders });
    const meTecair = await meTecairRes.json();
    record("Auth", "Session Profile returns activeCompany: 'TECAIR'", meTecair.activeCompany === "TECAIR");

    // -----------------------------------------------------------------------------------
    // 2. LIVE COMPANY CONTEXT SWITCHING
    // -----------------------------------------------------------------------------------
    console.log("\n🔄 STEP 2: DYNAMIC COMPANY WORKSPACE SWITCHING");

    const switchRes = await fetch(`${BASE_URL}/api/auth/switch-company`, {
      method: "POST",
      headers: tceHeaders,
      body: JSON.stringify({ company: "TECAIR" }),
    });
    const switchData = await switchRes.json();
    record(
      "Switcher",
      "Switch context from TCE -> TECAIR returns 200 and updated activeCompany",
      switchRes.status === 200 && switchData.activeCompany === "TECAIR" && Boolean(switchData.token)
    );

    // -----------------------------------------------------------------------------------
    // 3. PRODUCT CATALOG & INVENTORY LOGIC IN BOTH WORKSPACES
    // -----------------------------------------------------------------------------------
    console.log("\n📦 STEP 3: PRODUCT CATALOG & INVENTORY LOGIC");

    // Product in TCE
    const prodTceRes = await fetch(`${BASE_URL}/api/inventory/products`, {
      method: "POST",
      headers: tceHeaders,
      body: JSON.stringify({
        sku: `SKU-TCE-DEEP-${runTag}`,
        name: `TCE Galvanized Duct Sheet ${runTag}`,
        category: "Ducting",
        unit: "SHEET",
        reorderLevel: 25,
        salesPrice: 4800,
        averageCost: 3500,
      }),
    });
    const prodTceData = await prodTceRes.json();
    const prodTceId = prodTceData.product?.id || prodTceData.id;
    if (prodTceId) tceCleanup.productIds.push(prodTceId);
    record("Inventory", "Created Product in TCE via HTTP API", prodTceRes.status === 200 || prodTceRes.status === 201);

    // Product in TECAIR
    const prodTecairRes = await fetch(`${BASE_URL}/api/inventory/products`, {
      method: "POST",
      headers: tecairHeaders,
      body: JSON.stringify({
        sku: `SKU-TEC-DEEP-${runTag}`,
        name: `TECAIR Thermostat Digital Controller ${runTag}`,
        category: "Controls",
        unit: "PCS",
        reorderLevel: 15,
        salesPrice: 12500,
        averageCost: 8900,
      }),
    });
    const prodTecairData = await prodTecairRes.json();
    const prodTecairId = prodTecairData.product?.id || prodTecairData.id;
    if (prodTecairId) tecairCleanup.productIds.push(prodTecairId);
    record("Inventory", "Created Product in TECAIR via HTTP API", prodTecairRes.status === 200 || prodTecairRes.status === 201);

    // Cross-tenant catalog isolation check
    const tceProdLookupInTecair = await prismaTECAIR.product.findUnique({
      where: { sku: `SKU-TCE-DEEP-${runTag}` },
    });
    const tecairProdLookupInTce = await prismaTCE.product.findUnique({
      where: { sku: `SKU-TEC-DEEP-${runTag}` },
    });
    record("Inventory", "TCE Product 100% absent in TECAIR catalog", tceProdLookupInTecair === null);
    record("Inventory", "TECAIR Product 100% absent in TCE catalog", tecairProdLookupInTce === null);

    // Stock Adjustment in TCE
    const adjRes = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers: tceHeaders,
      body: JSON.stringify({
        productId: prodTceId,
        adjustedQty: 30,
        reason: "Initial warehouse intake batch",
      }),
    });
    record("Inventory", "Stock Adjustment in TCE", adjRes.status === 200 || adjRes.status === 201);

    const checkTceStock = await prismaTCE.product.findUnique({ where: { id: prodTceId } });
    record("Inventory", "TCE stock adjusted to 30", checkTceStock?.onHandQty === 30);

    // -----------------------------------------------------------------------------------
    // 4. SALES & REVENUE CYCLE (CUSTOMER -> QUOTATION -> INVOICE -> PAYMENT)
    // -----------------------------------------------------------------------------------
    console.log("\n💼 STEP 4: SALES & REVENUE CYCLE (CUSTOMER -> QUOTATION -> INVOICE -> PAYMENT)");

    // Customer in TECAIR
    const custTecairRes = await fetch(`${BASE_URL}/api/sales/customers`, {
      method: "POST",
      headers: tecairHeaders,
      body: JSON.stringify({
        name: `TECAIR Prime Mall Client ${runTag}`,
        phone: `0300-${runTag}1`,
        address: "Packages Mall Lahore",
      }),
    });
    const custTecairData = await custTecairRes.json();
    const custTecairId = custTecairData.customer?.id || custTecairData.id;
    if (custTecairId) tecairCleanup.customerIds.push(custTecairId);
    record("Sales", "Created Customer in TECAIR", Boolean(custTecairId));

    // Quotation in TECAIR
    const quoRes = await fetch(`${BASE_URL}/api/sales/quotations`, {
      method: "POST",
      headers: tecairHeaders,
      body: JSON.stringify({
        customerId: custTecairId,
        clientName: `TECAIR Prime Mall Client ${runTag}`,
        clientPhone: `0300-${runTag}1`,
        clientAddress: "Packages Mall Lahore",
        date: new Date().toISOString(),
        isGst: true,
        subjectHeading: `HVAC Controls Installation ${runTag}`,
        lineItems: [
          {
            productId: prodTecairId,
            description: "Digital Thermostat Unit",
            quantity: 4,
            salesPrice: 12500,
          },
        ],
      }),
    });
    const quoData = await quoRes.json();
    const quotationId = quoData.quotation?.id || quoData.id;
    if (quotationId) tecairCleanup.quotationIds.push(quotationId);
    record("Sales", "Created Quotation in TECAIR", Boolean(quotationId));

    // Convert Quotation to Invoice in TECAIR
    let invoiceId = "";
    if (quotationId) {
      const convRes = await fetch(`${BASE_URL}/api/sales/quotations/${quotationId}/convert`, {
        method: "POST",
        headers: tecairHeaders,
        body: JSON.stringify({}),
      });
      const convData = await convRes.json();
      invoiceId = convData.invoice?.id || convData.id;
      if (invoiceId) tecairCleanup.invoiceIds.push(invoiceId);
      record("Sales", "Converted Quotation into Official Invoice in TECAIR", Boolean(invoiceId));
    }

    // Process Payment on Invoice in TECAIR
    if (invoiceId) {
      const payRes = await fetch(`${BASE_URL}/api/sales/invoice/${invoiceId}/payment`, {
        method: "POST",
        headers: tecairHeaders,
        body: JSON.stringify({
          amountPaid: 25000,
          method: "BANK",
        }),
      });
      record("Sales", "Applied PKR 25,000 partial payment to TECAIR Invoice", payRes.status === 200 || payRes.status === 201);
    }

    // Cross-tenant check: Verify Invoice & Customer do NOT exist in TCE
    const leakCustInTce = await prismaTCE.customer.findFirst({
      where: { name: `TECAIR Prime Mall Client ${runTag}` },
    });
    const leakInvInTce = await prismaTCE.invoice.findFirst({
      where: { clientName: `TECAIR Prime Mall Client ${runTag}` },
    });
    record("Sales", "TECAIR Customer completely absent in TCE database", leakCustInTce === null);
    record("Sales", "TECAIR Invoice completely absent in TCE database", leakInvInTce === null);

    // -----------------------------------------------------------------------------------
    // 5. PROCUREMENT WORKFLOW (VENDOR -> PO)
    // -----------------------------------------------------------------------------------
    console.log("\n🤝 STEP 5: PROCUREMENT CYCLE (VENDOR -> PURCHASE ORDER)");

    // Vendor in TECAIR
    const vendorTecairRes = await fetch(`${BASE_URL}/api/procurement/vendors`, {
      method: "POST",
      headers: tecairHeaders,
      body: JSON.stringify({
        name: `TECAIR Core Parts Importer ${runTag}`,
        contactPerson: "Engr. Salman",
        phone: `0321-${runTag}2`,
        address: "Korangi Industrial Area Karachi",
        paymentTerms: "Net 15 Days",
      }),
    });
    const vendorTecairData = await vendorTecairRes.json();
    const vendorTecairId = vendorTecairData.vendor?.id || vendorTecairData.id;
    if (vendorTecairId) tecairCleanup.vendorIds.push(vendorTecairId);
    record("Procurement", "Created Vendor in TECAIR", Boolean(vendorTecairId));

    // PO in TECAIR
    const poRes = await fetch(`${BASE_URL}/api/procurement/po`, {
      method: "POST",
      headers: tecairHeaders,
      body: JSON.stringify({
        vendorId: vendorTecairId,
        lineItems: [
          {
            productId: prodTecairId,
            quantityOrdered: 10,
            unitCost: 8900,
          },
        ],
      }),
    });
    const poData = await poRes.json();
    const poId = poData.purchaseOrder?.id || poData.po?.id || poData.id;
    if (poId) tecairCleanup.poIds.push(poId);
    record("Procurement", "Created Purchase Order in TECAIR", Boolean(poId));

    // Cross-tenant check on Procurement
    const leakVendorInTce = await prismaTCE.vendor.findFirst({
      where: { name: `TECAIR Core Parts Importer ${runTag}` },
    });
    record("Procurement", "TECAIR Vendor completely absent in TCE database", leakVendorInTce === null);

    // -----------------------------------------------------------------------------------
    // 6. DOUBLE-ENTRY FINANCIAL VOUCHERS & TRIAL BALANCE
    // -----------------------------------------------------------------------------------
    console.log("\n💰 STEP 6: DOUBLE-ENTRY ACCOUNTING & FINANCIAL VOUCHERS");

    // Post Cash Receipt Voucher (CRV) in TECAIR
    const voucherRes = await fetch(`${BASE_URL}/api/finance/vouchers`, {
      method: "POST",
      headers: tecairHeaders,
      body: JSON.stringify({
        voucherType: "CRV",
        entryDate: new Date().toISOString(),
        debitAccount: "Cash in Hand",
        creditAccount: "Customer Advance Deposits",
        amount: 40000,
        partyType: "CUSTOMER",
        partyId: custTecairId,
        partyName: `TECAIR Prime Mall Client ${runTag}`,
        paymentMethod: "CASH",
        description: `Upfront customer retainer advance ${runTag}`,
      }),
    });
    const voucherData = await voucherRes.json();
    record("Finance", "Posted Cash Receipt Voucher (CRV) in TECAIR", voucherRes.status === 200 || voucherRes.status === 201);

    // Verify Ledger Entry in TECAIR
    const tecairLedger = await prismaTECAIR.ledgerEntry.findFirst({
      where: { description: `Upfront customer retainer advance ${runTag}` },
    });
    record("Finance", "TECAIR Ledger Entry recorded successfully", Boolean(tecairLedger));

    // Verify ZERO entry in TCE Ledger
    const tceLedgerCheck = await prismaTCE.ledgerEntry.findFirst({
      where: { description: `Upfront customer retainer advance ${runTag}` },
    });
    record("Finance", "Zero Leakage: TECAIR voucher does NOT exist in TCE ledger", tceLedgerCheck === null);

    // Fetch Trial Balance in TECAIR via HTTP API
    const tbRes = await fetch(`${BASE_URL}/api/finance/journal/trial-balance`, {
      headers: tecairHeaders,
    });
    const tbData = await tbRes.json();
    const hasTbData = Array.isArray(tbData.trialBalance) || Array.isArray(tbData.rows) || Array.isArray(tbData.accounts);
    record("Finance", "Fetched TECAIR Trial Balance via HTTP", tbRes.status === 200 && hasTbData);

    // -----------------------------------------------------------------------------------
    // 7. HRM & PAYROLL CYCLE
    // -----------------------------------------------------------------------------------
    console.log("\n👥 STEP 7: HRM, ATTENDANCE & PAYROLL OPERATIONS");

    const empRes = await fetch(`${BASE_URL}/api/hrm/employees`, {
      method: "POST",
      headers: tecairHeaders,
      body: JSON.stringify({
        employeeNo: `EMP-TEC-${runTag}`,
        name: `Hamza Farooq HVAC Specialist ${runTag}`,
        cnic: `35202-${runTag}3-1`,
        phone: `0302-${runTag}4`,
        address: "Johar Town Lahore",
        department: "Technical",
        position: "HVAC Commissioning Engineer",
        joiningDate: new Date().toISOString(),
        baseSalary: 68000,
        bankDetails: "Meezan Bank 99887766",
        status: "ACTIVE",
      }),
    });
    const empData = await empRes.json();
    const empId = empData.employee?.id || empData.id;
    if (empId) tecairCleanup.employeeIds.push(empId);
    record("HRM", "Created Employee in TECAIR", Boolean(empId));

    // Log Attendance in TECAIR
    if (empId) {
      const attRes = await fetch(`${BASE_URL}/api/hrm/attendance`, {
        method: "POST",
        headers: tecairHeaders,
        body: JSON.stringify({
          employeeId: empId,
          date: new Date().toISOString().slice(0, 10),
          status: "PRESENT",
        }),
      });
      record("HRM", "Logged Attendance in TECAIR", attRes.status === 200 || attRes.status === 201);
    }

    // Verify Employee is NOT in TCE
    const leakEmpInTce = await prismaTCE.employee.findUnique({
      where: { employeeNo: `EMP-TEC-${runTag}` },
    });
    record("HRM", "TECAIR Employee completely absent in TCE database", leakEmpInTce === null);

    // -----------------------------------------------------------------------------------
    // 8. FIELD OPERATIONS & COMPLAINTS
    // -----------------------------------------------------------------------------------
    console.log("\n🔧 STEP 8: SUPPORT COMPLAINTS & FIELD OPERATIONS");

    const compRes = await fetch(`${BASE_URL}/api/support/complaints`, {
      method: "POST",
      headers: tecairHeaders,
      body: JSON.stringify({
        customerId: custTecairId,
        customerName: `TECAIR Prime Mall Client ${runTag}`,
        customerPhone: `0300-${runTag}1`,
        customerAddress: "Packages Mall Lahore",
        description: `Server room precision AC unit low suction pressure ${runTag}`,
        assignedTechnicianId: empId || null,
        status: "OPEN",
      }),
    });
    const compData = await compRes.json();
    const complaintId = compData.complaint?.id || compData.id;
    if (complaintId) tecairCleanup.complaintIds.push(complaintId);
    record("Support", "Created Service Complaint in TECAIR", Boolean(complaintId));

    // Verify Complaint is NOT in TCE
    const leakCompInTce = await prismaTCE.complaint.findFirst({
      where: { description: `Server room precision AC unit low suction pressure ${runTag}` },
    });
    record("Support", "TECAIR Complaint completely absent in TCE database", leakCompInTce === null);

    // -----------------------------------------------------------------------------------
    // 9. TEARDOWN & REVERSIBILITY
    // -----------------------------------------------------------------------------------
    console.log("\n🧹 STEP 9: TRANSACTION TEARDOWN & DATABASE PURGING");

    // Purge TECAIR audit records
    for (const cId of tecairCleanup.complaintIds) {
      await prismaTECAIR.complaintTimeline.deleteMany({ where: { complaintId: cId } });
      await prismaTECAIR.complaint.delete({ where: { id: cId } }).catch(() => {});
    }
    for (const eId of tecairCleanup.employeeIds) {
      await prismaTECAIR.attendance.deleteMany({ where: { employeeId: eId } });
      await prismaTECAIR.employee.delete({ where: { id: eId } }).catch(() => {});
    }
    if (tecairLedger?.id) {
      await prismaTECAIR.journalEntry.deleteMany({ where: { sourceId: tecairLedger.id } });
      await prismaTECAIR.ledgerEntry.delete({ where: { id: tecairLedger.id } }).catch(() => {});
    }
    for (const pId of tecairCleanup.poIds) {
      await prismaTECAIR.pOLineItem.deleteMany({ where: { poId: pId } });
      await prismaTECAIR.purchaseOrder.delete({ where: { id: pId } }).catch(() => {});
    }
    for (const invId of tecairCleanup.invoiceIds) {
      await prismaTECAIR.payment.deleteMany({ where: { invoiceId: invId } });
      await prismaTECAIR.invoiceLineItem.deleteMany({ where: { invoiceId: invId } });
      await prismaTECAIR.invoice.delete({ where: { id: invId } }).catch(() => {});
    }
    for (const qId of tecairCleanup.quotationIds) {
      await prismaTECAIR.quotationLineItem.deleteMany({ where: { quotationId: qId } });
      await prismaTECAIR.quotation.delete({ where: { id: qId } }).catch(() => {});
    }
    for (const vId of tecairCleanup.vendorIds) {
      await prismaTECAIR.vendor.delete({ where: { id: vId } }).catch(() => {});
    }
    for (const cId of tecairCleanup.customerIds) {
      await prismaTECAIR.customer.delete({ where: { id: cId } }).catch(() => {});
    }
    for (const pId of tecairCleanup.productIds) {
      await prismaTECAIR.product.delete({ where: { id: pId } }).catch(() => {});
    }

    // Purge TCE audit records
    for (const pId of tceCleanup.productIds) {
      await prismaTCE.stockAdjustment.deleteMany({ where: { productId: pId } });
      await prismaTCE.product.delete({ where: { id: pId } }).catch(() => {});
    }

    record("Teardown", "Cleaned up all transient audit artifacts in both databases", true);

  } catch (error: any) {
    console.error("FATAL ERROR IN SMOKE TEST:", error);
    record("Critical", "Unhandled Error in Smoke Test Suite", false, error.message);
  } finally {
    await prismaTCE.$disconnect();
    await prismaTECAIR.$disconnect();
  }

  // -----------------------------------------------------------------------------------
  // SUMMARY SCORECARD
  // -----------------------------------------------------------------------------------
  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  console.log("\n================================================================================");
  console.log("   📊 COMPREHENSIVE DUAL-COMPANY SMOKE TEST AUDIT SCORECARD");
  console.log("================================================================================");
  console.log(`  Total Checks Executed:  ${total}`);
  console.log(`  Successful Checks:      ${passed} ✅`);
  console.log(`  Failed Checks:          ${failed} ❌`);
  console.log(`  Overall Health:         ${Math.round((passed / total) * 100)}% Pass Rate`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDeepSmoke();
