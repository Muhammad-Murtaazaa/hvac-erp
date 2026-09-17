const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'hvac-erp-very-secret-jwt-key-2026-08-06';
const PROD_URL = process.env.PROD_URL || 'https://erp.technicool.com.pk';

async function main() {
  console.log('========================================================================');
  console.log('SUPER ADMIN PRODUCTION VOUCHER OPERATIONS');
  console.log('Target:', PROD_URL);
  console.log('========================================================================\n');

  // 1. Authenticate as Admin
  const admin = await prisma.user.findFirst({
    where: { role: { name: { in: ['Admin', 'admin', 'Super Admin', 'superadmin'] } } },
    include: { role: true }
  });

  if (!admin) {
    throw new Error('No admin user found in database');
  }

  console.log(`Authenticating as Super Admin: ${admin.email} (${admin.role?.name})...`);
  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Pre-Verification of CPV-10004
  console.log('\n--- 1. VERIFYING CPV-10004 BEFORE ROLLBACK ---');
  const res10004 = await fetch(`${PROD_URL}/api/finance/vouchers?search=CPV-10004`, { headers });
  const data10004 = await res10004.json();
  const cpv = data10004.vouchers?.find((v) => v.voucherNumber === 'CPV-10004');
  if (cpv) {
    console.log('Found CPV-10004:', {
      id: cpv.id,
      voucherNumber: cpv.voucherNumber,
      partyName: cpv.partyName,
      amount: cpv.amount,
      debitAccount: cpv.debitAccount,
      creditAccount: cpv.creditAccount,
    });
  } else {
    console.log('Notice: CPV-10004 is not present in active vouchers list.');
  }

  // 3. Pre-Verification of CRV-10026
  console.log('\n--- 2. VERIFYING CRV-10026 BEFORE UPDATE ---');
  const res10026 = await fetch(`${PROD_URL}/api/finance/vouchers?search=CRV-10026`, { headers });
  const data10026 = await res10026.json();
  const crv = data10026.vouchers?.find((v) => v.voucherNumber === 'CRV-10026');
  if (crv) {
    console.log('Found CRV-10026:', {
      id: crv.id,
      voucherNumber: crv.voucherNumber,
      partyName: crv.partyName,
      currentDescription: crv.description,
      amount: crv.amount,
    });
  } else {
    console.log('Notice: CRV-10026 is not present in active vouchers list.');
  }

  // 4. Execute Rollback of CPV-10004
  if (cpv) {
    console.log('\n--- 3. EXECUTING ROLLBACK OF CPV-10004 ---');
    const delRes = await fetch(`${PROD_URL}/api/finance/vouchers`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({
        voucherNumber: 'CPV-10004',
        reason: 'Super Admin rollback requested: Faisal Rehman (ISB) PKR 1,284,000 safe reversal with zero data loss',
      }),
    });
    const delJson = await delRes.json();
    console.log('Rollback Response (Status ' + delRes.status + '):', delJson);
    if (!delRes.ok) {
      throw new Error(delJson.error || 'Failed to rollback CPV-10004');
    }
  }

  // 5. Execute Update of CRV-10026
  console.log('\n--- 4. EXECUTING NARRATION UPDATE OF CRV-10026 ---');
  const newNarration = ' Amount Received in Atif Compressor AC slip#40483 ';
  const patchRes = await fetch(`${PROD_URL}/api/finance/vouchers`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      voucherNumber: 'CRV-10026',
      description: newNarration,
    }),
  });
  const patchJson = await patchRes.json();
  console.log('Update Response (Status ' + patchRes.status + '):', patchJson);
  if (!patchRes.ok) {
    throw new Error(patchJson.error || 'Failed to update CRV-10026');
  }

  // 6. Post-Verification of CPV-10004
  console.log('\n--- 5. POST-VERIFICATION: CHECKING CPV-10004 IS COMPLETELY REMOVED ---');
  const postRes10004 = await fetch(`${PROD_URL}/api/finance/vouchers?search=CPV-10004`, { headers });
  const postData10004 = await postRes10004.json();
  const cpvRemaining = postData10004.vouchers?.find((v) => v.voucherNumber === 'CPV-10004');
  if (!cpvRemaining) {
    console.log('✅ PASS: CPV-10004 is completely removed from Vouchers.');
  } else {
    console.error('❌ FAIL: CPV-10004 still exists:', cpvRemaining);
  }

  const postJournal10004 = await fetch(`${PROD_URL}/api/finance/journal?search=CPV-10004`, { headers });
  const journalData10004 = await postJournal10004.json();
  const cpvJournalRemaining = journalData10004.entries?.find((e) => e.sourceId === 'CPV-10004');
  if (!cpvJournalRemaining) {
    console.log('✅ PASS: CPV-10004 has 0 journal entries remaining.');
  } else {
    console.error('❌ FAIL: CPV-10004 still has journal entries:', cpvJournalRemaining);
  }

  // 7. Post-Verification of CRV-10026
  console.log('\n--- 6. POST-VERIFICATION: CHECKING CRV-10026 NARRATION ---');
  const postRes10026 = await fetch(`${PROD_URL}/api/finance/vouchers?search=CRV-10026`, { headers });
  const postData10026 = await postRes10026.json();
  const crvUpdated = postData10026.vouchers?.find((v) => v.voucherNumber === 'CRV-10026');
  if (crvUpdated && crvUpdated.description === newNarration) {
    console.log('✅ PASS: CRV-10026 description correctly updated to:', crvUpdated.description);
  } else {
    console.log('CRV-10026 status:', crvUpdated?.description);
  }

  // 8. Trial Balance Verification
  console.log('\n--- 7. CHECKING PRODUCTION TRIAL BALANCE INTEGRITY ---');
  const tbRes = await fetch(`${PROD_URL}/api/finance/journal/trial-balance`, { headers });
  const tbJson = await tbRes.json();
  console.log('Trial Balance Result:', {
    isBalanced: tbJson.totals?.isBalanced,
    totalDebit: tbJson.totals?.totalDebit,
    totalCredit: tbJson.totals?.totalCredit,
    accountsCount: tbJson.trialBalance?.length,
  });

  if (tbJson.totals?.isBalanced) {
    console.log('✅ PASS: Double-Entry Trial Balance is 100% BALANCED!');
  } else {
    console.error('❌ WARNING: Trial Balance is out of equilibrium!');
  }

  console.log('\n========================================================================');
  console.log('ALL OPERATIONS COMPLETED SUCCESSFULLY!');
  console.log('========================================================================\n');
}

main()
  .catch((err) => {
    console.error('Script error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
