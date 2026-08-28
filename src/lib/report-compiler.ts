import prisma from "./db";

export interface ReportFilter {
  field: string;
  operator: "EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "BETWEEN";
  value: any;
  secondValue?: any;
}

export interface ReportConfig {
  entity: "INVOICE" | "PRODUCT" | "COMPLAINT" | "EMPLOYEE" | "PURCHASE_ORDER" | "CUSTOMER" | "GRN";
  fields: string[];
  filters?: ReportFilter[];
  orderBy?: { field: string; direction: "asc" | "desc" };
  limit?: number;
}

export const ALLOWED_ENTITY_FIELDS: Record<string, string[]> = {
  INVOICE: [
    "id",
    "invoiceNumber",
    "clientName",
    "clientPhone",
    "clientAddress",
    "date",
    "status",
    "dispatchStatus",
    "totalAmount",
    "amountPaid",
    "isGst",
    "subjectHeading",
    "createdAt",
  ],
  PRODUCT: [
    "id",
    "sku",
    "name",
    "category",
    "unit",
    "onHandQty",
    "stockStatus",
    "primaryVendor",
    "totalPurchasedQty",
    "totalPurchaseCost",
    "lastPurchaseCost",
    "averageCost",
    "totalSoldQty",
    "totalSalesValue",
    "salesPrice",
    "totalValuation",
    "incomingQty",
    "reorderLevel",
    "createdAt",
  ],
  GRN: [
    "id",
    "grnNumber",
    "poNumber",
    "vendorName",
    "receivedAt",
    "receivedBy",
    "totalUnits",
    "totalValuation",
    "notes",
    "createdAt",
  ],
  PURCHASE_ORDER: [
    "id",
    "poNumber",
    "vendorName",
    "status",
    "totalOrderedQty",
    "totalReceivedQty",
    "discount",
    "totalAmount",
    "notes",
    "createdAt",
  ],
  COMPLAINT: [
    "id",
    "complaintNumber",
    "customerName",
    "customerPhone",
    "customerAddress",
    "description",
    "remarks",
    "status",
    "amount",
    "amountStatus",
    "date",
    "createdAt",
  ],
  EMPLOYEE: [
    "id",
    "name",
    "cnic",
    "phone",
    "department",
    "position",
    "status",
    "baseSalary",
    "joiningDate",
    "createdAt",
  ],
  CUSTOMER: [
    "id",
    "name",
    "phone",
    "email",
    "address",
    "ntn",
    "cnic",
    "notes",
    "createdAt",
  ],
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
  totalPurchasedQty: "NUMBER",
  totalPurchaseCost: "NUMBER",
  lastPurchaseCost: "NUMBER",
  totalSoldQty: "NUMBER",
  totalSalesValue: "NUMBER",
  totalValuation: "NUMBER",
  totalOrderedQty: "NUMBER",
  totalReceivedQty: "NUMBER",
  totalUnits: "NUMBER",

  // Boolean fields
  isGst: "BOOLEAN",

  // Date fields
  date: "DATE",
  receivedAt: "DATE",
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
  const activeFields = selectedFields.length > 0 ? selectedFields : allowedFields;

  // Build type-safe WHERE clause for base Prisma model fields
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

  // Handle PRODUCT entity with full stock, purchase origin & ready inventory enrichment
  if (entityKey === "PRODUCT") {
    // Separate computed filters from direct DB fields
    const directWhere: any = {};
    const computedFilters: ReportFilter[] = [];
    const directFields = ["id", "sku", "name", "category", "unit", "onHandQty", "incomingQty", "reorderLevel", "averageCost", "salesPrice", "createdAt"];
    
    if (config.filters && Array.isArray(config.filters)) {
      for (const filter of config.filters) {
        if (!filter?.field || filter.value === undefined || filter.value === null || String(filter.value).trim() === "") continue;
        if (directFields.includes(filter.field)) {
          const condition = buildFieldFilter(filter.field, filter.operator, filter.value, filter.secondValue);
          if (condition) directWhere[filter.field] = condition;
        } else {
          computedFilters.push(filter);
        }
      }
    }

    const orderBy: any = config.orderBy && directFields.includes(config.orderBy.field)
      ? { [config.orderBy.field]: config.orderBy.direction || "desc" }
      : { onHandQty: "desc" };

    const rawProducts = await (prisma.product as any).findMany({
      where: Object.keys(directWhere).length > 0 ? directWhere : undefined,
      include: {
        poLineItems: {
          include: {
            purchaseOrder: {
              include: {
                vendor: true,
              },
            },
          },
        },
        grnLineItems: {
          include: {
            goodsReceivedNote: {
              include: {
                purchaseOrder: {
                  include: {
                    vendor: true,
                  },
                },
              },
            },
          },
        },
        invoiceLineItems: {
          include: {
            invoice: true,
          },
        },
      },
      orderBy,
      take: config.limit || 500,
    });

    let enrichedData = (rawProducts || []).map((p: any) => {
      const onHand = Number(p.onHandQty || 0);
      const avgCost = Number(p.averageCost || 0);
      const salesPrice = Number(p.salesPrice || 0);
      const reorderLevel = Number(p.reorderLevel || 0);
      const totalValuation = Math.round(onHand * avgCost);

      // Stock Readiness Status
      let stockStatus = "In Stock (Ready)";
      if (onHand <= 0) {
        stockStatus = "Out of Stock (0 Ready)";
      } else if (onHand <= reorderLevel) {
        stockStatus = "Low Stock (Reorder Due)";
      }

      // Compute total purchased & supplier history
      let totalPurchasedQty = 0;
      let totalPurchaseCost = 0;
      let lastPurchaseCost = avgCost;
      let vendorTally: Record<string, { count: number; name: string }> = {};

      (p.grnLineItems || []).forEach((grn: any) => {
        const q = Number(grn.quantityReceived || 0);
        const cost = Number(grn.unitCost || 0);
        totalPurchasedQty += q;
        totalPurchaseCost += q * cost;
        if (cost > 0) lastPurchaseCost = cost;

        const vName = grn.goodsReceivedNote?.purchaseOrder?.vendor?.name;
        if (vName) {
          if (!vendorTally[vName]) vendorTally[vName] = { count: 0, name: vName };
          vendorTally[vName].count += q;
        }
      });

      // Fallback to PO line items if no GRN logs
      if (totalPurchasedQty === 0) {
        (p.poLineItems || []).forEach((poLine: any) => {
          const q = Number(poLine.quantityReceived || poLine.quantityOrdered || 0);
          const cost = Number(poLine.unitCost || 0);
          totalPurchasedQty += q;
          totalPurchaseCost += q * cost;
          if (cost > 0) lastPurchaseCost = cost;

          const vName = poLine.purchaseOrder?.vendor?.name;
          if (vName) {
            if (!vendorTally[vName]) vendorTally[vName] = { count: 0, name: vName };
            vendorTally[vName].count += q;
          }
        });
      }

      // Determine top / primary vendor
      let primaryVendor = "Direct Inventory / Local Supplier";
      const topVendor = Object.values(vendorTally).sort((a, b) => b.count - a.count)[0];
      if (topVendor) {
        primaryVendor = topVendor.name;
      }

      // Compute sales outflow
      let totalSoldQty = 0;
      let totalSalesValue = 0;
      (p.invoiceLineItems || []).forEach((invLine: any) => {
        const q = Number(invLine.quantity || 0);
        const price = Number(invLine.salesPrice || 0);
        totalSoldQty += q;
        totalSalesValue += q * price;
      });

      const row: Record<string, any> = {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        unit: p.unit || "Units",
        onHandQty: onHand,
        stockStatus,
        primaryVendor,
        totalPurchasedQty,
        totalPurchaseCost: Math.round(totalPurchaseCost),
        lastPurchaseCost: Math.round(lastPurchaseCost),
        averageCost: Math.round(avgCost),
        totalSoldQty,
        totalSalesValue: Math.round(totalSalesValue),
        salesPrice: Math.round(salesPrice),
        totalValuation,
        incomingQty: Number(p.incomingQty || 0),
        reorderLevel,
        createdAt: p.createdAt,
      };

      // Filter to only selected fields if specified
      const filteredRow: Record<string, any> = {};
      activeFields.forEach((f) => {
        filteredRow[f] = row[f] !== undefined ? row[f] : null;
      });
      return filteredRow;
    });

    // Apply computed filters in-memory
    if (computedFilters.length > 0) {
      enrichedData = enrichedData.filter((item: any) => {
        return computedFilters.every((filter) => {
          const val = item[filter.field];
          if (val === undefined || val === null) return true;
          const target = filter.value;
          if (typeof val === "string") {
            return filter.operator === "EQUALS"
              ? val.toLowerCase() === String(target).toLowerCase()
              : val.toLowerCase().includes(String(target).toLowerCase());
          }
          if (typeof val === "number") {
            const num = Number(target);
            if (isNaN(num)) return true;
            if (filter.operator === "GREATER_THAN") return val >= num;
            if (filter.operator === "LESS_THAN") return val <= num;
            if (filter.operator === "BETWEEN") {
              const num2 = Number(filter.secondValue ?? num);
              return val >= Math.min(num, num2) && val <= Math.max(num, num2);
            }
            return val === num;
          }
          return true;
        });
      });
    }

    return {
      entity: config.entity,
      totalRecords: enrichedData.length,
      fields: activeFields,
      data: enrichedData,
    };
  }

  // Handle GRN (Stock Intake & Receipts)
  if (entityKey === "GRN") {
    const rawGRNs = await prisma.goodsReceivedNote.findMany({
      include: {
        purchaseOrder: {
          include: {
            vendor: true,
          },
        },
        receivedBy: true,
        lineItems: true,
      },
      orderBy: { receivedAt: "desc" },
      take: config.limit || 500,
    });

    const data = rawGRNs.map((grn) => {
      let totalUnits = 0;
      let totalValuation = 0;
      (grn.lineItems || []).forEach((item) => {
        const q = Number(item.quantityReceived || 0);
        const cost = Number(item.unitCost || 0);
        totalUnits += q;
        totalValuation += q * cost;
      });

      const row: Record<string, any> = {
        id: grn.id,
        grnNumber: grn.grnNumber,
        poNumber: grn.purchaseOrder?.poNumber || "-",
        vendorName: grn.purchaseOrder?.vendor?.name || "Standard Supplier",
        receivedAt: grn.receivedAt,
        receivedBy: grn.receivedBy?.name || "Inventory Manager",
        totalUnits,
        totalValuation: Math.round(totalValuation),
        notes: grn.notes || "-",
        createdAt: grn.receivedAt,
      };

      const filteredRow: Record<string, any> = {};
      activeFields.forEach((f) => {
        filteredRow[f] = row[f] !== undefined ? row[f] : null;
      });
      return filteredRow;
    });

    return {
      entity: config.entity,
      totalRecords: data.length,
      fields: activeFields,
      data,
    };
  }

  // Handle PURCHASE_ORDER entity
  if (entityKey === "PURCHASE_ORDER") {
    const rawPOs = await prisma.purchaseOrder.findMany({
      include: {
        vendor: true,
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
      take: config.limit || 500,
    });

    const data = rawPOs.map((po) => {
      let totalOrderedQty = 0;
      let totalReceivedQty = 0;
      (po.lineItems || []).forEach((item) => {
        totalOrderedQty += Number(item.quantityOrdered || 0);
        totalReceivedQty += Number(item.quantityReceived || 0);
      });

      const row: Record<string, any> = {
        id: po.id,
        poNumber: po.poNumber,
        vendorName: po.vendor?.name || "Direct Vendor",
        status: po.status,
        totalOrderedQty,
        totalReceivedQty,
        discount: Number(po.discount || 0),
        totalAmount: Number(po.totalAmount || 0),
        notes: po.notes || "-",
        createdAt: po.createdAt,
      };

      const filteredRow: Record<string, any> = {};
      activeFields.forEach((f) => {
        filteredRow[f] = row[f] !== undefined ? row[f] : null;
      });
      return filteredRow;
    });

    return {
      entity: config.entity,
      totalRecords: data.length,
      fields: activeFields,
      data,
    };
  }

  // Standard Models (INVOICE, COMPLAINT, EMPLOYEE, CUSTOMER)
  const modelMap: Record<string, any> = {
    INVOICE: prisma.invoice,
    COMPLAINT: prisma.complaint,
    EMPLOYEE: prisma.employee,
    CUSTOMER: prisma.customer,
  };

  const model = modelMap[entityKey];
  if (!model) {
    throw new Error(`Data model not available for entity: ${entityKey}`);
  }

  const orderBy = config.orderBy && allowedFields.includes(config.orderBy.field)
    ? { [config.orderBy.field]: config.orderBy.direction || "desc" }
    : { createdAt: "desc" };

  const selectClause: Record<string, boolean> = {};
  activeFields.forEach((f) => {
    selectClause[f] = true;
  });

  const data = await model.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    select: Object.keys(selectClause).length > 0 ? selectClause : undefined,
    orderBy,
    take: config.limit || 500,
  });

  return {
    entity: config.entity,
    totalRecords: data.length,
    fields: activeFields,
    data,
  };
}
