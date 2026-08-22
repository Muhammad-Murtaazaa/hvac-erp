const jwt = require('jsonwebtoken');
const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'hvac-erp-very-secret-jwt-key-2026-08-06';
const PROD_URL = 'https://erp.technicool.com.pk';

async function verifyProduction() {
  console.log('========================================================================');
  console.log('PHASE 10: POST-DEPLOYMENT PRODUCTION LIVE VERIFICATION');
  console.log('Target:', PROD_URL);
  console.log('========================================================================\n');

  const admin = await prisma.user.findFirst({ where: { isActive: true } });
  if (!admin) throw new Error('No active user found');

  // Sign token
  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 1. Check Trial Balance
  console.log('--- 1. Testing Production Trial Balance (/api/finance/journal/trial-balance) ---');
  try {
    const tbRes = await fetch(`${PROD_URL}/api/finance/journal/trial-balance`, { headers });
    console.log('HTTP Status:', tbRes.status);
    const tbJson = await tbRes.json();
    console.log('Trial Balance Summary:', {
      accountsCount: tbJson.trialBalance ? tbJson.trialBalance.length : 0,
      totalDebit: tbJson.totals ? `PKR ${tbJson.totals.totalDebit.toLocaleString()}` : 'N/A',
      totalCredit: tbJson.totals ? `PKR ${tbJson.totals.totalCredit.toLocaleString()}` : 'N/A',
      isBalanced: tbJson.totals ? tbJson.totals.isBalanced : false,
    });
    if (tbJson.trialBalance) {
      console.table(tbJson.trialBalance.filter(a => a.totalDebit > 0 || a.totalCredit > 0).map(a => ({
        Account: a.name,
        Type: a.type,
        TotalDebit: `PKR ${a.totalDebit.toLocaleString()}`,
        TotalCredit: `PKR ${a.totalCredit.toLocaleString()}`,
        NetDebit: `PKR ${a.netDebit.toLocaleString()}`,
        NetCredit: `PKR ${a.netCredit.toLocaleString()}`,
        LineCount: a.lineCount,
      })));
    }
  } catch (e) {
    console.error('Trial Balance error:', e.message);
  }

  // 2. Check General Journal
  console.log('\n--- 2. Testing Production General Journal (/api/finance/journal) ---');
  try {
    const jRes = await fetch(`${PROD_URL}/api/finance/journal`, { headers });
    console.log('HTTP Status:', jRes.status);
    const jJson = await jRes.json();
    console.log('Journal Entries Committed on Production:', jJson.totalCount || (jJson.entries ? jJson.entries.length : 0));
    if (jJson.entries && jJson.entries.length > 0) {
      console.log('Committed Production Entries:');
      jJson.entries.forEach((e, idx) => {
        console.log(`  [#${idx + 1}] ${e.idempotencyKey} | ${e.sourceType} | ${e.narration}`);
      });
    }
  } catch (e) {
    console.error('Journal query error:', e.message);
  }

  // 3. Check Party Ledger for Customer FRESHCO
  console.log('\n--- 3. Testing Production Party Ledger for FRESHCO (/api/finance/journal/party-ledger) ---');
  try {
    const freshco = await prisma.customer.findFirst({
      where: { name: { contains: 'FRESHCO', mode: 'insensitive' } },
    });
    if (freshco) {
      const plRes = await fetch(`${PROD_URL}/api/finance/journal/party-ledger?partyType=CUSTOMER&partyId=${freshco.id}`, { headers });
      console.log('HTTP Status:', plRes.status);
      const plJson = await plRes.json();
      console.log('Party Statement for:', plJson.party ? plJson.party.name : freshco.name);
      console.log('Balances:', {
        totalDebit: plJson.totalDebit,
        totalCredit: plJson.totalCredit,
        closingBalance: plJson.closingBalance,
        transactionsCount: plJson.transactions ? plJson.transactions.length : 0,
      });
      if (plJson.transactions) {
        console.table(plJson.transactions.map(t => ({
          Date: t.date ? t.date.slice(0,10) : '',
          Narration: t.narration,
          Account: t.accountName,
          Debit: t.debit,
          Credit: t.credit,
          RunningBalance: t.runningBalance,
        })));
      }
    }
  } catch (e) {
    console.error('Party Ledger error:', e.message);
  }
}

verifyProduction()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
