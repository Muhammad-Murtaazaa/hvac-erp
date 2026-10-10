const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

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

const rolesList = [
  { name: "Admin", description: "Full system control and configurations" },
  { name: "Sales", description: "Sales workflows, invoices, POS, and support logs" },
  { name: "Inventory/Procurement", description: "Procurement, goods receipts, returns, and inventory counts" },
  { name: "Technician", description: "Assigned service queue view and ticket updates" },
  { name: "Support", description: "Complaint registration and dispatcher panel" },
  { name: "Accountant", description: "Financial views, general ledger entries, payroll, and reports" },
  { name: "Investor", description: "Read-only access to dashboard charts and financial summaries" },
];

async function seedInDb(dbUrl, dbName) {
  if (!dbUrl) return;
  const client = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    // 1. Ensure permissions exist
    const dbPermissions = {};
    for (const perm of permissionsList) {
      dbPermissions[perm.name] = await client.permission.upsert({
        where: { name: perm.name },
        update: { description: perm.description },
        create: perm,
      });
    }

    // 2. Ensure roles exist
    const dbRoles = {};
    for (const roleDef of rolesList) {
      dbRoles[roleDef.name] = await client.role.upsert({
        where: { name: roleDef.name },
        update: { description: roleDef.description },
        create: { name: roleDef.name, description: roleDef.description },
      });
    }

    // Link all permissions to Admin role if not linked
    const adminRole = dbRoles["Admin"];
    if (adminRole) {
      for (const perm of Object.values(dbPermissions)) {
        await client.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
          update: {},
          create: { roleId: adminRole.id, permissionId: perm.id },
        });
      }
    }

    // 3. Provision System Admin (admin@tceerp.com / admin123)
    const adminEmail = "admin@tceerp.com";
    const adminPassHash = bcrypt.hashSync("admin123", 10);
    const adminUser = await client.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash: adminPassHash,
        isActive: true,
        roleId: adminRole.id,
        name: "System Admin",
      },
      create: {
        email: adminEmail,
        passwordHash: adminPassHash,
        name: "System Admin",
        roleId: adminRole.id,
        isActive: true,
      },
    });
    console.log(`[${dbName}] Admin user provisioned: ${adminUser.email} (ID: ${adminUser.id})`);

    // 4. Provision Developer User (muhammad.murtaazaa@gmail.com / murt@1234)
    const devEmail = "muhammad.murtaazaa@gmail.com";
    const devPassHash = bcrypt.hashSync("murt@1234", 10);
    const devUser = await client.user.upsert({
      where: { email: devEmail },
      update: {
        passwordHash: devPassHash,
        isActive: true,
        roleId: adminRole.id,
        name: "Lead Developer",
      },
      create: {
        email: devEmail,
        passwordHash: devPassHash,
        name: "Lead Developer",
        roleId: adminRole.id,
        isActive: true,
      },
    });
    console.log(`[${dbName}] Developer user provisioned: ${devUser.email} (ID: ${devUser.id})`);
  } catch (err) {
    console.error(`[${dbName}] Error provisioning initial data:`, err.message);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  const tceUrl = process.env.DATABASE_URL_TCE || process.env.DATABASE_URL;
  const tecairUrl = process.env.DATABASE_URL_TECAIR || (process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/\/(neondb|hvac_erp)(\?|$)/, "/tecair$2") : "");

  await seedInDb(tceUrl, "TCE");
  if (tecairUrl && tecairUrl !== tceUrl) {
    await seedInDb(tecairUrl, "TECAIR");
  }
}

main().catch((e) => {
  console.error("Error in seed_dev_user:", e);
  process.exit(1);
});
