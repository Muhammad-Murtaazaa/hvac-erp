const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAudit() {
  console.log('=== RUNNING COMPREHENSIVE ERP AUDIT ===\n');

  // 1. Unbalanced Journal Entries
  console.log('1. Checking for unbalanced Journal Entries...');
  const journalEntries = await prisma.journalEntry.findMany({
    include: { lines: { include: { account: true } } }
  });

  const unbalancedJournals = [];
  for (const je of journalEntries) {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of je.lines) {
      totalDebit += Number(l.debit || 0);
      totalCredit += Number(l.credit || 0);
    }
    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.05) {
      unbalancedJournals.push({
        id: je.id,
        sourceType: je.sourceType,
        sourceId: je.sourceId,
        narration: je.narration,
        totalDebit,
        totalCredit,
        diff
      });
    }
  }
  console.log(`Unbalanced Journal Entries: ${unbalancedJournals.length}`);
  if (unbalancedJournals.length > 0) {
    console.log(unbalancedJournals);
  }

  // 2. Check for duplicate Ledger Entries (e.g. duplicate vouchers)
  console.log('\n2. Checking Ledger Entries for duplicates or anomalies...');
  const ledgerEntries = await prisma.ledgerEntry.findMany();
  console.log(`Total Ledger Entries: ${ledgerEntries.length}`);

  // Check duplicate vouchers
  const voucherMap = {};
  const duplicateVouchers = [];
  for (const le of ledgerEntries) {
    if (le.voucherNumber) {
      const key = `${le.voucherNumber}_${le.voucherType}_${le.partyId || 'none'}_${Number(le.amount)}`;
      if (voucherMap[key]) {
        duplicateVouchers.push({
          voucherNumber: le.voucherNumber,
          voucherType: le.voucherType,
          partyName: le.partyName,
          amount: le.amount,
          id1: voucherMap[key].id,
          id2: le.id,
          date1: voucherMap[key].entryDate,
          date2: le.entryDate
        });
      } else {
        voucherMap[key] = le;
      }
    }
  }
  console.log(`Duplicate Vouchers in Ledger: ${duplicateVouchers.length}`);
  if (duplicateVouchers.length > 0) {
    console.log(duplicateVouchers);
  }

  // Check remaining legacy backfills
  const legacyBackfills = await prisma.journalEntry.findMany({
    where: {
      idempotencyKey: {
        startsWith: 'LEGACY_BACKFILL:'
      }
    }
  });
  console.log(`Remaining LEGACY_BACKFILL journal entries: ${legacyBackfills.length}`);
  for (const lb of legacyBackfills) {
    console.log(`  - Ref/Narration: ${lb.narration}, Key: ${lb.idempotencyKey}`);
  }

  // 3. Purchase Orders with discounts vs GRNs and Bills
  console.log('\n3. Checking all Purchase Orders with discounts vs their GRNs...');
  const posWithDiscount = await prisma.purchaseOrder.findMany({
    include: {
      lineItems: {
        include: { product: true }
      },
      grns: {
        include: {
          lineItems: true
        }
      }
    }
  });
  console.log(`Total POs: ${posWithDiscount.length}`);
  const poDiscrepancies = [];
  for (const po of posWithDiscount) {
    let discountPercent = 0;
    try {
      if (po.notes && po.notes.startsWith('{')) {
        const parsed = JSON.parse(po.notes);
        if (parsed.discountPercent) discountPercent = Number(parsed.discountPercent);
        else if (parsed.discountAmount && parsed.subtotalAmount) {
          discountPercent = (Number(parsed.discountAmount) / Number(parsed.subtotalAmount)) * 100;
        }
      }
    } catch (e) {}
    if (!discountPercent && Number(po.discount) > 0 && Number(po.totalAmount) > 0) {
      discountPercent = (Number(po.discount) / (Number(po.totalAmount) + Number(po.discount))) * 100;
    }

    if (discountPercent > 0) {
      for (const grn of po.grns) {
        for (const line of grn.lineItems) {
          const poLine = po.lineItems.find(l => l.productId === line.productId);
          if (poLine) {
            const rawCost = Number(poLine.unitCost);
            const discountedCost = Math.round(rawCost * (1 - discountPercent / 100));
            const actualGrnCost = Number(line.unitCost);
            if (Math.abs(actualGrnCost - discountedCost) > 1) {
              poDiscrepancies.push({
                poNumber: po.poNumber,
                grnNumber: grn.grnNumber,
                productId: line.productId,
                rawCost,
                discountPercent,
                expectedDiscountedCost: discountedCost,
                actualGrnCost
              });
            }
          }
        }
      }
    }
  }
  console.log(`PO/GRN Discount Discrepancies: ${poDiscrepancies.length}`);
  if (poDiscrepancies.length > 0) {
    console.log(poDiscrepancies);
  }

  // 4. Sales Invoices math check
  console.log('\n4. Checking Sales Invoices math & status...');
  const invoices = await prisma.invoice.findMany({
    include: { lineItems: true, payments: true }
  });
  console.log(`Total Invoices: ${invoices.length}`);
  const invoiceAnomalies = [];
  for (const inv of invoices) {
    const total = Number(inv.totalAmount || 0);
    const paid = Number(inv.amountPaid || 0);

    // Sum actual payments
    let actualPaidSum = 0;
    for (const p of inv.payments) {
      actualPaidSum += Number(p.amountPaid || 0);
    }

    if (paid > total + 0.5) {
      invoiceAnomalies.push({
        invNumber: inv.invoiceNumber,
        issue: 'amountPaid > totalAmount',
        total,
        paid
      });
    }

    if (Math.abs(actualPaidSum - paid) > 1.0 && inv.payments.length > 0) {
      invoiceAnomalies.push({
        invNumber: inv.invoiceNumber,
        issue: 'Payment records sum != invoice.amountPaid',
        paymentRecordsSum: actualPaidSum,
        invoiceAmountPaid: paid
      });
    }

    let lineSum = 0;
    for (const l of inv.lineItems) {
      lineSum += Number(l.salesPrice) * Number(l.quantity);
    }
    // Check if lineSum diverges wildly from total (excluding tax/discount)
    if (inv.lineItems.length > 0 && Math.abs(lineSum - total) > 10.0 && !inv.isGst) {
      invoiceAnomalies.push({
        invNumber: inv.invoiceNumber,
        issue: 'Non-GST Invoice total != line sum',
        lineSum,
        total
      });
    }
  }
  console.log(`Invoice Anomalies: ${invoiceAnomalies.length}`);
  if (invoiceAnomalies.length > 0) {
    console.log(invoiceAnomalies);
  }

  // 5. Products stock & average cost check
  console.log('\n5. Checking Products inventory & average cost...');
  const products = await prisma.product.findMany({
    include: { stockLedgerLogs: true }
  });
  const productAnomalies = [];
  for (const p of products) {
    if (Number(p.onHandQty) < 0) {
      productAnomalies.push({
        sku: p.sku,
        name: p.name,
        issue: 'Negative on-hand quantity',
        onHandQty: p.onHandQty
      });
    }
    if (Number(p.onHandQty) > 0 && Number(p.averageCost) <= 0) {
      productAnomalies.push({
        sku: p.sku,
        name: p.name,
        issue: 'Zero or negative average cost with positive stock',
        onHandQty: p.onHandQty,
        averageCost: p.averageCost
      });
    }

    // Verify stock ledger running balance
    if (p.stockLedgerLogs.length > 0) {
      // sort by timestamp
      const logs = [...p.stockLedgerLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const lastBalance = logs[logs.length - 1].runningBalance;
      if (lastBalance !== p.onHandQty) {
        productAnomalies.push({
          sku: p.sku,
          name: p.name,
          issue: 'Stock ledger final balance != Product onHandQty',
          lastLedgerBalance: lastBalance,
          onHandQty: p.onHandQty
        });
      }
    }
  }
  console.log(`Product inventory anomalies: ${productAnomalies.length}`);
  if (productAnomalies.length > 0) {
    console.log(productAnomalies);
  }

  // 6. Customers / Vendors duplication or anomalies
  console.log('\n6. Checking Party definitions & cross-role links...');
  const customers = await prisma.customer.findMany();
  const vendors = await prisma.vendor.findMany();
  const employees = await prisma.employee.findMany();
  console.log(`Customers: ${customers.length}, Vendors: ${vendors.length}, Employees: ${employees.length}`);

  // Check phone duplication in customers
  const phoneMap = {};
  for (const c of customers) {
    const cleanPhone = (c.phone || '').trim();
    if (cleanPhone) {
      if (phoneMap[cleanPhone]) {
        console.log(`  Customer duplicate phone "${cleanPhone}": "${phoneMap[cleanPhone].name}" vs "${c.name}"`);
      } else {
        phoneMap[cleanPhone] = c;
      }
    }
  }

  // Check orphan LedgerEntries
  const orphanLedgers = await prisma.ledgerEntry.findMany({
    where: {
      partyId: null,
      partyType: { not: null }
    }
  });
  console.log(`Ledger entries with partyType set but partyId null: ${orphanLedgers.length}`);

  // 7. Check Delivery Orders vs Invoices
  console.log('\n7. Checking Delivery Orders vs Invoices...');
  const dos = await prisma.deliveryOrder.findMany({
    include: { lineItems: true, invoices: true }
  });
  console.log(`Total Delivery Orders: ${dos.length}`);
  const doAnomalies = [];
  for (const d of dos) {
    if (d.status === 'DISPATCHED' && d.invoices.length === 0) {
      doAnomalies.push({
        doNumber: d.doNumber,
        clientName: d.clientName,
        issue: 'Dispatched DO has no invoice attached'
      });
    }
  }
  console.log(`DO anomalies: ${doAnomalies.length}`);
  if (doAnomalies.length > 0) {
    console.log(doAnomalies.slice(0, 5));
  }

  // 8. Check Quotations vs Invoices
  console.log('\n8. Checking Quotations status...');
  const quotations = await prisma.quotation.findMany();
  console.log(`Total Quotations: ${quotations.length}`);
  for (const q of quotations) {
    if (q.status === 'CONVERTED' && !q.convertedInvoiceId) {
      console.log(`  Quotation ${q.quotationNumber} marked CONVERTED but convertedInvoiceId is null!`);
    }
  }

  console.log('\n=== AUDIT COMPLETE ===');
}

runAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
