const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchGreenLeaves() {
  const custs = await prisma.customer.findMany({
    where: { name: { contains: 'Green', mode: 'insensitive' } }
  });
  console.log('Customer with Green:', custs);

  const invs = await prisma.invoice.findMany({
    where: {
      OR: [
        { clientName: { contains: 'Green', mode: 'insensitive' } },
        { totalAmount: 238500 }
      ]
    }
  });
  console.log('Invoices matching Green or 238500:', invs.map(i => ({ id: i.id, num: i.invoiceNumber, client: i.clientName, total: i.totalAmount, notes: i.notes })));
}

searchGreenLeaves()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
