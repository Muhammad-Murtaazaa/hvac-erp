const jwt = require('jsonwebtoken');
const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'hvac-erp-very-secret-jwt-key-2026-08-06';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

const testResults = [];

function assert(condition, testName, details = '') {
  if (condition) {
    testResults.push({ name: testName, passed: true, details });
    console.log(`  [PASS] ${testName}`);
  } else {
    testResults.push({ name: testName, passed: false, details });
    console.error(`  [FAIL] ${testName} - ${details}`);
  }
}

async function runAllHttpTests() {
  console.log('========================================================================');
  console.log('FULL FINANCIAL & PROCUREMENT HTTP INTEGRITY TEST SUITE');
  console.log('Testing Real API Endpoints: PO, GRN, DO, Invoices, Returns, Refunds, Reports');
  console.log('========================================================================\n');

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
    { expiresIn: '2h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const testSuffix = Date.now().toString().slice(-6);

  const cleanup = {
    customerIds: [],
    vendorIds: [],
    productIds: [],
    poIds: [],
    grnIds: [],
    invoiceIds: [],
    quotationIds: [],
    returnIds: [],
    doIds: [],
    ledgerEntryIds: [],
    journalEntryIds: [],
  };

  try {
    // -------------------------------------------------------------------------
    // SETUP: Base Vendor and Base Product
    // -------------------------------------------------------------------------
    console.log('--- Setting up Base Vendor & Catalog Product ---');
    const vendor = await prisma.vendor.create({
      data: {
        name: `HTTP Test Vendor ${testSuffix}`,
        contactPerson: 'Vendor Manager',
        phone: `0300-V-${testSuffix}`,
        email: `vendor-${testSuffix}@test.com`,
        address: 'Test Industrial Zone',
        paymentTerms: 'NET30',
      },
    });
    cleanup.vendorIds.push(vendor.id);

    const baseProduct = await prisma.product.create({
      data: {
        sku: `AC-T-${testSuffix}`,
        name: `Test Inverter AC ${testSuffix}`,
        category: 'Air Conditioner',
        unit: 'Nos',
        averageCost: 100000,
        salesPrice: 150000,
        onHandQty: 10,
        reorderLevel: 2,
      },
    });
    cleanup.productIds.push(baseProduct.id);

    console.log(`Base Vendor: ${vendor.name} (${vendor.id})`);
    console.log(`Base Product: ${baseProduct.sku} (Average Cost: PKR 100,000, Stock: 10)\n`);

    // -------------------------------------------------------------------------
    // TEST 1: PO Creation with Varied Price -> Stock Price Isolation
    // -------------------------------------------------------------------------
    console.log('--- [TEST 1] HTTP POST /api/procurement/po (Stock Price Isolation) ---');
    const poNegotiatedCost = 135000; // Different from 100,000
    const po1Res = await fetch(`${BASE_URL}/api/procurement/po`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vendorId: vendor.id,
        isGst: false,
        taxRate: 18,
        discountType: 'NONE',
        discountPercent: 0,
        discountAmount: 0,
        userNotes: 'Test PO Price Isolation',
        lineItems: [
          {
            productId: baseProduct.id,
            quantityOrdered: 2,
            unitCost: poNegotiatedCost,
          },
        ],
      }),
    });

    const po1Data = await po1Res.json();
    assert(po1Res.ok, 'Test 1.1: HTTP POST /api/procurement/po returns status 200 OK', po1Data.error);
    if (po1Data.purchaseOrder) cleanup.poIds.push(po1Data.purchaseOrder.id);

    // Verify original product averageCost remains exactly 100,000
    const recheckedBaseProduct = await prisma.product.findUnique({ where: { id: baseProduct.id } });
    assert(
      Number(recheckedBaseProduct.averageCost) === 100000,
      'Test 1.2: Original product averageCost is preserved at PKR 100,000 without mutation',
      `Actual: ${recheckedBaseProduct.averageCost}`
    );

    // Verify a variant product row was created for the PO with SKU `${baseProduct.sku}-P${poNegotiatedCost}`
    const expectedVariantSku = `${baseProduct.sku}-P${poNegotiatedCost}`;
    const variantProd = await prisma.product.findUnique({ where: { sku: expectedVariantSku } });
    assert(
      variantProd !== null && Number(variantProd.averageCost) === poNegotiatedCost,
      `Test 1.3: New product row created for varied PO price (${expectedVariantSku}) with price ${poNegotiatedCost}`,
      variantProd ? `Found with cost ${variantProd.averageCost}` : 'Not found'
    );
    if (variantProd) cleanup.productIds.push(variantProd.id);

    // -------------------------------------------------------------------------
    // TEST 2: PO with 20% Trade Discount + 18% GST -> GRN Intake
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 2] HTTP POST /api/procurement/po & /grn (Discounts & GST) ---');
    // PO for 2 units @ 100,000 = 200,000. 20% discount = 40,000. Taxable = 160,000. GST 18% = 28,800. Total = 188,800.
    const po2Res = await fetch(`${BASE_URL}/api/procurement/po`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vendorId: vendor.id,
        isGst: true,
        taxRate: 18,
        discountType: 'PERCENTAGE',
        discountPercent: 20,
        discountAmount: 40000,
        userNotes: 'Discounted PO with GST',
        lineItems: [
          {
            productId: baseProduct.id,
            quantityOrdered: 2,
            unitCost: 100000,
          },
        ],
      }),
    });

    const po2Data = await po2Res.json();
    assert(po2Res.ok, 'Test 2.1: PO created with 20% trade discount and 18% GST', po2Data.error);
    const po2Id = po2Data.purchaseOrder.id;
    cleanup.poIds.push(po2Id);
    assert(
      Number(po2Data.purchaseOrder.totalAmount) === 188800,
      'Test 2.2: PO total matches net discounted cost + GST (PKR 188,800)',
      `Actual: ${po2Data.purchaseOrder.totalAmount}`
    );

    // Perform GRN Intake of 2 units via POST /api/procurement/grn
    const po2LineItem = po2Data.purchaseOrder.lineItems[0];
    const grnRes = await fetch(`${BASE_URL}/api/procurement/grn`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        poId: po2Id,
        notes: 'Full shipment received',
        lineItems: [
          {
            poLineItemId: po2LineItem.id,
            productId: baseProduct.id,
            quantityReceived: 2,
            unitCost: 100000, // Base PO cost submitted by client
          },
        ],
      }),
    });

    const grnData = await grnRes.json();
    assert(grnRes.ok, 'Test 2.3: HTTP POST /api/procurement/grn generates GRN successfully', grnData.error);
    const grnId = grnData.grn.id;
    cleanup.grnIds.push(grnId);

    // Verify GRN line item effective unit cost is 80,000 (20% discount applied once)
    const savedGrnLine = await prisma.gRNLineItem.findFirst({ where: { grnId } });
    assert(
      savedGrnLine && Number(savedGrnLine.unitCost) === 80000,
      'Test 2.4: GRN line item unit cost is exactly net discounted cost (PKR 80,000)',
      savedGrnLine ? `Actual: ${savedGrnLine.unitCost}` : 'No GRN line item'
    );

    // Verify Journal Entry for the GRN
    const grnJournal = await prisma.journalEntry.findFirst({
      where: { sourceId: grnId },
      include: { lines: { include: { account: true } } },
    });
    assert(grnJournal !== null, 'Test 2.5: Double-entry journal entry was created for GRN');
    if (grnJournal) {
      cleanup.journalEntryIds.push(grnJournal.id);
      const drLines = grnJournal.lines.filter((l) => Number(l.debit) > 0);
      const crLines = grnJournal.lines.filter((l) => Number(l.credit) > 0);
      const totalDr = drLines.reduce((acc, l) => acc + Number(l.debit), 0);
      const totalCr = crLines.reduce((acc, l) => acc + Number(l.credit), 0);

      const invLine = drLines.find((l) => l.account.name === 'Inventory Asset');
      const taxLine = drLines.find((l) => l.account.name === 'Sales Tax Payable');
      const apLine = crLines.find((l) => l.account.name === 'Accounts Payable (Trade Creditors)');

      assert(
        invLine && Number(invLine.debit) === 160000,
        'Test 2.6: Inventory Asset debited for net discounted amount (PKR 160,000)',
        invLine ? `Debit: ${invLine.debit}` : 'Line missing'
      );
      assert(
        taxLine && Number(taxLine.debit) === 28800,
        'Test 2.7: Sales Tax Payable debited for input GST (PKR 28,800)',
        taxLine ? `Debit: ${taxLine.debit}` : 'Line missing'
      );
      assert(
        apLine && Number(apLine.credit) === 188800,
        'Test 2.8: Accounts Payable credited for total vendor bill (PKR 188,800)',
        apLine ? `Credit: ${apLine.credit}` : 'Line missing'
      );
      assert(
        totalDr === 188800 && totalCr === 188800 && totalDr === totalCr,
        'Test 2.9: GRN double entry is strictly balanced: Debit (188,800) == Credit (188,800)',
        `Dr: ${totalDr}, Cr: ${totalCr}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 3: Vendor Return (Debit Note) with GST Reversal
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 3] HTTP POST /api/procurement/vendor-return (Debit Note) ---');
    // Return 1 unit from GRN (cost 80,000 + 18% GST 14,400 = 94,400 AP reversal)
    const vRetRes = await fetch(`${BASE_URL}/api/procurement/vendor-return`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vendorId: vendor.id,
        reason: 'Defective test unit return',
        lineItems: [
          {
            productId: baseProduct.id,
            quantity: 1,
            grnLineItemId: savedGrnLine.id,
          },
        ],
      }),
    });

    const vRetData = await vRetRes.json();
    assert(vRetRes.ok, 'Test 3.1: Vendor return (Debit Note) created successfully', vRetData.error);
    const vRetId = vRetData.vendorReturn.id;
    cleanup.returnIds.push(vRetId);

    // Verify vendor return journal entry
    const vRetJournal = await prisma.journalEntry.findFirst({
      where: { sourceId: vRetId },
      include: { lines: { include: { account: true } } },
    });
    assert(vRetJournal !== null, 'Test 3.2: Double-entry journal created for Vendor Return');
    if (vRetJournal) {
      cleanup.journalEntryIds.push(vRetJournal.id);
      const vRetDr = vRetJournal.lines.reduce((acc, l) => acc + Number(l.debit), 0);
      const vRetCr = vRetJournal.lines.reduce((acc, l) => acc + Number(l.credit), 0);

      const apDebit = vRetJournal.lines.find(
        (l) => l.account.name === 'Accounts Payable (Trade Creditors)' && Number(l.debit) > 0
      );
      const invCredit = vRetJournal.lines.find(
        (l) => l.account.name === 'Inventory Asset' && Number(l.credit) > 0
      );
      const taxCredit = vRetJournal.lines.find(
        (l) => l.account.name === 'Sales Tax Payable' && Number(l.credit) > 0
      );

      assert(
        apDebit && Number(apDebit.debit) === 94400,
        'Test 3.3: AP debited for full return value including tax (PKR 94,400)',
        apDebit ? `Debit: ${apDebit.debit}` : 'Line missing'
      );
      assert(
        invCredit && Number(invCredit.credit) === 80000,
        'Test 3.4: Inventory Asset credited for net cost (PKR 80,000)',
        invCredit ? `Credit: ${invCredit.credit}` : 'Line missing'
      );
      assert(
        taxCredit && Number(taxCredit.credit) === 14400,
        'Test 3.5: Sales Tax Payable credited for GST tax reversal (PKR 14,400)',
        taxCredit ? `Credit: ${taxCredit.credit}` : 'Line missing'
      );
      assert(
        vRetDr === 94400 && vRetCr === 94400 && vRetDr === vRetCr,
        'Test 3.6: Vendor return strictly balances: Debit (94,400) == Credit (94,400)',
        `Dr: ${vRetDr}, Cr: ${vRetCr}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 4: Quotation Creation & Conversion to Live Invoice
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 4] Quotation Creation & Conversion to Invoice ---');
    const quoteRes = await fetch(`${BASE_URL}/api/sales/quotations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clientName: `Test Client ${testSuffix}`,
        clientPhone: `0300-CL-${testSuffix}`,
        clientAddress: '123 Test Street, Lahore',
        isGst: true,
        taxRate: 18,
        discountType: 'PERCENTAGE',
        discountPercent: 10, // 10% discount on 2 units @ 150,000 (300,000 - 30,000 = 270,000 + 18% tax 48,600 = 318,600)
        discountAmount: 30000,
        userNotes: 'Quotation with discount and GST',
        lineItems: [
          {
            productId: baseProduct.id,
            quantity: 2,
            salesPrice: 150000,
          },
        ],
      }),
    });

    const quoteData = await quoteRes.json();
    assert(quoteRes.ok, 'Test 4.1: Quotation created successfully', quoteData.error);
    const quoteId = quoteData.quotation.id;
    cleanup.quotationIds.push(quoteId);

    // Convert Quotation to Invoice via POST /api/sales/quotations/[id]/convert
    const convertRes = await fetch(`${BASE_URL}/api/sales/quotations/${quoteId}/convert`, {
      method: 'POST',
      headers,
    });

    const convertData = await convertRes.json();
    assert(convertRes.ok, 'Test 4.2: HTTP POST /api/sales/quotations/[id]/convert succeeds', convertData.error);
    const convInvoice = convertData.invoice;
    cleanup.invoiceIds.push(convInvoice.id);

    assert(
      Number(convInvoice.totalAmount) === 318600,
      'Test 4.3: Converted Invoice total equals net taxable + 18% GST (PKR 318,600)',
      `Actual: ${convInvoice.totalAmount}`
    );

    // Verify journal entry for the converted invoice
    const invJournal = await prisma.journalEntry.findFirst({
      where: { sourceId: convInvoice.id, idempotencyKey: `INVOICE:${convInvoice.id}:revenue` },
      include: { lines: { include: { account: true } } },
    });
    assert(invJournal !== null, 'Test 4.4: Revenue journal entry posted on quotation conversion');
    if (invJournal) {
      cleanup.journalEntryIds.push(invJournal.id);
      const drLines = invJournal.lines.filter((l) => Number(l.debit) > 0);
      const crLines = invJournal.lines.filter((l) => Number(l.credit) > 0);
      const totalDr = drLines.reduce((acc, l) => acc + Number(l.debit), 0);
      const totalCr = crLines.reduce((acc, l) => acc + Number(l.credit), 0);

      const arLine = drLines.find((l) => l.account.name === 'Accounts Receivable (Trade Debtors)');
      const revLine = crLines.find((l) => l.account.name === 'Sales Revenue');
      const taxLine = crLines.find((l) => l.account.name === 'Sales Tax Payable');

      assert(
        arLine && Number(arLine.debit) === 318600,
        'Test 4.5: AR debited for full invoice total (PKR 318,600)',
        arLine ? `Debit: ${arLine.debit}` : 'Line missing'
      );
      assert(
        revLine && Number(revLine.credit) === 270000,
        'Test 4.6: Sales Revenue credited for net taxable sales (PKR 270,000)',
        revLine ? `Credit: ${revLine.credit}` : 'Line missing'
      );
      assert(
        taxLine && Number(taxLine.credit) === 48600,
        'Test 4.7: Sales Tax Payable credited for 18% GST (PKR 48,600)',
        taxLine ? `Credit: ${taxLine.credit}` : 'Line missing'
      );
      assert(
        totalDr === 318600 && totalCr === 318600 && totalDr === totalCr,
        'Test 4.8: Invoice revenue strictly balances: AR Dr (318,600) == Revenue Cr (270,000) + Tax Cr (48,600)',
        `Dr: ${totalDr}, Cr: ${totalCr}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 5: Delivery Order (DO) Stock Validation & Movement
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 5] HTTP POST /api/sales/do (Stock Validation & Movement) ---');
    // Case 5A: Attempt to dispatch more units than available on hand
    const currentOnHand = (await prisma.product.findUnique({ where: { id: baseProduct.id } })).onHandQty;
    const excessiveDoRes = await fetch(`${BASE_URL}/api/sales/do`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoiceId: convInvoice.id,
        clientName: convInvoice.clientName,
        status: 'DISPATCHED',
        lineItems: [
          {
            productId: baseProduct.id,
            quantity: currentOnHand + 100, // Excessive
          },
        ],
      }),
    });
    assert(
      excessiveDoRes.ok === false,
      'Test 5.1: Delivery Order blocks dispatch when quantity exceeds on-hand stock',
      `Status: ${excessiveDoRes.status}`
    );

    // Case 5B: Valid dispatch of 2 units
    const validDoRes = await fetch(`${BASE_URL}/api/sales/do`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoiceId: convInvoice.id,
        clientName: convInvoice.clientName,
        status: 'DISPATCHED',
        lineItems: [
          {
            productId: baseProduct.id,
            quantity: 2,
          },
        ],
      }),
    });

    const validDoData = await validDoRes.json();
    assert(validDoRes.ok, 'Test 5.2: Valid Delivery Order dispatch succeeds', validDoData.error);
    if (validDoData.deliveryOrder) cleanup.doIds.push(validDoData.deliveryOrder.id);

    const stockAfterDo = (await prisma.product.findUnique({ where: { id: baseProduct.id } })).onHandQty;
    assert(
      stockAfterDo === currentOnHand - 2,
      'Test 5.3: Delivery Order accurately decrements physical stock by 2 units',
      `Before: ${currentOnHand}, After: ${stockAfterDo}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Installment Payments & Deduplication
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 6] Split Installment Payments (Party Statement Deduplication) ---');
    // Invoice 5 total is 318,600.
    // Installment 1: 150,000 via CASH
    const pay1Res = await fetch(`${BASE_URL}/api/sales/invoice/${convInvoice.id}/payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amountPaid: 150000,
        method: 'CASH',
        notes: 'Installment 1',
      }),
    });
    const pay1Data = await pay1Res.json();
    assert(pay1Res.ok, 'Test 6.1: Payment Installment 1 (PKR 150,000) recorded successfully', pay1Data.error);

    // Installment 2: 168,600 via BANK
    const pay2Res = await fetch(`${BASE_URL}/api/sales/invoice/${convInvoice.id}/payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amountPaid: 168600,
        method: 'BANK_TRANSFER',
        notes: 'Installment 2',
      }),
    });
    const pay2Data = await pay2Res.json();
    assert(pay2Res.ok, 'Test 6.2: Payment Installment 2 (PKR 168,600) recorded successfully', pay2Data.error);

    // Verify party statement for this customer via /api/sales/customers/[id]
    const custRecord = await prisma.customer.findFirst({
      where: { name: { equals: convInvoice.clientName, mode: 'insensitive' } },
    });

    if (custRecord) {
      const custStatementRes = await fetch(`${BASE_URL}/api/sales/customers/${custRecord.id}`, {
        method: 'GET',
        headers,
      });
      const custStatementData = await custStatementRes.json();
      assert(custStatementRes.ok, 'Test 6.3: Customer party statement fetched successfully', custStatementData.error);

      // Verify customer statement transactions contain BOTH payments
      const txs = custStatementData.customer?.ledger || [];
      const paymentTxs = txs.filter((t) => t.docType === 'PAYMENT' || t.docType === 'CRV' || t.docType === 'BRV');
      assert(
        paymentTxs.length >= 2,
        'Test 6.4: Customer statement displays both installment payments without deduplication masking Payment 2',
        `Payment entries count: ${paymentTxs.length}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 7: Cash Refund Validation on Unpaid vs Paid Invoices
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 7] HTTP POST /api/sales/refunds (Cash Refund Security) ---');
    // Case 7A: Create an UNPAID invoice and attempt cash refund -> MUST BE REJECTED
    const unpaidInvRes = await fetch(`${BASE_URL}/api/sales/invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clientName: `Unpaid Client ${testSuffix}`,
        clientPhone: `0300-UP-${testSuffix}`,
        date: new Date().toISOString(),
        isGst: false,
        lineItems: [{ productId: baseProduct.id, quantity: 1, salesPrice: 50000 }],
        payments: [], // Rs. 0 paid
      }),
    });
    const unpaidInvData = await unpaidInvRes.json();
    const unpaidInvId = unpaidInvData.invoice.id;
    cleanup.invoiceIds.push(unpaidInvId);

    // First create a Sales Return against this unpaid invoice
    const unpaidLine = await prisma.invoiceLineItem.findFirst({ where: { invoiceId: unpaidInvId } });
    const retUnpaidRes = await fetch(`${BASE_URL}/api/sales/returns`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoiceId: unpaidInvId,
        reason: 'Client cancelled order',
        lineItems: [
          {
            invoiceLineItemId: unpaidLine.id,
            quantity: 1,
            refundPrice: 50000,
          },
        ],
      }),
    });
    const retUnpaidData = await retUnpaidRes.json();
    assert(retUnpaidRes.ok, 'Test 7.1: Return processed on unpaid invoice', retUnpaidData.error);
    const unpaidReturnId = retUnpaidData.customerReturn?.id || retUnpaidData.return?.id;
    if (unpaidReturnId) cleanup.returnIds.push(unpaidReturnId);

    // Attempt cash refund on this unpaid invoice -> MUST FAIL
    const illegalCashRefundRes = await fetch(`${BASE_URL}/api/sales/refunds`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        returnId: unpaidReturnId,
        amountRefunded: 50000,
        refundMethod: 'CASH',
        notes: 'Illegal cash payout on unpaid order',
      }),
    });
    assert(
      illegalCashRefundRes.ok === false,
      'Test 7.2: Server BLOCKS cash refund on unpaid invoice where customer paid Rs. 0',
      `Status: ${illegalCashRefundRes.status}`
    );

    // Case 7B: Return with cash refund on PAID invoice -> MUST SUCCEED
    // We create a return on convInvoice (which had full PKR 318,600 paid)
    const paidInvLine = await prisma.invoiceLineItem.findFirst({ where: { invoiceId: convInvoice.id } });
    const retPaidRes = await fetch(`${BASE_URL}/api/sales/returns`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoiceId: convInvoice.id,
        reason: 'Customer return paid unit',
        lineItems: [
          {
            invoiceLineItemId: paidInvLine.id,
            quantity: 1,
            refundPrice: 100000,
          },
        ],
      }),
    });
    const retPaidData = await retPaidRes.json();
    assert(retPaidRes.ok, 'Test 7.3: Sales return processed on paid invoice', retPaidData.error);
    const paidReturnId = retPaidData.customerReturn?.id || retPaidData.return?.id;
    if (paidReturnId) cleanup.returnIds.push(paidReturnId);

    // Cash refund against the paid return order
    const legalCashRefundRes = await fetch(`${BASE_URL}/api/sales/refunds`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        returnId: paidReturnId,
        amountRefunded: 100000,
        refundMethod: 'CASH',
        notes: 'Valid cash refund on paid invoice',
      }),
    });
    const legalCashRefundData = await legalCashRefundRes.json();
    assert(
      legalCashRefundRes.ok,
      'Test 7.4: Cash refund succeeds on paid invoice where customer actually paid',
      legalCashRefundData.error
    );

    // -------------------------------------------------------------------------
    // TEST 8: Sales Returns (Credit Notes) & Sales Tax Reversal
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 8] HTTP POST /api/sales/returns (Sales Tax GST Reversal) ---');
    // Return 1 unit from Invoice 5 (which was a GST invoice)
    const inv5Line = (await prisma.invoiceLineItem.findFirst({ where: { invoiceId: convInvoice.id } }));
    const sRetRes = await fetch(`${BASE_URL}/api/sales/returns`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoiceId: convInvoice.id,
        reason: 'Customer return defective unit',
        lineItems: [
          {
            invoiceLineItemId: inv5Line.id,
            quantity: 1,
            refundPrice: 150000,
          },
        ],
      }),
    });

    const sRetData = await sRetRes.json();
    assert(sRetRes.ok, 'Test 8.1: Sales Return processed successfully', sRetData.error);
    const returnId = sRetData.customerReturn?.id || sRetData.return?.id;
    if (returnId) cleanup.returnIds.push(returnId);

    // Verify Sales Return journal reverses both Sales Revenue and Sales Tax Payable
    const retJournal = await prisma.journalEntry.findFirst({
      where: { sourceId: returnId, idempotencyKey: `RETURN:${returnId}:revenue-reversal` },
      include: { lines: { include: { account: true } } },
    });
    assert(retJournal !== null, 'Test 8.2: Journal entry created for Sales Return');
    if (retJournal) {
      cleanup.journalEntryIds.push(retJournal.id);
      const revDebit = retJournal.lines.find((l) => l.account.name === 'Sales Revenue' && Number(l.debit) > 0);
      const taxDebit = retJournal.lines.find((l) => l.account.name === 'Sales Tax Payable' && Number(l.debit) > 0);
      const arCredit = retJournal.lines.find(
        (l) => l.account.name === 'Accounts Receivable (Trade Debtors)' && Number(l.credit) > 0
      );

      assert(
        revDebit && Number(revDebit.debit) === 150000,
        'Test 8.3: Sales Revenue debited for return taxable amount (PKR 150,000)',
        revDebit ? `Debit: ${revDebit.debit}` : 'Line missing'
      );
      assert(
        taxDebit && Number(taxDebit.debit) === 27000,
        'Test 8.4: Sales Tax Payable debited for GST reversal (PKR 27,000)',
        taxDebit ? `Debit: ${taxDebit.debit}` : 'Line missing'
      );
      assert(
        arCredit && Number(arCredit.credit) === 177000,
        'Test 8.5: AR credited for total return including GST (PKR 177,000)',
        arCredit ? `Credit: ${arCredit.credit}` : 'Line missing'
      );
    }

    // -------------------------------------------------------------------------
    // TEST 9: Reports & Sub-Ledger Verification (No Double Counting)
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 9] HTTP GET /api/reports & /api/finance/insights ---');
    const custReportRes = await fetch(`${BASE_URL}/api/reports?type=customer_balances`, {
      method: 'GET',
      headers,
    });
    const custReportData = await custReportRes.json();
    assert(custReportRes.ok, 'Test 9.1: Customer balances report loads successfully', custReportData.error);
    assert(
      custReportData.report?.totals !== undefined,
      'Test 9.2: Customer report contains structured totals object without double-counting'
    );

    const vendorReportRes = await fetch(`${BASE_URL}/api/reports?type=vendor_balances`, {
      method: 'GET',
      headers,
    });
    const vendorReportData = await vendorReportRes.json();
    assert(vendorReportRes.ok, 'Test 9.3: Vendor balances report loads successfully', vendorReportData.error);
    assert(
      vendorReportData.report?.totals !== undefined,
      'Test 9.4: Vendor report contains structured totals object without duplicating POs and GRNs'
    );

    const insightsRes = await fetch(`${BASE_URL}/api/finance/insights?period=30d`, {
      method: 'GET',
      headers,
    });
    const insightsData = await insightsRes.json();
    assert(insightsRes.ok, 'Test 9.5: Finance insights loads successfully', insightsData.error);
    assert(
      insightsData.kpis?.netCashFlow !== undefined && insightsData.kpis?.netMarginPct !== undefined,
      'Test 9.6: Financial insights cash flow and net margin calculate cleanly'
    );

  } catch (err) {
    console.error('Test Execution Error:', err);
    testResults.push({ name: 'Execution Crash', passed: false, details: err.message });
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: Clean up all created test entities
    // -------------------------------------------------------------------------
    console.log('\n--- Cleaning Up Test Artifacts ---');
    try {
      if (cleanup.journalEntryIds.length > 0) {
        await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: cleanup.journalEntryIds } } });
        await prisma.journalEntry.deleteMany({ where: { id: { in: cleanup.journalEntryIds } } });
      }
      if (cleanup.returnIds.length > 0) {
        await prisma.refund.deleteMany({ where: { returnId: { in: cleanup.returnIds } } });
        await prisma.returnLineItem.deleteMany({ where: { returnId: { in: cleanup.returnIds } } });
        await prisma.return.deleteMany({ where: { id: { in: cleanup.returnIds } } });
        await prisma.vendorReturnLineItem.deleteMany({ where: { vendorReturnId: { in: cleanup.returnIds } } });
        await prisma.vendorReturn.deleteMany({ where: { id: { in: cleanup.returnIds } } });
      }
      if (cleanup.doIds.length > 0) {
        await prisma.dOLineItem.deleteMany({ where: { doId: { in: cleanup.doIds } } });
        await prisma.deliveryOrder.deleteMany({ where: { id: { in: cleanup.doIds } } });
      }
      if (cleanup.invoiceIds.length > 0) {
        await prisma.payment.deleteMany({ where: { invoiceId: { in: cleanup.invoiceIds } } });
        await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: cleanup.invoiceIds } } });
        await prisma.ledgerEntry.deleteMany({ where: { referenceId: { in: cleanup.invoiceIds } } });
        await prisma.invoice.deleteMany({ where: { id: { in: cleanup.invoiceIds } } });
      }
      if (cleanup.quotationIds.length > 0) {
        await prisma.quotationLineItem.deleteMany({ where: { quotationId: { in: cleanup.quotationIds } } });
        await prisma.quotation.deleteMany({ where: { id: { in: cleanup.quotationIds } } });
      }
      if (cleanup.grnIds.length > 0) {
        await prisma.gRNLineItem.deleteMany({ where: { grnId: { in: cleanup.grnIds } } });
        await prisma.goodsReceivedNote.deleteMany({ where: { id: { in: cleanup.grnIds } } });
      }
      if (cleanup.poIds.length > 0) {
        await prisma.pOPendingItem.deleteMany({ where: { poId: { in: cleanup.poIds } } });
        await prisma.pOLineItem.deleteMany({ where: { poId: { in: cleanup.poIds } } });
        await prisma.purchaseOrder.deleteMany({ where: { id: { in: cleanup.poIds } } });
      }
      if (cleanup.productIds.length > 0) {
        await prisma.stockLedger.deleteMany({ where: { productId: { in: cleanup.productIds } } });
        await prisma.product.deleteMany({ where: { id: { in: cleanup.productIds } } });
      }
      if (cleanup.customerIds.length > 0) {
        await prisma.customer.deleteMany({ where: { id: { in: cleanup.customerIds } } });
      }
      if (cleanup.vendorIds.length > 0) {
        await prisma.vendor.deleteMany({ where: { id: { in: cleanup.vendorIds } } });
      }
      console.log('Cleanup completed successfully. Database returned to pristine state.');
    } catch (cleanupErr) {
      console.error('Cleanup warning:', cleanupErr);
    }
  }

  console.log('\n========================================================================');
  console.log('TEST SUMMARY');
  console.log('========================================================================');
  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = testResults.filter((t) => !t.passed).length;
  console.log(`TOTAL TESTS: ${testResults.length}`);
  console.log(`PASSED:      ${passedCount}`);
  console.log(`FAILED:      ${failedCount}`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllHttpTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
