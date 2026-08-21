const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.join(process.cwd(), 'node_modules', '@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  console.log('=== 1. DATABASE CONNECTION DETAILS ===');
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
  if (match) {
    try {
      const url = new URL(match[1]);
      console.log('Host/Endpoint:', url.host);
      console.log('Database Name:', url.pathname.replace('/', ''));
    } catch (e) {
      console.log('Error parsing URL:', e.message);
    }
  } else {
    console.log('DATABASE_URL not found in .env');
  }

  console.log('\n=== 2. ROW COUNTS & ENTITY DETAILS ===');
  const [
    customerCount,
    vendorCount,
    employeeCount,
    invoiceCount,
    ledgerCount,
    paymentCount,
    poCount,
    complaintCount
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.vendor.count(),
    prisma.employee.count(),
    prisma.invoice.count(),
    prisma.ledgerEntry.count(),
    prisma.payment.count(),
    prisma.purchaseOrder.count(),
    prisma.complaint.count()
  ]);

  console.log({
    customerCount,
    vendorCount,
    employeeCount,
    invoiceCount,
    ledgerCount,
    paymentCount,
    poCount,
    complaintCount
  });

  const invoices = await prisma.invoice.findMany({
    select: {
      id: true,
      invoiceNumber: true,
      clientName: true,
      totalAmount: true,
      amountPaid: true,
      status: true,
      createdAt: true,
      date: true
    },
    orderBy: { createdAt: 'asc' }
  });
  console.log('\n--- ALL INVOICE RECORDS ---');
  console.table(invoices);

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, phone: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log('\n--- ALL CUSTOMER RECORDS ---');
  console.table(customers);

  const ledgerEntries = await prisma.ledgerEntry.findMany({
    select: { id: true, voucherNumber: true, referenceType: true, amount: true, debitAccount: true, creditAccount: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });

  const invoiceDates = invoices.map(i => new Date(i.createdAt).getTime());
  const ledgerDates = ledgerEntries.map(l => new Date(l.createdAt).getTime());
  const allDates = [...invoiceDates, ...ledgerDates];

  if (allDates.length > 0) {
    const earliest = new Date(Math.min(...allDates));
    const latest = new Date(Math.max(...allDates));
    console.log('\nTimestamps:');
    console.log('Earliest createdAt (Invoice / LedgerEntry):', earliest.toISOString());
    console.log('Latest createdAt (Invoice / LedgerEntry):', latest.toISOString());
  }

  console.log('\n=== 3. DASHBOARD METRICS COMPUTATION ===');
  // Monthly Sales Revenue: sum of Invoice.totalAmount for August 2026 (or total invoices)
  let totalRevenue = 0;
  let totalAR = 0;
  invoices.forEach(inv => {
    totalRevenue += Number(inv.totalAmount);
    totalAR += (Number(inv.totalAmount) - Number(inv.amountPaid));
  });

  // General Ledger Liquid Cash (Cash/Bank filter as used by legacy dashboard)
  let liquidCashPosFormula = 0;
  let liquidCashAllCashFormula = 0;
  ledgerEntries.forEach(le => {
    const amt = Number(le.amount);
    if (le.debitAccount === 'Cash/Bank') liquidCashPosFormula += amt;
    if (le.creditAccount === 'Cash/Bank') liquidCashPosFormula -= amt;

    if (['Cash/Bank', 'Cash in Hand', 'Bank Account (Meezan Bank)'].includes(le.debitAccount)) liquidCashAllCashFormula += amt;
    if (['Cash/Bank', 'Cash in Hand', 'Bank Account (Meezan Bank)'].includes(le.creditAccount)) liquidCashAllCashFormula -= amt;
  });

  // Active Service Tickets (Complaints not closed)
  const allComplaints = await prisma.complaint.findMany();
  const activeComplaints = allComplaints.filter(c => c.status !== 'CLOSED');

  console.log({
    computedMonthlySalesRevenue: totalRevenue,
    computedAR: totalAR,
    computedLiquidCash_DashboardPOSFormula: liquidCashPosFormula,
    computedLiquidCash_AllCashAccounts: liquidCashAllCashFormula,
    totalComplaintsCount: allComplaints.length,
    activeComplaintsCount: activeComplaints.length,
    complaintStatuses: allComplaints.map(c => ({ number: c.complaintNumber, status: c.status }))
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
