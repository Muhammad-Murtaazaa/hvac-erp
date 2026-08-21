const path = require('path');
const { PrismaClient } = require(path.join(process.cwd(), 'node_modules', '@prisma/client'));
const prisma = new PrismaClient();

async function runAudit() {
  console.log('=== PHASE 4: DISTINCT ACCOUNT STRINGS IN LedgerEntry ===');
  const allEntries = await prisma.ledgerEntry.findMany({
    orderBy: { createdAt: 'asc' }
  });

  const debitAccounts = {};
  const creditAccounts = {};
  const allAccountStrings = new Set();

  allEntries.forEach(entry => {
    if (entry.debitAccount) {
      debitAccounts[entry.debitAccount] = (debitAccounts[entry.debitAccount] || 0) + 1;
      allAccountStrings.add(entry.debitAccount);
    }
    if (entry.creditAccount) {
      creditAccounts[entry.creditAccount] = (creditAccounts[entry.creditAccount] || 0) + 1;
      allAccountStrings.add(entry.creditAccount);
    }
  });

  console.log('\nDebit Account occurrences:');
  console.table(Object.entries(debitAccounts).map(([account, count]) => ({ account, count })));

  console.log('\nCredit Account occurrences:');
  console.table(Object.entries(creditAccounts).map(([account, count]) => ({ account, count })));

  console.log('\nAll unique account strings found across LedgerEntry:');
  console.log(Array.from(allAccountStrings));

  console.log('\n=== PHASE 5: PARTY ANALYSIS ===');
  const customers = await prisma.customer.findMany();
  const vendors = await prisma.vendor.findMany();
  const employees = await prisma.employee.findMany();

  console.log(`Total Customers: ${customers.length}`);
  console.log(`Total Vendors: ${vendors.length}`);
  console.log(`Total Employees: ${employees.length}`);

  // Duplicate name check
  const customerNameCounts = {};
  customers.forEach(c => {
    const norm = c.name.trim().toLowerCase();
    customerNameCounts[norm] = (customerNameCounts[norm] || 0) + 1;
  });
  const duplicateCustomerNames = Object.entries(customerNameCounts).filter(([_, count]) => count > 1);

  const employeeNameCounts = {};
  employees.forEach(e => {
    const norm = e.name.trim().toLowerCase();
    employeeNameCounts[norm] = (employeeNameCounts[norm] || 0) + 1;
  });
  const duplicateEmployeeNames = Object.entries(employeeNameCounts).filter(([_, count]) => count > 1);

  console.log('\nDuplicate Customer Names:', duplicateCustomerNames);
  console.log('Duplicate Employee Names:', duplicateEmployeeNames);

  // Analyze LedgerEntry party matching
  console.log(`\nTotal LedgerEntry rows: ${allEntries.length}`);

  const rowsWithPartyId = allEntries.filter(e => e.partyId);
  const rowsWithNullPartyId = allEntries.filter(e => !e.partyId);

  console.log(`Rows with existing partyId: ${rowsWithPartyId.length}`);
  console.log(`Rows with null partyId: ${rowsWithNullPartyId.length}`);

  console.log('\nDetailed breakdown of rows with null partyId:');
  let cleanMatches = 0;
  let noMatches = 0;
  let ambiguousMatches = 0;

  const matchDetails = [];

  rowsWithNullPartyId.forEach(row => {
    if (!row.partyName || row.partyName.trim() === '') {
      matchDetails.push({
        id: row.id,
        voucherNumber: row.voucherNumber,
        referenceType: row.referenceType,
        partyName: '(empty/null)',
        status: 'NO_PARTY_NAME'
      });
      noMatches++;
      return;
    }

    const searchName = row.partyName.trim().toLowerCase();
    
    // Check partyType if specified
    let matchedCustomers = [];
    let matchedVendors = [];
    let matchedEmployees = [];

    if (!row.partyType || row.partyType === 'CUSTOMER') {
      matchedCustomers = customers.filter(c => c.name.trim().toLowerCase() === searchName);
    }
    if (!row.partyType || row.partyType === 'VENDOR') {
      matchedVendors = vendors.filter(v => v.name.trim().toLowerCase() === searchName);
    }
    if (!row.partyType || row.partyType === 'EMPLOYEE') {
      matchedEmployees = employees.filter(e => e.name.trim().toLowerCase() === searchName);
    }

    const totalMatches = matchedCustomers.length + matchedVendors.length + matchedEmployees.length;

    if (totalMatches === 1) {
      cleanMatches++;
      const match = matchedCustomers[0] || matchedVendors[0] || matchedEmployees[0];
      const matchType = matchedCustomers[0] ? 'CUSTOMER' : matchedVendors[0] ? 'VENDOR' : 'EMPLOYEE';
      matchDetails.push({
        id: row.id,
        voucherNumber: row.voucherNumber,
        referenceType: row.referenceType,
        partyName: row.partyName,
        status: 'CLEAN_MATCH',
        matchedTo: `${matchType}: ${match.name} (${match.id})`
      });
    } else if (totalMatches === 0) {
      noMatches++;
      matchDetails.push({
        id: row.id,
        voucherNumber: row.voucherNumber,
        referenceType: row.referenceType,
        partyName: row.partyName,
        status: 'NO_MATCH'
      });
    } else {
      ambiguousMatches++;
      matchDetails.push({
        id: row.id,
        voucherNumber: row.voucherNumber,
        referenceType: row.referenceType,
        partyName: row.partyName,
        status: 'AMBIGUOUS',
        candidates: `${matchedCustomers.length} cust, ${matchedVendors.length} vend, ${matchedEmployees.length} emp`
      });
    }
  });

  console.table(matchDetails);
  console.log({
    cleanMatches,
    noMatches,
    ambiguousMatches
  });

  console.log('\n=== ALL RAW LEDGER ENTRIES FOR INSPECTION ===');
  console.log(JSON.stringify(allEntries, null, 2));
}

runAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
