const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = 'hvac-erp-very-secret-jwt-key-2026-08-06';
const PROD_URL = 'https://erp.technicool.com.pk';

async function queryRolesAndUsers() {
  const users = await prisma.user.findMany({ include: { role: true } });
  const admin = users.find(u => u.role?.name?.toLowerCase() === 'admin');

  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const resRoles = await fetch(`${PROD_URL}/api/settings/roles`, { headers });
  const dataRoles = await resRoles.json();
  console.log('--- PROD ROLES ---');
  console.log(JSON.stringify(dataRoles.roles?.map(r => ({ id: r.id, name: r.name, perms: r.permissions?.length })), null, 2));

  const resUsers = await fetch(`${PROD_URL}/api/settings/users`, { headers });
  const dataUsers = await resUsers.json();
  console.log('--- PROD USERS ---');
  console.log(JSON.stringify(dataUsers.users?.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role?.name, isActive: u.isActive })), null, 2));
}

queryRolesAndUsers().catch(console.error).finally(() => prisma.$disconnect());
