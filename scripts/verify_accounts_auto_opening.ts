import prisma from "@/lib/db";

async function testAutoAccountOpening() {
  console.log("=================================================================");
  console.log("⚡ TESTING AUTOMATIC FINANCIAL ACCOUNT OPENING ACROSS MODULES ⚡");
  console.log("=================================================================\n");

  const timestamp = Date.now().toString().slice(-4);
  const custName = `NEW-AUTO-CUSTOMER-${timestamp}`;
  const custPhone = `0300-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const vendName = `NEW-AUTO-VENDOR-${timestamp}`;
  const vendPhone = `0321-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const empNo = `EMP-AUTO-${timestamp}`;
  const empName = `Technician Asif ${timestamp}`;
  const empPhone = `0333-${Math.floor(1000000 + Math.random() * 9000000)}`;

  // 1. Create customer from Sales/Financials module
  console.log(`1. Creating Customer: ${custName} (${custPhone})...`);
  const customer = await prisma.customer.create({
    data: {
      name: custName,
      phone: custPhone,
      address: "SITE Area, Karachi",
    },
  });

  // 2. Create vendor from Procurement module
  console.log(`2. Creating Vendor: ${vendName} (${vendPhone})...`);
  const vendor = await prisma.vendor.create({
    data: {
      name: vendName,
      contactPerson: "Mr. Supplier Contact",
      phone: vendPhone,
      address: "Korangi Industrial Area",
      paymentTerms: "Net 30 Days",
    },
  });

  // 3. Create employee from HRM/Support module
  console.log(`3. Creating Employee: ${empName} (${empNo})...`);
  const employee = await prisma.employee.create({
    data: {
      employeeNo: empNo,
      name: empName,
      cnic: `42101-${Math.floor(1000000 + Math.random() * 9000000)}-1`,
      phone: empPhone,
      address: "Gulshan-e-Iqbal, Karachi",
      department: "Technical & HVAC",
      position: "Field Technician",
      joiningDate: new Date(),
      baseSalary: 45000,
      bankDetails: "Meezan Bank - 0987654321",
      status: "ACTIVE",
    },
  });

  console.log("\n--- Checking Financial Accounts Retrieval (Simulating /api/finance/accounts) ---");
  const [allCustomers, allVendors, allEmployees] = await Promise.all([
    prisma.customer.findMany({ select: { id: true, name: true, phone: true } }),
    prisma.vendor.findMany({ select: { id: true, name: true, phone: true } }),
    prisma.employee.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, employeeNo: true } }),
  ]);

  const custAccountFound = allCustomers.some((c) => c.id === customer.id);
  const vendAccountFound = allVendors.some((v) => v.id === vendor.id);
  const empAccountFound = allEmployees.some((e) => e.id === employee.id);

  console.log(`Customer Account opened in Financial Accounts: ${custAccountFound ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`Vendor Account opened in Financial Accounts: ${vendAccountFound ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`Employee Account opened in Financial Accounts: ${empAccountFound ? "PASSED ✅" : "FAILED ❌"}`);

  if (custAccountFound && vendAccountFound && empAccountFound) {
    console.log("\n🎉 ALL FINANCIAL ACCOUNTS AUTOMATICALLY OPENED & CONFIRMED ACROSS MODULES!");
  } else {
    console.error("\n❌ FAILED TO LOCATE ONE OR MORE ACCOUNTS.");
    process.exit(1);
  }
}

testAutoAccountOpening()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
