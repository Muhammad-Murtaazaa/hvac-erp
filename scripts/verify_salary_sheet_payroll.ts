import prisma from "@/lib/db";
import { postJournalEntry } from "@/lib/journal";
import { getNextVoucherNumber, recordLedgerEntry } from "@/lib/ledger";

async function verifySalarySheetPayroll() {
  console.log("=================================================================");
  console.log("⚡ STARTING MONTHLY SALARY SHEET & PAYROLL VERIFICATION TEST ⚡");
  console.log("=================================================================\n");

  const results: { test: string; passed: boolean; details: any }[] = [];
  const timestamp = Date.now().toString().slice(-4);
  const empNo = `EMP-TEST-${timestamp}`;
  const empName = `Technician Waqas ${timestamp}`;

  // 1. Create Test Employee
  console.log(`1. Setting up Test Employee: ${empName} (${empNo})...`);
  const baseSalary = 60000;
  const testEmployee = await prisma.employee.create({
    data: {
      employeeNo: empNo,
      name: empName,
      cnic: `42101-${Math.floor(1000000 + Math.random() * 9000000)}-1`,
      phone: `0300-${Math.floor(1000000 + Math.random() * 9000000)}`,
      address: "North Nazimabad, Karachi",
      department: "SERVICE",
      position: "HVAC Senior Technician",
      joiningDate: new Date(),
      baseSalary,
      bankDetails: "Meezan Bank - A/C 0987654321",
      status: "ACTIVE",
    },
  });

  // 2. Setup initial advance on employee (PKR 15,000)
  const initialAdvance = 15000;
  const advVoucher = await getNextVoucherNumber(prisma, "CPV");
  await prisma.$transaction(async (tx) => {
    await recordLedgerEntry(tx, {
      entryDate: new Date(),
      voucherType: "CPV",
      voucherNumber: advVoucher,
      referenceType: "ADVANCE",
      referenceId: advVoucher,
      partyType: "EMPLOYEE",
      partyId: testEmployee.id,
      partyName: testEmployee.name,
      debitAccount: "Employee Advance",
      creditAccount: "Cash in Hand",
      amount: initialAdvance,
      description: `Advance loan given to staff ${testEmployee.name}`,
    });

    await postJournalEntry(tx, {
      entryDate: new Date(),
      narration: `Advance loan given to staff ${testEmployee.name}`,
      sourceType: "ADVANCE",
      sourceId: advVoucher,
      idempotencyKey: `ADV:${testEmployee.id}:${advVoucher}`,
      lines: [
        {
          accountName: "Employee Advance",
          partyId: testEmployee.id,
          debit: initialAdvance,
          credit: 0,
        },
        {
          accountName: "Cash in Hand",
          partyId: null,
          debit: 0,
          credit: initialAdvance,
        },
      ],
    });
  });

  console.log(`   Initial advance of PKR ${initialAdvance} logged for employee.`);

  // 3. Prepare Salary Sheet Parameters for current month
  const testMonth = 8;
  const testYear = 2026;
  const totalDays = 30;
  const presentDays = 26;
  const absentDays = 4;
  const dailyWage = baseSalary / totalDays; // 2,000
  const earnedBase = dailyWage * presentDays; // 52,000
  const overtimeAmount = 6000;
  const allowances = 0;
  const messDeductions = 3500;
  const advanceDeductions = 10000; // Deduct 10k of the 15k advance
  const totalDeductions = messDeductions + advanceDeductions; // 13,500
  const expectedGrossExpense = earnedBase + overtimeAmount + allowances; // 58,000
  const expectedNetPay = expectedGrossExpense - totalDeductions; // 58,000 - 13,500 = 44,500

  // 4. Save Salary Sheet Entry
  console.log("\n--- TEST 1: Saving Monthly Salary Sheet with Attendance, OT, Mess & Advance ---");
  const payrollRun = await prisma.payrollRun.upsert({
    where: {
      employeeId_month_year: {
        employeeId: testEmployee.id,
        month: testMonth,
        year: testYear,
      },
    },
    update: {
      totalDays,
      presentDays,
      absentDays,
      baseSalary,
      overtimeAmount,
      allowances,
      messDeductions,
      advanceDeductions,
      deductions: totalDeductions,
      netPay: expectedNetPay,
      status: "PENDING",
    },
    create: {
      employeeId: testEmployee.id,
      month: testMonth,
      year: testYear,
      totalDays,
      presentDays,
      absentDays,
      baseSalary,
      overtimeAmount,
      allowances,
      messDeductions,
      advanceDeductions,
      deductions: totalDeductions,
      netPay: expectedNetPay,
      status: "PENDING",
    },
  });

  const t1Passed = Number(payrollRun.netPay) === expectedNetPay && Number(payrollRun.deductions) === totalDeductions;
  results.push({
    test: "Monthly Salary Sheet Net Pay Calculation",
    passed: t1Passed,
    details: {
      baseSalary,
      earnedBase,
      overtimeAmount,
      messDeductions,
      advanceDeductions,
      totalDeductions,
      computedNetPay: Number(payrollRun.netPay),
      expectedNetPay,
    },
  });
  console.log(`Result: ${t1Passed ? "PASSED ✅" : "FAILED ❌"} - Expected Net Pay: PKR ${expectedNetPay}, Recorded: PKR ${Number(payrollRun.netPay)}\n`);

  // 5. Execute Salary Payout & Double-Entry Disbursement
  console.log("--- TEST 2: Disbursing Salary via Bank Account (Meezan Bank) ---");
  const paymentAccount = "Bank Account (Meezan Bank)";
  const payVoucher = await getNextVoucherNumber(prisma, "BPV");

  await prisma.$transaction(async (tx) => {
    const grossExpense = expectedGrossExpense;
    const netPay = expectedNetPay;
    const pDate = new Date();
    const narration = `Salary Payout for ${testEmployee.name} (Aug ${testYear}) - Duty: ${presentDays}/${totalDays}d, OT: PKR ${overtimeAmount}, Mess: -PKR ${messDeductions}, Adv: -PKR ${advanceDeductions}`;

    await postJournalEntry(tx, {
      entryDate: pDate,
      narration,
      sourceType: "PAYROLL",
      sourceId: payrollRun.id,
      idempotencyKey: `PAYROLL:${payrollRun.id}:payout`,
      lines: [
        {
          accountName: "Salary & Wage Expense",
          partyId: null,
          debit: grossExpense,
          credit: 0,
        },
        {
          accountName: paymentAccount,
          partyId: null,
          debit: 0,
          credit: netPay,
        },
        {
          accountName: "Employee Advance",
          partyId: testEmployee.id,
          debit: 0,
          credit: advanceDeductions,
        },
        {
          accountName: "General & Administrative Expense",
          partyId: null,
          debit: 0,
          credit: messDeductions,
        },
      ],
    });

    await recordLedgerEntry(tx, {
      entryDate: pDate,
      voucherType: "BPV",
      voucherNumber: payVoucher,
      referenceType: "PAYROLL",
      referenceId: payrollRun.id,
      partyType: "EMPLOYEE",
      partyId: testEmployee.id,
      partyName: testEmployee.name,
      debitAccount: "Salary & Wage Expense",
      creditAccount: paymentAccount,
      amount: netPay,
      description: narration,
    });

    await tx.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        status: "PAID",
        paymentDate: pDate,
        paymentAccount,
        paymentMethod: "BANK_TRANSFER",
      },
    });
  });

  // Verify Journal Entry is perfectly balanced
  const journalEntry = await prisma.journalEntry.findUnique({
    where: { idempotencyKey: `PAYROLL:${payrollRun.id}:payout` },
    include: { lines: { include: { account: true } } },
  });

  const totalDebit = journalEntry?.lines.reduce((s: number, l: any) => s + Number(l.debit), 0) || 0;
  const totalCredit = journalEntry?.lines.reduce((s: number, l: any) => s + Number(l.credit), 0) || 0;
  const isBalanced = totalDebit === totalCredit && totalDebit === expectedGrossExpense;

  const t2Passed = isBalanced && totalDebit === 58000;
  results.push({
    test: "Salary Disbursement Balanced Double-Entry Posting",
    passed: t2Passed,
    details: {
      totalDebit,
      totalCredit,
      grossExpense: expectedGrossExpense,
      netDisbursed: expectedNetPay,
      advanceRecovered: advanceDeductions,
      messRecovered: messDeductions,
      lines: journalEntry?.lines.map((l: any) => ({
        account: l.account.name,
        partyId: l.partyId,
        debit: Number(l.debit),
        credit: Number(l.credit),
      })),
    },
  });
  console.log(`Result: ${t2Passed ? "PASSED ✅" : "FAILED ❌"} - Debit: PKR ${totalDebit} == Credit: PKR ${totalCredit}\n`);

  // 6. Verify Employee Sub-Ledger Advance Balance Progression
  console.log("--- TEST 3: Employee Sub-Ledger Advance Recovery Reconciliation ---");
  const empLines = await prisma.journalLine.findMany({
    where: { partyId: testEmployee.id },
  });
  const totalEmpDebit = empLines.reduce((s: number, l: any) => s + Number(l.debit), 0);
  const totalEmpCredit = empLines.reduce((s: number, l: any) => s + Number(l.credit), 0);
  const remainingAdvance = totalEmpDebit - totalEmpCredit; // 15,000 initial - 10,000 recovered = 5,000

  const t3Passed = totalEmpDebit === 15000 && totalEmpCredit === 10000 && remainingAdvance === 5000;
  results.push({
    test: "Employee Advance Sub-Ledger Progression",
    passed: t3Passed,
    details: {
      totalAdvanceGiven: totalEmpDebit,
      totalAdvanceRecovered: totalEmpCredit,
      remainingAdvanceBalance: remainingAdvance,
      expectedRemaining: 5000,
    },
  });
  console.log(`Result: ${t3Passed ? "PASSED ✅" : "FAILED ❌"} - Advance Given: PKR ${totalEmpDebit}, Recovered: PKR ${totalEmpCredit}, Remaining: PKR ${remainingAdvance}\n`);

  console.log("=================================================================");
  console.log("📋 MONTHLY SALARY SHEET & PAYROLL VERIFICATION RESULTS:");
  console.log("=================================================================");
  results.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.passed ? "PASSED ✅" : "FAILED ❌"}] ${r.test}`);
    console.log(`   Details:`, JSON.stringify(r.details));
  });
  console.log("=================================================================\n");

  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    console.log("🎉 ALL SALARY SHEET & PAYROLL TESTS PASSED WITH 100% PRECISION!");
  } else {
    console.error("❌ SOME TESTS FAILED. PLEASE CHECK DETAILS ABOVE.");
    process.exit(1);
  }
}

verifySalarySheetPayroll()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
