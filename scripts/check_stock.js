const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStock() {
  console.log('--- Checking Product Stock & Movements ---');
  const products = await prisma.product.findMany({
    include: {
      stockLedgerLogs: true,
      grnLineItems: true,
      doLineItems: true
    }
  });

  console.log(`Total Products: ${products.length}`);
  const issues = [];
  for (const p of products) {
    let grnQty = 0;
    for (const g of p.grnLineItems) grnQty += Number(g.quantityReceived || 0);

    let doQty = 0;
    for (const d of p.doLineItems) doQty += Number(d.quantity || 0);

    let ledgerSum = 0;
    for (const l of p.stockLedgerLogs) {
      if (l.type === 'PO_RECEIPT' || l.type === 'RETURN') {
        ledgerSum += l.quantity;
      } else if (l.type === 'DO_DISPATCH' || l.type === 'SALE' || l.type === 'VENDOR_RETURN') {
        ledgerSum -= l.quantity;
      } else if (l.type === 'MANUAL_ADJUSTMENT') {
        ledgerSum += l.quantity;
      }
    }

    if (p.stockLedgerLogs.length > 0 && ledgerSum !== p.onHandQty) {
      issues.push({
        sku: p.sku,
        name: p.name,
        onHand: p.onHandQty,
        ledgerCalculated: ledgerSum,
        diff: p.onHandQty - ledgerSum
      });
    }
  }

  console.log(`Stock issues: ${issues.length}`);
  if (issues.length > 0) console.log(issues);
}

checkStock()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
