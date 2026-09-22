const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = 'hvac-erp-very-secret-jwt-key-2026-08-06';
const PROD_URL = 'https://erp.technicool.com.pk';

async function queryProd() {
  const users = await prisma.user.findMany({ include: { role: true } });
  const admin = users.find(u => u.role?.name?.toLowerCase() === 'admin');
  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const res10004 = await fetch(`${PROD_URL}/api/finance/journal?search=CPV-10004`, { headers });
  const data10004 = await res10004.json();
  console.log('--- CPV-10004 JOURNAL ENTRIES ---');
  console.log(JSON.stringify(data10004.entries, null, 2));

  const res10026 = await fetch(`${PROD_URL}/api/finance/journal?search=CRV-10026`, { headers });
  const data10026 = await res10026.json();
  console.log('--- CRV-10026 JOURNAL ENTRIES ---');
  console.log(JSON.stringify(data10026.entries, null, 2));
}

queryProd().catch(console.error).finally(() => prisma.$disconnect());
