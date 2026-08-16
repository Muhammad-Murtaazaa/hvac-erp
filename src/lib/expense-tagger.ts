export type ExpenseCategory =
  | "PARTS_INVENTORY"
  | "SALARY_PAYROLL"
  | "FUEL_TRANSPORT"
  | "OFFICE_UTILITIES"
  | "TOOLS_MAINTENANCE"
  | "OTHER_OPERATING";

export interface TaggedExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  categoryLabel: string;
  referenceType: string;
  referenceId: string;
}

export function autoTagExpense(desc: string, referenceType = ""): { category: ExpenseCategory; label: string } {
  const lower = (desc + " " + referenceType).toLowerCase();

  if (
    referenceType === "PAYROLL" ||
    lower.includes("salary") ||
    lower.includes("payroll") ||
    lower.includes("wage") ||
    lower.includes("allowance")
  ) {
    return { category: "SALARY_PAYROLL", label: "Salaries & Technician Payroll" };
  }

  if (
    referenceType === "PO_RECEIPT" ||
    lower.includes("compressor") ||
    lower.includes("motor") ||
    lower.includes("capacitor") ||
    lower.includes("copper") ||
    lower.includes("refrigerant") ||
    lower.includes("part") ||
    lower.includes("inventory") ||
    lower.includes("stock")
  ) {
    return { category: "PARTS_INVENTORY", label: "HVAC Parts & Inventory Purchases" };
  }

  if (
    lower.includes("fuel") ||
    lower.includes("petrol") ||
    lower.includes("diesel") ||
    lower.includes("transport") ||
    lower.includes("cargo") ||
    lower.includes("bus") ||
    lower.includes("vehicle") ||
    lower.includes("van")
  ) {
    return { category: "FUEL_TRANSPORT", label: "Fuel & Fleet Logistics" };
  }

  if (
    lower.includes("tool") ||
    lower.includes("gauge") ||
    lower.includes("pump") ||
    lower.includes("meter") ||
    lower.includes("welding") ||
    lower.includes("cylinder")
  ) {
    return { category: "TOOLS_MAINTENANCE", label: "Equipment, Tools & Machinery" };
  }

  if (
    lower.includes("rent") ||
    lower.includes("electric") ||
    lower.includes("utility") ||
    lower.includes("bill") ||
    lower.includes("internet") ||
    lower.includes("office") ||
    lower.includes("refreshment")
  ) {
    return { category: "OFFICE_UTILITIES", label: "Office Rent & Utilities" };
  }

  return { category: "OTHER_OPERATING", label: "General Operating Expenses" };
}
