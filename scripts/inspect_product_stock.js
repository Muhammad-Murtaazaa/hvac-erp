const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectProductStock() {
  const p = await prisma.product.findUnique({
    where: { sku: 'MID-008' },
    include: {
      stockLedgerLogs: { orderBy: { timestamp: 'asc' } },
      doLineItems: { include: { deliveryOrder: true } },
      invoiceLineItems: { include: { invoice: true } },
      grnLineItems: { include: { goodsReceivedNote: true } }
    }
  });

  console.log('Product MID-008:', {
    onHand: p.onHandQty,
    cost: p.averageCost,
    createdAt: p.createdAt,
    stockLedgerLogs: p.stockLedgerLogs.map(l => ({ type: l.type, qty: l.quantity, ref: l.referenceDoc, runBal: l.runningBalance, date: l.timestamp })),
    grns: p.grnLineItems.map(g => ({ grn: g.goodsReceivedNote.grnNumber, qty: g.quantityReceived, cost: g.unitCost })),
    dos: p.doLineItems.map(d => ({ do: d.deliveryOrder.doNumber, status: d.deliveryOrder.status, qty: d.quantity })),
    invoices: p.invoiceLineItems.map(i => ({ inv: i.invoice.invoiceNumber, qty: i.quantity, status: i.invoice.dispatchStatus }))
  });
}

inspectProductStock()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
