import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { autoTagExpense, ExpenseCategory } from "@/lib/expense-tagger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {
      NOT: {
        OR: [
          { voucherType: "INV" },
          { voucherType: "CRV" },
          { voucherType: "BRV" },
          { creditAccount: "Sales Revenue" },
          { creditAccount: "Service & Maintenance Income" },
        ],
      },
    };
    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.entryDate.lte = end;
      }
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      orderBy: { entryDate: "desc" },
      take: 1000,
    });

    const categoryTotals: Record<ExpenseCategory, { label: string; totalAmount: number; count: number }> = {
      PARTS_INVENTORY: { label: "HVAC Parts & Inventory", totalAmount: 0, count: 0 },
      SALARY_PAYROLL: { label: "Salaries & Payroll", totalAmount: 0, count: 0 },
      FUEL_TRANSPORT: { label: "Fuel & Fleet Logistics", totalAmount: 0, count: 0 },
      OFFICE_UTILITIES: { label: "Office & Utilities", totalAmount: 0, count: 0 },
      TOOLS_MAINTENANCE: { label: "Tools & Equipment", totalAmount: 0, count: 0 },
      OTHER_OPERATING: { label: "Other Operating Expenses", totalAmount: 0, count: 0 },
    };

    const taggedExpenses = entries
      .filter((entry) => {
        const debitLower = (entry.debitAccount || "").toLowerCase();
        const refType = entry.referenceType || "";
        const vType = entry.voucherType || "";

        // Only include true expenses, outflows, COGS, and payroll
        return (
          debitLower.includes("expense") ||
          debitLower.includes("cost of goods sold") ||
          debitLower.includes("rent") ||
          debitLower.includes("utility") ||
          debitLower.includes("salary") ||
          debitLower.includes("logistics") ||
          debitLower.includes("inventory asset") ||
          vType === "CPV" ||
          vType === "BPV" ||
          vType === "COGS" ||
          refType === "PO_RECEIPT" ||
          refType === "PAYROLL"
        );
      })
      .map((entry) => {
        const { category, label } = autoTagExpense(entry.description, entry.referenceType);
        const amt = Number(entry.amount);

        categoryTotals[category].totalAmount += amt;
        categoryTotals[category].count += 1;

        return {
          id: entry.id,
          date: entry.entryDate.toISOString().split("T")[0],
          description: entry.description,
          amount: amt,
          category,
          categoryLabel: label,
          referenceType: entry.referenceType,
          referenceId: entry.referenceId,
        };
      });

    const totalExpenseSum = Object.values(categoryTotals).reduce((acc, cat) => acc + cat.totalAmount, 0);

    return NextResponse.json({
      success: true,
      totalExpenses: totalExpenseSum,
      categories: categoryTotals,
      expenses: taggedExpenses,
    });
  } catch (error: any) {
    console.error("Expense categorization API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
