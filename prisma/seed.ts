import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with clean initial configuration...");

  // 1. Clear existing transactional & dummy data in proper foreign key order
  console.log("Cleaning up existing records...");
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

  // 2. Create Core Permissions
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
  console.log(`Synced ${permissionsList.length} core permissions.`);

  // 3. Create Predefined System Roles
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
  console.log(`Synced ${rolesList.length} system roles with permission mappings.`);

  // 4. Seed Default System Settings
  await prisma.systemSetting.upsert({
    where: { key: "salesTaxRate" },
    update: { value: "18" },
    create: { key: "salesTaxRate", value: "18" },
  });
  console.log("Initialized default system settings (Sales Tax Rate: 18%).");

  // 5. Create ONLY the Admin User Account
  const defaultAdminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "admin123";
  const passwordHash = bcrypt.hashSync(defaultAdminPassword, 10);

  const adminEmail = process.env.ADMIN_EMAIL || "admin@tceerp.com";
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "System Admin",
      roleId: dbRoles["Admin"].id,
      passwordHash,
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: "System Admin",
      roleId: dbRoles["Admin"].id,
      passwordHash,
      isActive: true,
    },
  });

  // Also ensure legacy/fallback admin@hvacerp.com can be used if desired
  if (adminEmail !== "admin@hvacerp.com") {
    await prisma.user.upsert({
      where: { email: "admin@hvacerp.com" },
      update: {
        name: "System Admin (HVAC)",
        roleId: dbRoles["Admin"].id,
        passwordHash,
        isActive: true,
      },
      create: {
        email: "admin@hvacerp.com",
        name: "System Admin (HVAC)",
        roleId: dbRoles["Admin"].id,
        passwordHash,
        isActive: true,
      },
    });
  }

  console.log(`\n==================================================`);
  console.log(` Database Clean Seed Completed Successfully!`);
  console.log(`--------------------------------------------------`);
  console.log(` Admin Accounts Seeded:`);
  console.log(`   - Email: ${adminEmail}`);
  console.log(`   - Fallback Email: admin@hvacerp.com`);
  console.log(`   - Default Password: ${defaultAdminPassword}`);
  console.log(` No dummy products, orders, employees, or tickets added.`);
  console.log(`==================================================\n`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
