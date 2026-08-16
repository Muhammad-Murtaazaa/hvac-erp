import prisma from "./db";

export interface ReportFilter {
  field: string;
  operator: "EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "BETWEEN";
  value: any;
  secondValue?: any;
}

export interface ReportConfig {
  entity: "INVOICE" | "PRODUCT" | "COMPLAINT" | "EMPLOYEE" | "PURCHASE_ORDER";
  fields: string[];
  filters?: ReportFilter[];
  orderBy?: { field: string; direction: "asc" | "desc" };
  limit?: number;
}

const ALLOWED_ENTITY_FIELDS: Record<string, string[]> = {
  INVOICE: ["id", "invoiceNumber", "clientName", "clientPhone", "date", "status", "totalAmount", "amountPaid", "isGst", "createdAt"],
  PRODUCT: ["id", "sku", "name", "category", "unit", "onHandQty", "incomingQty", "reorderLevel", "averageCost", "salesPrice", "createdAt"],
  COMPLAINT: ["id", "complaintNumber", "customerName", "customerPhone", "customerAddress", "description", "remarks", "status", "amount", "amountStatus", "createdAt"],
  EMPLOYEE: ["id", "name", "cnic", "phone", "department", "position", "status", "baseSalary", "joiningDate", "createdAt"],
  PURCHASE_ORDER: ["id", "poNumber", "status", "discount", "totalAmount", "createdAt"],
};

export async function executeDynamicReport(config: ReportConfig) {
  const entityKey = config.entity.toUpperCase();
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

  // Build WHERE clause
  const whereClause: any = {};
  if (config.filters && Array.isArray(config.filters)) {
    for (const filter of config.filters) {
      if (!allowedFields.includes(filter.field)) continue;

      switch (filter.operator) {
        case "EQUALS":
          whereClause[filter.field] = filter.value;
          break;
        case "CONTAINS":
          whereClause[filter.field] = { contains: String(filter.value) };
          break;
        case "GREATER_THAN":
          whereClause[filter.field] = { gte: isNaN(filter.value) ? new Date(filter.value) : Number(filter.value) };
          break;
        case "LESS_THAN":
          whereClause[filter.field] = { lte: isNaN(filter.value) ? new Date(filter.value) : Number(filter.value) };
          break;
        case "BETWEEN":
          whereClause[filter.field] = {
            gte: isNaN(filter.value) ? new Date(filter.value) : Number(filter.value),
            lte: isNaN(filter.secondValue) ? new Date(filter.secondValue) : Number(filter.secondValue),
          };
          break;
      }
    }
  }

  const modelMap: Record<string, any> = {
    INVOICE: prisma.invoice,
    PRODUCT: prisma.product,
    COMPLAINT: prisma.complaint,
    EMPLOYEE: prisma.employee,
    PURCHASE_ORDER: prisma.purchaseOrder,
  };

  const model = modelMap[entityKey];
  const orderBy = config.orderBy && allowedFields.includes(config.orderBy.field)
    ? { [config.orderBy.field]: config.orderBy.direction || "desc" }
    : undefined;

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
