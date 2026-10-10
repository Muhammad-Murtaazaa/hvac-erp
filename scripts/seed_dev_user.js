const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function seedInDb(dbUrl, dbName) {
  if (!dbUrl) return;
  const client = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    const email = "muhammad.murtaazaa@gmail.com";
    const rawPassword = "murt@1234";

    const adminRole = await client.role.findFirst({
      where: {
        name: { in: ["Admin", "admin", "Super Admin"] },
      },
    });

    if (!adminRole) {
      console.warn(`[${dbName}] Admin role not found, skipping user seed.`);
      return;
    }

    const passwordHash = bcrypt.hashSync(rawPassword, 10);

    const user = await client.user.upsert({
      where: { email },
      update: {
        passwordHash,
        isActive: true,
        roleId: adminRole.id,
        name: "Lead Developer",
      },
      create: {
        email,
        passwordHash,
        name: "Lead Developer",
        roleId: adminRole.id,
        isActive: true,
      },
    });

    console.log(`[${dbName}] Developer user successfully provisioned: ${user.email} (ID: ${user.id}) with Admin role (${adminRole.name})`);
  } catch (err) {
    console.error(`[${dbName}] Error provisioning developer user:`, err.message);
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
