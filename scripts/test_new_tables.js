const path = require('path');
const { PrismaClient } = require(path.join(process.cwd(), 'node_modules', '@prisma/client'));
const prisma = new PrismaClient();

async function testNewTables() {
  const accounts = await prisma.$queryRaw`SELECT count(*) FROM "Account"`;
  const journalEntries = await prisma.$queryRaw`SELECT count(*) FROM "JournalEntry"`;
  const journalLines = await prisma.$queryRaw`SELECT count(*) FROM "JournalLine"`;
  console.log('Tables exist in branch DB:', { accounts, journalEntries, journalLines });
}

testNewTables()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
