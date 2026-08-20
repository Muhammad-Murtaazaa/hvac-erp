const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  console.log(`Total products: ${products.length}`);
  for (const p of products) {
    console.log(`- ${p.sku}: onHandQty=${p.onHandQty}, incomingQty=${p.incomingQty}`);
    if (p.onHandQty < 0 || p.incomingQty < 0) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          onHandQty: Math.max(0, p.onHandQty),
          incomingQty: Math.max(0, p.incomingQty),
        }
      });
      console.log(`  -> FIXED ${p.sku} to non-negative!`);
    }
  }
}

main().finally(() => prisma.$disconnect());
