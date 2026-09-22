const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "muhammad.murtaazaa@gmail.com";
  const rawPassword = "murt@1234";

  // Find Admin role
  const adminRole = await prisma.role.findFirst({
    where: {
      name: { in: ["Admin", "admin", "Super Admin"] },
    },
  });

  if (!adminRole) {
    console.error("Admin role not found!");
    process.exit(1);
  }

  const passwordHash = bcrypt.hashSync(rawPassword, 10);

  const user = await prisma.user.upsert({
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

  console.log(`Developer user successfully provisioned: ${user.email} (ID: ${user.id}) with Admin role (${adminRole.name})`);
}

main()
  .catch((e) => {
    console.error("Error provisioning developer user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
