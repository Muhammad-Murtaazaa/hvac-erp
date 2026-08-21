const path = require('path');
const { PrismaClient } = require(path.join(process.cwd(), 'node_modules', '@prisma/client'));
const prisma = new PrismaClient();

async function inspectReferences() {
  const grn = await prisma.goodsReceivedNote.findUnique({
    where: { id: 'b43587cf-b5cf-4fcf-9fd9-3389660d92f9' },
    include: { purchaseOrder: { include: { vendor: true } } }
  });
  console.log('GRN lookup:', grn ? {
    id: grn.id,
    grnNumber: grn.grnNumber,
    vendor: grn.purchaseOrder?.vendor?.name,
    vendorId: grn.purchaseOrder?.vendor?.id
  } : 'Not found');

  const invoice = await prisma.invoice.findUnique({
    where: { id: '9e68430b-9170-4bac-9a85-4dc9237e28a0' },
    include: { customer: true }
  });
  console.log('Invoice lookup:', invoice ? {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.clientName,
    customerId: invoice.customerId,
    customerName: invoice.customer?.name
  } : 'Not found');
}

inspectReferences()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
