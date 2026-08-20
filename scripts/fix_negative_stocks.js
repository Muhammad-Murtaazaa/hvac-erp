const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixNegativeStocks() {
  console.log("Checking for products with negative stock...");
  
  const negativeProducts = await prisma.product.findMany({
    where: {
      OR: [
        { onHandQty: { lt: 0 } },
        { incomingQty: { lt: 0 } }
      ]
    }
  });

  console.log(`Found ${negativeProducts.length} product(s) with negative quantities.`);

  for (const p of negativeProducts) {
    const fixedOnHand = Math.max(0, p.onHandQty);
    const fixedIncoming = Math.max(0, p.incomingQty);

    await prisma.product.update({
      where: { id: p.id },
      data: {
        onHandQty: fixedOnHand,
        incomingQty: fixedIncoming,
      }
    });

    console.log(`Fixed product ${p.sku} (${p.name}): onHandQty ${p.onHandQty} -> ${fixedOnHand}, incomingQty ${p.incomingQty} -> ${fixedIncoming}`);
  }

  console.log("Stock cleanup completed successfully.");
}

fixNegativeStocks()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
