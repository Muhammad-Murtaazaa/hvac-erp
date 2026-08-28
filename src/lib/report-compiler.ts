import prisma from "./db";

export interface ReportFilter {
  field: string;
  operator: "EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "BETWEEN";
  value: any;
  secondValue?: any;
}

export interface ReportConfig {
  entity: "INVOICE" | "PRODUCT" | "COMPLAINT" | "EMPLOYEE" | "PURCHASE_ORDER" | "CUSTOMER";
  fields: string[];
  filters?: ReportFilter[];
  orderBy?: { field: string; direction: "asc" | "desc" };
  limit?: number;
}

export const ALLOWED_ENTITY_FIELDS: Record<string, string[]> = {
  INVOICE: ["id", "invoiceNumber", "clientName", "clientPhone", "clientAddress", "date", "status", "dispatchStatus", "totalAmount", "amountPaid", "isGst", "subjectHeading", "createdAt"],
  PRODUCT: ["id", "sku", "name", "category", "unit", "onHandQty", "incomingQty", "reorderLevel", "averageCost", "salesPrice", "createdAt"],
  COMPLAINT: ["id", "complaintNumber", "customerName", "customerPhone", "customerAddress", "description", "remarks", "status", "amount", "amountStatus", "date", "createdAt"],
  EMPLOYEE: ["id", "name", "cnic", "phone", "department", "position", "status", "baseSalary", "joiningDate", "createdAt"],
  PURCHASE_ORDER: ["id", "poNumber", "vendorId", "status", "discount", "totalAmount", "notes", "createdAt"],
  CUSTOMER: ["id", "name", "phone", "email", "address", "ntn", "cnic", "notes", "createdAt"],
};

const FIELD_TYPES: Record<string, "NUMBER" | "BOOLEAN" | "DATE" | "STRING"> = {
  // Numerical fields
  totalAmount: "NUMBER",
  amountPaid: "NUMBER",
  amount: "NUMBER",
  discount: "NUMBER",
  baseSalary: "NUMBER",
  onHandQty: "NUMBER",
  incomingQty: "NUMBER",
  reorderLevel: "NUMBER",
  averageCost: "NUMBER",
  salesPrice: "NUMBER",

  // Boolean fields
  isGst: "BOOLEAN",

  // Date fields
  date: "DATE",
  createdAt: "DATE",
  updatedAt: "DATE",
  joiningDate: "DATE",
};

function buildFieldFilter(field: string, operator: string, value: any, secondValue?: any) {
  const type = FIELD_TYPES[field] || "STRING";

  if (type === "NUMBER") {
    const num = Number(value);
    if (isNaN(num)) return null;
    const num2 = secondValue !== undefined && !isNaN(Number(secondValue)) ? Number(secondValue) : num;

    switch (operator) {
      case "EQUALS":
      case "CONTAINS":
        return { equals: num };
      case "GREATER_THAN":
        return { gte: num };
      case "LESS_THAN":
        return { lte: num };
      case "BETWEEN":
        return { gte: Math.min(num, num2), lte: Math.max(num, num2) };
      default:
        return { equals: num };
    }
  }

  if (type === "BOOLEAN") {
    const strVal = String(value).toLowerCase().trim();
    const boolVal = strVal === "true" || strVal === "1" || strVal === "yes" || strVal === "gst";
    return { equals: boolVal };
  }

  if (type === "DATE") {
    const dStr = String(value).trim();
    const startDate = new Date(dStr.includes("T") ? dStr : `${dStr}T00:00:00.000Z`);
    if (isNaN(startDate.getTime())) return null;

    if (operator === "GREATER_THAN") {
      return { gte: startDate };
    }
    if (operator === "LESS_THAN") {
      const endDate = new Date(dStr.includes("T") ? dStr : `${dStr}T23:59:59.999Z`);
      return { lte: endDate };
    }
    if (operator === "BETWEEN") {
      const d2Str = secondValue ? String(secondValue).trim() : dStr;
      let endDate = new Date(d2Str.includes("T") ? d2Str : `${d2Str}T23:59:59.999Z`);
      if (isNaN(endDate.getTime())) endDate = startDate;
      return { gte: startDate, lte: endDate };
    }
    // EQUALS or other
    const endDate = new Date(dStr.includes("T") ? dStr : `${dStr}T23:59:59.999Z`);
    return { gte: startDate, lte: endDate };
  }

  // Default: STRING
  const str = String(value).trim();
  switch (operator) {
    case "EQUALS":
      return { equals: str };
    case "CONTAINS":
      return { contains: str };
    case "GREATER_THAN":
      return { gte: str };
    case "LESS_THAN":
      return { lte: str };
    case "BETWEEN":
      return { gte: str, lte: String(secondValue || str).trim() };
    default:
      return { contains: str };
  }
}

export async function executeDynamicReport(config: ReportConfig) {
  const entityKey = (config.entity || "INVOICE").toUpperCase();
  const allowedFields = ALLOWED_ENTITY_FIELDS[entityKey];

  if (!allowedFields) {
    throw new Error(`Unsupported entity: ${config.entity}`);
  }

  // Sanitize fields
  const selectedFields = (config.fields || []).filter((f) => allowedFields.includes(f));
  const selectClause: Record<string, boolean> = {};
  if (selectedFields.length > 0) {
    for (const f of selectedFields) {
      selectClause[f] = true;
    }
  }

  // Build type-safe WHERE clause
  const whereClause: any = {};
  if (config.filters && Array.isArray(config.filters)) {
    for (const filter of config.filters) {
      if (!filter || !filter.field || filter.value === undefined || filter.value === null || String(filter.value).trim() === "") {
        continue;
      }
      if (!allowedFields.includes(filter.field)) continue;

      const condition = buildFieldFilter(filter.field, filter.operator, filter.value, filter.secondValue);
      if (condition !== null) {
        whereClause[filter.field] = condition;
      }
    }
  }

  const modelMap: Record<string, any> = {
    INVOICE: prisma.invoice,
    PRODUCT: prisma.product,
    COMPLAINT: prisma.complaint,
    EMPLOYEE: prisma.employee,
    PURCHASE_ORDER: prisma.purchaseOrder,
    CUSTOMER: prisma.customer,
  };

  const model = modelMap[entityKey];
  if (!model) {
    throw new Error(`Data model not available for entity: ${entityKey}`);
  }

  const orderBy = config.orderBy && allowedFields.includes(config.orderBy.field)
    ? { [config.orderBy.field]: config.orderBy.direction || "desc" }
    : { createdAt: "desc" };

  const data = await model.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    select: Object.keys(selectClause).length > 0 ? selectClause : undefined,
    orderBy,
    take: config.limit || 500,
  });

  return {
    entity: config.entity,
    totalRecords: data.length,
    fields: selectedFields.length > 0 ? selectedFields : allowedFields,
    data,
  };
}
