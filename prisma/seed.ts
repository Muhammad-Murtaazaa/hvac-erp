import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with rich historical data...");

  // Clear existing transactional data to prevent duplicates / conflicts in proper foreign key order
  console.log("Cleaning up transactional records...");
  await prisma.auditSnapshot.deleteMany({});
  await prisma.scheduledReport.deleteMany({});
  await prisma.savedReportTemplate.deleteMany({});
  await prisma.proactiveBriefing.deleteMany({});
  await prisma.complaintTimeline.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.returnLineItem.deleteMany({});
  await prisma.return.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.dOLineItem.deleteMany({});
  await prisma.deliveryOrder.deleteMany({});
  await prisma.vendorReturnLineItem.deleteMany({});
  await prisma.vendorReturn.deleteMany({});
  await prisma.gRNLineItem.deleteMany({});
  await prisma.pOPendingItem.deleteMany({});
  await prisma.goodsReceivedNote.deleteMany({});
  await prisma.pOLineItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.stockLedger.deleteMany({});
  await prisma.stockAdjustment.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.loginActivityLog.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});

  // 1. Create Core Permissions
  const permissionsList = [
    { name: "VIEW_DASHBOARD", description: "View the main overview dashboard" },
    { name: "VIEW_FINANCIALS", description: "View financial balances and profit/loss statements" },
    { name: "MANAGE_USERS", description: "Create, update, and deactivate system users" },
    { name: "MANAGE_ROLES", description: "Configure system roles and permission mapping" },
    { name: "MANAGE_INVENTORY", description: "Track items, warehouse logs, and stock adjustments" },
    { name: "MANAGE_PROCUREMENT", description: "Create POs, log GRNs, and process vendor returns" },
    { name: "MANAGE_SALES", description: "Issue Delivery Orders, generate invoices, and handle customer returns" },
    { name: "MANAGE_HRM", description: "Track employee profiles, log attendance, and run payroll" },
    { name: "MANAGE_SUPPORT", description: "Register customer complaints, assign technicians, and log timelines" },
    { name: "VIEW_REPORTS", description: "Access comprehensive analytical reports" },
  ];

  const dbPermissions: Record<string, any> = {};
  for (const perm of permissionsList) {
    dbPermissions[perm.name] = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
  }
  console.log(`Synced ${permissionsList.length} permissions.`);

  // 2. Create Predefined Roles
  const rolesList = [
    {
      name: "Admin",
      description: "Full system control and configurations",
      permissions: Object.keys(dbPermissions),
    },
    {
      name: "Sales",
      description: "Sales workflows, invoices, POS, and support logs",
      permissions: ["VIEW_DASHBOARD", "MANAGE_SALES", "MANAGE_SUPPORT", "VIEW_REPORTS"],
    },
    {
      name: "Inventory/Procurement",
      description: "Procurement, goods receipts, returns, and inventory counts",
      permissions: ["VIEW_DASHBOARD", "MANAGE_INVENTORY", "MANAGE_PROCUREMENT", "VIEW_REPORTS"],
    },
    {
      name: "Technician",
      description: "Assigned service queue view and ticket updates",
      permissions: ["VIEW_DASHBOARD"],
    },
    {
      name: "Support",
      description: "Complaint registration and dispatcher panel",
      permissions: ["VIEW_DASHBOARD", "MANAGE_SUPPORT"],
    },
    {
      name: "Accountant",
      description: "Financial views, general ledger entries, payroll, and reports",
      permissions: ["VIEW_DASHBOARD", "VIEW_FINANCIALS", "VIEW_REPORTS", "MANAGE_HRM"],
    },
    {
      name: "Investor",
      description: "Read-only access to dashboard charts and financial summaries",
      permissions: ["VIEW_DASHBOARD", "VIEW_FINANCIALS", "VIEW_REPORTS"],
    },
  ];

  const dbRoles: Record<string, any> = {};
  for (const roleDef of rolesList) {
    const createdRole = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: {
        name: roleDef.name,
        description: roleDef.description,
      },
    });
    dbRoles[roleDef.name] = createdRole;

    await prisma.rolePermission.deleteMany({ where: { roleId: createdRole.id } });
    for (const permName of roleDef.permissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: createdRole.id,
          permissionId: dbPermissions[permName].id,
        },
      });
    }
  }
  console.log(`Synced ${rolesList.length} roles.`);

  // 3. Create Employees
  const employeeData = [
    { name: "John Doe", cnic: "42101-1234567-1", phone: "+923001234567", address: "123 Main St, HVAC Colony", department: "SERVICE", position: "Senior HVAC Technician", joiningDate: new Date("2024-01-15"), baseSalary: 65000.00, bankDetails: "HBL - Account: 123456789012" },
    { name: "Sarah Jenkins", cnic: "42101-7654321-2", phone: "+923119876543", address: "45 Customer Care Lane", department: "SERVICE", position: "Dispatcher Agent", joiningDate: new Date("2024-03-01"), baseSalary: 45000.00, bankDetails: "Meezan Bank - Account: 987654321098" },
    { name: "Robert Smith", cnic: "42101-1111111-3", phone: "+923211112222", address: "88 Ledger Square, Finance Dist", department: "SERVICE", position: "Accounts Executive", joiningDate: new Date("2023-06-01"), baseSalary: 85000.00, bankDetails: "Alfalah Bank - Account: 111122223333" },
    { name: "Asif Ali", cnic: "42101-2222222-4", phone: "+923009876541", address: "Sector 11, Orangi Town, Karachi", department: "SERVICE", position: "Chiller Technician", joiningDate: new Date("2024-05-10"), baseSalary: 55000.00, bankDetails: "UBL - Account: 5556667778" },
    { name: "Bilal Ahmed", cnic: "42101-3333333-5", phone: "+923339876542", address: "Gulshan-e-Iqbal, Karachi", department: "SERVICE", position: "Junior Installer", joiningDate: new Date("2025-01-01"), baseSalary: 35000.00, bankDetails: "JS Bank - Account: 8889990001" },
  ];

  const dbEmployees: Record<string, any> = {};
  for (const emp of employeeData) {
    dbEmployees[emp.name] = await prisma.employee.create({ data: emp });
  }
  console.log(`Created ${employeeData.length} employees.`);

  // 4. Create System Users
  const usersList = [
    { email: "admin@hvacerp.com", name: "System Admin", roleId: dbRoles["Admin"].id, passwordHash: bcrypt.hashSync("admin123", 10) },
    { email: "accountant@hvacerp.com", name: "Robert Smith (Accountant)", roleId: dbRoles["Accountant"].id, passwordHash: bcrypt.hashSync("accountant123", 10) },
    { email: "technician@hvacerp.com", name: "John Doe (Technician)", roleId: dbRoles["Technician"].id, passwordHash: bcrypt.hashSync("tech123", 10) },
    { email: "support@hvacerp.com", name: "Sarah Jenkins (Support)", roleId: dbRoles["Support"].id, passwordHash: bcrypt.hashSync("support123", 10) },
    { email: "inventory@hvacerp.com", name: "Inventory Manager", roleId: dbRoles["Inventory/Procurement"].id, passwordHash: bcrypt.hashSync("inventory123", 10) },
    { email: "sales@hvacerp.com", name: "Sales Rep", roleId: dbRoles["Sales"].id, passwordHash: bcrypt.hashSync("sales123", 10) },
    { email: "investor@hvacerp.com", name: "Shareholder Investor", roleId: dbRoles["Investor"].id, passwordHash: bcrypt.hashSync("investor123", 10) },
  ];

  for (const u of usersList) {
    await prisma.user.create({ data: u });
  }
  console.log(`Created ${usersList.length} user profiles.`);

  // 5. Create Catalog Products
  const productsList = [
    { sku: "SKU-COMP-001", name: "Carrier Compressor 5-Ton", category: "Compressors", unit: "Units", reorderLevel: 5, onHandQty: 0, incomingQty: 0, averageCost: 45000.00, salesPrice: 58000.00 },
    { sku: "SKU-STAT-002", name: "Honeywell Smart Thermostat", category: "Thermostats", unit: "Units", reorderLevel: 15, onHandQty: 0, incomingQty: 0, averageCost: 8500.00, salesPrice: 12000.00 },
    { sku: "SKU-DUCT-003", name: "Flexible Aluminum Ducting 10in x 25ft", category: "Ducting", unit: "Boxes", reorderLevel: 20, onHandQty: 0, incomingQty: 0, averageCost: 3200.00, salesPrice: 4800.00 },
    { sku: "SKU-VALV-004", name: "Expansion Valve 3-Ton R410A", category: "Valves", unit: "Units", reorderLevel: 10, onHandQty: 0, incomingQty: 0, averageCost: 5500.00, salesPrice: 7500.00 },
    { sku: "SKU-FILT-005", name: "MERV 13 Air Filter 20x20x1", category: "Filters", unit: "Packs", reorderLevel: 50, onHandQty: 0, incomingQty: 0, averageCost: 1200.00, salesPrice: 1900.00 },
    { sku: "SKU-MOTR-006", name: "Condenser Fan Motor 1/3 HP", category: "Motors", unit: "Units", reorderLevel: 8, onHandQty: 0, incomingQty: 0, averageCost: 15000.00, salesPrice: 21000.00 },
  ];

  const dbProducts: Record<string, any> = {};
  for (const prod of productsList) {
    dbProducts[prod.sku] = await prisma.product.create({ data: prod });
  }
  console.log(`Created ${productsList.length} products.`);

  // 6. Create Vendors
  const vendorsList = [
    { name: "Carrier Global HVAC Suppliers", contactPerson: "Mr. Imran Khan", phone: "+922134567890", email: "procurement@carrierpakistan.com", address: "Plot 42-C, Korangi Industrial Area, Karachi", paymentTerms: "Net 30 Days" },
    { name: "Honeywell Industrial Trading", contactPerson: "Ms. Ayesha Siddiqui", phone: "+924235894321", email: "sales@honeywell-industrial.com.pk", address: "Block H3, Johar Town, Lahore", paymentTerms: "Net 15 Days" },
    { name: "Indus Motors & Fans", contactPerson: "Mian Bilal", phone: "+92512234567", email: "orders@indusmotorsfans.com", address: "Industrial Area I-9, Islamabad", paymentTerms: "Cash on Delivery" },
  ];

  const dbVendors: Record<string, any> = {};
  for (const vendor of vendorsList) {
    dbVendors[vendor.name] = await prisma.vendor.create({ data: vendor });
  }
  console.log(`Created ${vendorsList.length} vendors.`);

  // 7. Seed System settings
  await prisma.systemSetting.upsert({
    where: { key: "salesTaxRate" },
    update: { value: "18" },
    create: { key: "salesTaxRate", value: "18" },
  });

  const supportUser = await prisma.user.findFirst({ where: { email: "support@hvacerp.com" } });
  const adminUser = await prisma.user.findFirst({ where: { email: "admin@hvacerp.com" } });

  if (adminUser && supportUser) {
    console.log("Seeding rich historical transactions...");

    // 7.1 Historical Purchase Orders and GRNs (Stocking up products)
    const purchases = [
      { poNum: "PO-10001", grnNum: "GRN-10001", vendor: "Carrier Global HVAC Suppliers", lines: [ { sku: "SKU-COMP-001", qty: 25, cost: 45000.00 }, { sku: "SKU-VALV-004", qty: 50, cost: 5500.00 } ], date: new Date("2026-02-10") },
      { poNum: "PO-10002", grnNum: "GRN-10002", vendor: "Honeywell Industrial Trading", lines: [ { sku: "SKU-STAT-002", qty: 40, cost: 8500.00 }, { sku: "SKU-FILT-005", qty: 200, cost: 1200.00 } ], date: new Date("2026-03-05") },
      { poNum: "PO-10003", grnNum: "GRN-10003", vendor: "Indus Motors & Fans", lines: [ { sku: "SKU-MOTR-006", qty: 15, cost: 15000.00 }, { sku: "SKU-DUCT-003", qty: 80, cost: 3200.00 } ], date: new Date("2026-04-12") },
      { poNum: "PO-10004", grnNum: "GRN-10004", vendor: "Carrier Global HVAC Suppliers", lines: [ { sku: "SKU-COMP-001", qty: 10, cost: 46000.00 }, { sku: "SKU-VALV-004", qty: 20, cost: 5600.00 } ], date: new Date("2026-06-01") },
      { poNum: "PO-10005", grnNum: "GRN-10005", vendor: "Honeywell Industrial Trading", lines: [ { sku: "SKU-STAT-002", qty: 20, cost: 8500.00 }, { sku: "SKU-FILT-005", qty: 150, cost: 1250.00 } ], date: new Date("2026-07-20") },
    ];

    for (const pur of purchases) {
      const v = dbVendors[pur.vendor];
      const totalAmount = pur.lines.reduce((acc, l) => acc + l.qty * l.cost, 0);

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: pur.poNum,
          vendorId: v.id,
          status: "COMPLETED",
          totalAmount,
          createdAt: pur.date,
          updatedAt: pur.date,
          lineItems: {
            create: pur.lines.map((l) => ({
              productId: dbProducts[l.sku].id,
              quantityOrdered: l.qty,
              quantityReceived: l.qty,
              unitCost: l.cost,
              expectedDeliveryDate: pur.date,
            })),
          },
        },
      });

      const grn = await prisma.goodsReceivedNote.create({
        data: {
          grnNumber: pur.grnNum,
          poId: po.id,
          receivedById: adminUser.id,
          receivedAt: pur.date,
          notes: "Auto seeded historical batch receipt",
          lineItems: {
            create: pur.lines.map((l) => ({
              productId: dbProducts[l.sku].id,
              quantityReceived: l.qty,
              unitCost: l.cost,
            })),
          },
        },
      });

      // Update product physical counts and ledger entries
      for (const line of pur.lines) {
        const prod = dbProducts[line.sku];
        const prevQty = prod.onHandQty;
        prod.onHandQty += line.qty;

        await prisma.product.update({
          where: { id: prod.id },
          data: { onHandQty: prod.onHandQty, averageCost: line.cost },
        });

        await prisma.stockLedger.create({
          data: {
            productId: prod.id,
            type: "PO_RECEIPT",
            quantity: line.qty,
            referenceDoc: pur.grnNum,
            timestamp: pur.date,
            runningBalance: prod.onHandQty,
          },
        });

        await prisma.ledgerEntry.create({
          data: {
            entryDate: pur.date,
            description: `Purchased & stocked: ${prod.name} (${pur.poNum})`,
            debitAccount: "Inventory Asset",
            creditAccount: "Accounts Payable",
            amount: line.qty * line.cost,
            referenceType: "PO_RECEIPT",
            referenceId: po.id,
          },
        });
      }
    }
    console.log("Seeded purchase orders and GRN inventory updates.");

    // 7.2 Seed Historical Customer Complaints & Tech assignments
    const complaintsData = [
      { customer: "Hashoo Group Offices", phone: "0300-1111222", address: "Civil Lines, Karachi", desc: "Main central chiller unit not cooling. Suspected compressor burnout.", status: "RESOLVED", remarks: "Compressor replaced. Service invoice generated.", amount: 85000.00, amountStatus: "PAID", tech: "John Doe", date: new Date("2026-03-01") },
      { customer: "Fatima Fertilizer Plant", phone: "0311-2223334", address: "Sadiqabad, Punjab", desc: "Duct line air balancing issue. High vibration in central branch.", status: "RESOLVED", remarks: "Dampers adjusted. Vibration pads installed.", amount: 32000.00, amountStatus: "PAID", tech: "Asif Ali", date: new Date("2026-03-15") },
      { customer: "Lucky One Mall Outlet", phone: "021-3444555", address: "Rashid Minhas Rd, Karachi", desc: "Thermostat settings locked. Display frozen.", status: "CLOSED", remarks: "Reset Honeywell thermostat. Programmed custom parameters.", amount: 5000.00, amountStatus: "PAID", tech: "Bilal Ahmed", date: new Date("2026-04-02") },
      { customer: "Pearl Continental Hotel", phone: "0300-2223335", address: "Club Road, Karachi", desc: "Chilled water piping leak in Corridor B.", status: "RESOLVED", remarks: "Piping leak welded. Pressure test complete.", amount: 45000.00, amountStatus: "PAID", tech: "John Doe", date: new Date("2026-04-20") },
      { customer: "Habib Bank HQ", phone: "0321-4445556", address: "I.I. Chundrigar Rd, Karachi", desc: "Server room unit tripped. Alarm Code AL-04 active.", status: "CLOSED", remarks: "Condenser coil washed. High pressure switch reset.", amount: 15000.00, amountStatus: "PAID", tech: "Asif Ali", date: new Date("2026-05-05") },
      { customer: "Siddiqsons Tower", phone: "0300-4448881", address: "Clifton Block 9, Karachi", desc: "Fresh air fan motor failure. Unit drawing excess amps.", status: "RESOLVED", remarks: "Replaced 1/3 HP motor. Amps stabilized at 2.4A.", amount: 28000.00, amountStatus: "PAID", tech: "John Doe", date: new Date("2026-05-18") },
      { customer: "Engro Corp Offices", phone: "0300-9990001", address: "Clifton Harbor Front, Karachi", desc: "Air quality complaints. Moldy smell in executive wing.", status: "RESOLVED", remarks: "Cleaned AHU drain pan. Disinfected evaporator coils.", amount: 18500.00, amountStatus: "PAID", tech: "Bilal Ahmed", date: new Date("2026-06-10") },
      { customer: "Dolmen Mall Foodcourt", phone: "021-3888999", address: "Clifton Beach Road, Karachi", desc: "FCU water overflow in Pizza Hut kitchen.", status: "RESOLVED", remarks: "Drain pump line unclogged. Water flow normal.", amount: 12000.00, amountStatus: "PAID", tech: "Asif Ali", date: new Date("2026-06-25") },
      { customer: "K-Electric Grid Station", phone: "0312-3334445", address: "Gizri, Karachi", desc: "High temperature alarm in substation control room.", status: "CLOSED", remarks: "Replaced faulty control valve.", amount: 22000.00, amountStatus: "PAID", tech: "John Doe", date: new Date("2026-07-02") },
      { customer: "National Bank of Pakistan", phone: "0300-1115556", address: "Queens Road, Karachi", desc: "Split unit installation and duct extension in lobby.", status: "RESOLVED", remarks: "Installed split unit, completed piping and charging.", amount: 60000.00, amountStatus: "PAID", tech: "Bilal Ahmed", date: new Date("2026-07-15") },
      
      // Active Complaints (Open / Working / Cancelled / Done)
      { customer: "Getz Pharma Corp", phone: "0300-7778889", address: "Korangi Industrial Area, Karachi", desc: "Cleanroom validation failure. Particulate count high.", status: "OPEN", remarks: "Pending HEPA filter check.", amount: 95000.00, amountStatus: "UNPAID", tech: "John Doe", date: new Date("2026-08-01") },
      { customer: "Emaar Sales Office", phone: "0321-9998887", address: "DHA Phase 8 View, Karachi", desc: "VRF outdoor unit running noisy. Compressor knocking sound.", status: "IN_PROGRESS", remarks: "Technician dispatched to inspect valve pressures.", amount: 40000.00, amountStatus: "UNPAID", tech: "Asif Ali", date: new Date("2026-08-05") },
      { customer: "Standard Chartered Bank", phone: "0311-5556667", address: "I.I Chundrigar Road, Karachi", desc: "Water cooling tower overflow. Automatic float switch malfunctioning.", status: "OPEN", remarks: "Float valve replacement ordered.", amount: 18000.00, amountStatus: "UNPAID", tech: "Bilal Ahmed", date: new Date("2026-08-07") },
      { customer: "Aga Khan University Hospital", phone: "021-3999000", address: "Stadium Road, Karachi", desc: "Emergency OT Room 4 temperature drift. High humidity.", status: "IN_PROGRESS", remarks: "Humidifier board inspection ongoing.", amount: 35000.00, amountStatus: "UNPAID", tech: "John Doe", date: new Date("2026-08-08") },
      { customer: "Imtiaz Super Market", phone: "0300-4444555", address: "Gulshan-e-Iqbal, Karachi", desc: "Multiple cold chain freezer cabinets temperature high.", status: "DONE", remarks: "Freezer cabin fan motor replaced and tested.", amount: 55000.00, amountStatus: "UNPAID", tech: "Asif Ali", date: new Date("2026-08-09") },
      { customer: "Korangi Garments Factory", phone: "0321-1237890", address: "Sector 15, Korangi, Karachi", desc: "Steam boiler pipe leak repair.", status: "CANCELLED", remarks: "Client cancelled work scope. Moving to alternative supplier.", amount: 0.00, amountStatus: "WAIVED", tech: "Bilal Ahmed", date: new Date("2026-08-04") },
    ];

    let compCount = 10001;
    for (const cData of complaintsData) {
      const compNum = `COMP-${compCount++}`;
      const techRecord = dbEmployees[cData.tech];

      const ticket = await prisma.complaint.create({
        data: {
          complaintNumber: compNum,
          date: cData.date,
          customerName: cData.customer,
          customerPhone: cData.phone,
          customerAddress: cData.address,
          description: cData.desc,
          remarks: cData.remarks,
          assignedTechnicianId: techRecord?.id || null,
          status: cData.status,
          amount: cData.amount,
          amountStatus: cData.amountStatus,
          createdAt: cData.date,
          updatedAt: cData.date,
        },
      });

      // Seeding Timeline Logs
      await prisma.complaintTimeline.create({
        data: {
          complaintId: ticket.id,
          changedById: supportUser.id,
          fromStatus: "OPEN",
          toStatus: "OPEN",
          remarks: "Complaint ticket registered in support desk.",
          timestamp: cData.date,
        },
      });

      if (techRecord) {
        await prisma.complaintTimeline.create({
          data: {
            complaintId: ticket.id,
            changedById: supportUser.id,
            fromStatus: "OPEN",
            toStatus: cData.status === "OPEN" ? "OPEN" : "IN_PROGRESS",
            remarks: `Assigned to technician ${techRecord.name}`,
            timestamp: new Date(cData.date.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
          },
        });
      }

      if (cData.status === "RESOLVED" || cData.status === "CLOSED" || cData.status === "DONE") {
        await prisma.complaintTimeline.create({
          data: {
            complaintId: ticket.id,
            changedById: supportUser.id,
            fromStatus: "IN_PROGRESS",
            toStatus: cData.status,
            remarks: cData.remarks || "Work scope finished.",
            timestamp: new Date(cData.date.getTime() + 24 * 60 * 60 * 1000), // 1 day later
          },
        });

        // Seed Sales Invoice for resolved complaints
        if (cData.amount > 0) {
          const invCount = await prisma.invoice.count();
          const invoiceNumber = `INV-${10001 + invCount}`;

          const inv = await prisma.invoice.create({
            data: {
              invoiceNumber,
              clientName: cData.customer,
              clientPhone: cData.phone,
              clientAddress: cData.address,
              date: cData.date,
              status: cData.amountStatus === "PAID" ? "PAID" : "UNPAID",
              totalAmount: cData.amount,
              amountPaid: cData.amountStatus === "PAID" ? cData.amount : 0.00,
              complaintId: ticket.id,
              createdAt: cData.date,
              updatedAt: cData.date,
              lineItems: {
                create: [
                  {
                    description: `Service Charges for Ticket ${compNum}: ${cData.desc}`,
                    quantity: 1,
                    salesPrice: cData.amount,
                  },
                ],
              },
            },
          });

          await prisma.ledgerEntry.create({
            data: {
              entryDate: cData.date,
              description: `Service billing for Complaint ${compNum} (${invoiceNumber})`,
              debitAccount: "Accounts Receivable",
              creditAccount: "Sales Revenue",
              amount: cData.amount,
              referenceType: "INVOICE",
              referenceId: inv.id,
            },
          });

          if (cData.amountStatus === "PAID") {
            await prisma.payment.create({
              data: {
                invoiceId: inv.id,
                amountPaid: cData.amount,
                paymentDate: cData.date,
                method: "CASH",
              },
            });

            await prisma.ledgerEntry.create({
              data: {
                entryDate: cData.date,
                description: `Payment received for Invoice ${invoiceNumber}`,
                debitAccount: "Cash/Bank",
                creditAccount: "Accounts Receivable",
                amount: cData.amount,
                referenceType: "INVOICE",
                referenceId: inv.id,
              },
            });
          }
        }
      }
    }
    console.log("Seeded historical customer service tickets and billings.");

    // 7.3 Seed Standalone Invoices & Delivery Orders (HVAC Trading)
    const salesData = [
      { client: "Al-Rehman Developers", phone: "0300-8889990", address: "Bahria Town, Karachi", lines: [{ sku: "SKU-COMP-001", qty: 3, price: 58000.00 }, { sku: "SKU-VALV-004", qty: 10, price: 7500.00 }], isDelivered: true, isPaid: true, date: new Date("2026-04-10") },
      { client: "Universal Engineering", phone: "0321-7776662", address: "SITE Area, Karachi", lines: [{ sku: "SKU-STAT-002", qty: 15, price: 12000.00 }, { sku: "SKU-FILT-005", qty: 80, price: 1900.00 }], isDelivered: true, isPaid: false, date: new Date("2026-05-22") },
      { client: "Beaconhouse School System", phone: "0333-1114449", address: "PECHS Block 2, Karachi", lines: [{ sku: "SKU-DUCT-003", qty: 40, price: 4800.00 }, { sku: "SKU-FILT-005", qty: 50, price: 1900.00 }], isDelivered: true, isPaid: true, date: new Date("2026-06-15") },
      { client: "Medix Clinic & Hospital", phone: "0300-5557771", address: "North Nazimabad, Karachi", lines: [{ sku: "SKU-MOTR-006", qty: 5, price: 21000.00 }, { sku: "SKU-VALV-004", qty: 8, price: 7500.00 }], isDelivered: true, isPaid: true, date: new Date("2026-07-05") },
      { client: "Zainab Builders", phone: "0321-2228883", address: "Gulistan-e-Jauhar, Karachi", lines: [{ sku: "SKU-COMP-001", qty: 4, price: 58000.00 }, { sku: "SKU-DUCT-003", qty: 25, price: 4800.00 }], isDelivered: false, isPaid: false, date: new Date("2026-08-02") },
    ];

    let salesCount = 10001;
    for (const sale of salesData) {
      const doNum = `DO-${salesCount}`;
      const invNum = `INV-${salesCount + 50}`;
      salesCount++;

      const subtotal = sale.lines.reduce((acc, l) => acc + l.qty * l.price, 0);
      const salesTax = subtotal * 0.18; // 18% tax
      const totalAmount = subtotal + salesTax;

      // Create Delivery Order if dispatched
      let doId = null;
      if (sale.isDelivered) {
        const dOrder = await prisma.deliveryOrder.create({
          data: {
            doNumber: doNum,
            date: sale.date,
            clientName: sale.client,
            clientPhone: sale.phone,
            deliveryAddress: sale.address,
            status: "DELIVERED",
            notes: "Seeded delivery challan",
            through: "Suzuki Pickup",
            vehicle: "KBA-5566",
            createdAt: sale.date,
            updatedAt: sale.date,
            lineItems: {
              create: sale.lines.map((l) => ({
                productId: dbProducts[l.sku].id,
                quantity: l.qty,
                salesPrice: l.price,
              })),
            },
          },
        });
        doId = dOrder.id;

        // Deduct inventory physical stock and write stock ledger entries
        for (const line of sale.lines) {
          const prod = dbProducts[line.sku];
          prod.onHandQty -= line.qty;

          await prisma.product.update({
            where: { id: prod.id },
            data: { onHandQty: prod.onHandQty },
          });

          await prisma.stockLedger.create({
            data: {
              productId: prod.id,
              type: "DO_DISPATCH",
              quantity: -line.qty,
              referenceDoc: doNum,
              timestamp: sale.date,
              runningBalance: prod.onHandQty,
            },
          });
        }
      }

      // Create Invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: invNum,
          clientName: sale.client,
          clientPhone: sale.phone,
          clientAddress: sale.address,
          date: sale.date,
          status: sale.isPaid ? "PAID" : "UNPAID",
          totalAmount,
          amountPaid: sale.isPaid ? totalAmount : 0.00,
          doId,
          createdAt: sale.date,
          updatedAt: sale.date,
          lineItems: {
            create: sale.lines.map((l) => ({
              productId: dbProducts[l.sku].id,
              description: `Sales Item: ${dbProducts[l.sku].name}`,
              quantity: l.qty,
              salesPrice: l.price,
            })),
          },
        },
      });

      // Write ledger journal entries
      await prisma.ledgerEntry.create({
        data: {
          entryDate: sale.date,
          description: `Invoice billing: ${sale.client} (${invNum})`,
          debitAccount: "Accounts Receivable",
          creditAccount: "Sales Revenue",
          amount: totalAmount,
          referenceType: "INVOICE",
          referenceId: invoice.id,
        },
      });

      if (sale.isPaid) {
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amountPaid: totalAmount,
            paymentDate: sale.date,
            method: "BANK",
          },
        });

        await prisma.ledgerEntry.create({
          data: {
            entryDate: sale.date,
            description: `Payment received: ${sale.client} (${invNum})`,
            debitAccount: "Cash/Bank",
            creditAccount: "Accounts Receivable",
            amount: totalAmount,
            referenceType: "INVOICE",
            referenceId: invoice.id,
          },
        });
      }
    }
    console.log("Seeded historical sales invoices and delivery orders.");

    // 7.4 Seed Customer Returns
    console.log("Seeded simulated stock returns.");
    const returnedClient = salesData[2]; // Beaconhouse
    const targetProduct = dbProducts["SKU-DUCT-003"]; // Ducting
    const matchedInvoice = await prisma.invoice.findFirst({
      where: { clientName: returnedClient.client },
      include: { lineItems: true },
    });

    if (matchedInvoice && targetProduct) {
      const returnNumber = "RET-10001";
      const lineItem = matchedInvoice.lineItems.find((l) => l.productId === targetProduct.id);

      if (lineItem) {
        const ret = await prisma.return.create({
          data: {
            returnNumber,
            invoiceId: matchedInvoice.id,
            status: "COMPLETED",
            reason: "Excess duct rolls leftover from building fitout",
            totalAmount: 5 * 4800.00 * 1.18, // 5 units returned + 18% tax
            createdAt: new Date("2026-06-20"),
            updatedAt: new Date("2026-06-20"),
            lineItems: {
              create: [
                {
                  invoiceLineItemId: lineItem.id,
                  productId: targetProduct.id,
                  quantity: 5,
                  refundPrice: 4800.00,
                },
              ],
            },
          },
        });

        // Re-add inventory physical counts and stock ledger entries
        targetProduct.onHandQty += 5;
        await prisma.product.update({
          where: { id: targetProduct.id },
          data: { onHandQty: targetProduct.onHandQty },
        });

        await prisma.stockLedger.create({
          data: {
            productId: targetProduct.id,
            type: "RETURN",
            quantity: 5,
            referenceDoc: returnNumber,
            timestamp: new Date("2026-06-20"),
            runningBalance: targetProduct.onHandQty,
          },
        });

        await prisma.ledgerEntry.create({
          data: {
            entryDate: new Date("2026-06-20"),
            description: `Sales Return logged: ${returnNumber}`,
            debitAccount: "Sales Returns & Allowances",
            creditAccount: "Accounts Receivable",
            amount: 5 * 4800.00 * 1.18,
            referenceType: "RETURN",
            referenceId: ret.id,
          },
        });

        // Record refund payout
        await prisma.refund.create({
          data: {
            returnId: ret.id,
            amountRefunded: 5 * 4800.00 * 1.18,
            refundDate: new Date("2026-06-22"),
            method: "CASH",
          },
        });

        await prisma.ledgerEntry.create({
          data: {
            entryDate: new Date("2026-06-22"),
            description: `Refund cash payout for Return ${returnNumber}`,
            debitAccount: "Accounts Receivable",
            creditAccount: "Cash/Bank",
            amount: 5 * 4800.00 * 1.18,
            referenceType: "RETURN",
            referenceId: ret.id,
          },
        });
      }
    }

    // 7.5 Seed Attendance Records (Last 30 Days)
    console.log("Seeding employee attendance records...");
    const emps = await prisma.employee.findMany();
    for (const e of emps) {
      for (let i = 30; i >= 1; i--) {
        const date = new Date(new Date().setDate(new Date().getDate() - i));
        // skip sundays
        if (date.getDay() === 0) continue;

        const checkIn = new Date(date);
        checkIn.setHours(9, Math.floor(Math.random() * 20), 0); // 9:00 - 9:20 AM

        const checkOut = new Date(date);
        checkOut.setHours(18, Math.floor(Math.random() * 30), 0); // 6:00 - 6:30 PM

        await prisma.attendance.create({
          data: {
            employeeId: e.id,
            date,
            checkIn,
            checkOut,
            status: "PRESENT",
          },
        });
      }
    }

    // 7.6 Seed Payroll Runs (Last 3 Months)
    console.log("Seeding historical payroll records...");
    const payrollRuns = [
      { month: 5, year: 2026 },
      { month: 6, year: 2026 },
      { month: 7, year: 2026 },
    ];

    for (const run of payrollRuns) {
      for (const e of emps) {
        const base = Number(e.baseSalary);
        const allowances = base * 0.1; // 10% allowances
        const deductions = base * 0.05; // 5% tax/provident deductions
        const netPay = base + allowances - deductions;

        const pRun = await prisma.payrollRun.create({
          data: {
            employeeId: e.id,
            month: run.month,
            year: run.year,
            baseSalary: base,
            allowances,
            deductions,
            netPay,
            status: "PAID",
            paymentDate: new Date(run.year, run.month - 1, 28),
          },
        });

        // General Ledger payroll entry
        await prisma.ledgerEntry.create({
          data: {
            entryDate: new Date(run.year, run.month - 1, 28),
            description: `Salary payout to ${e.name} for ${run.month}/${run.year}`,
            debitAccount: "Salaries Expense",
            creditAccount: "Cash/Bank",
            amount: netPay,
            referenceType: "PAYROLL",
            referenceId: pRun.id,
          },
        });
      }
    }
  }

  console.log("Seeding database completed successfully with rich historical data!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
