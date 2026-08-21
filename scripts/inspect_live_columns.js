const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function inspectColumns() {
  const cols = await prisma.$queryRaw`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name IN ('Account', 'JournalEntry', 'JournalLine')
    ORDER BY table_name, ordinal_position;
  `;
  console.table(cols);
}

inspectColumns()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
