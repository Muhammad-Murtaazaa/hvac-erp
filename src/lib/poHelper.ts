export interface POMetadata {
  userNotes: string;
  isGst: boolean;
  taxRate: number;
  taxAmount: number;
  discountType: "FIXED" | "PERCENTAGE";
  discountPercent: number;
  discountAmount: number;
  subtotalAmount: number;
  totalAmount: number;
  createdByName?: string;
  deliveryAddress?: string;
}

export function parsePoMetadata(notes: string | null | undefined, po?: any): POMetadata {
  let userNotes = notes || "";
  let isGst = false;
  let taxRate = 18;
  let taxAmount = 0;
  let discountType: "FIXED" | "PERCENTAGE" = "FIXED";
  let discountPercent = 0;
  let discountAmount = po ? Number(po.discount || 0) : 0;
  let subtotalAmount = 0;
  let totalAmount = po ? Number(po.totalAmount || 0) : 0;
  let createdByName = "Saleem";
  let deliveryAddress = "";

  if (notes && typeof notes === "string") {
    const trimmed = notes.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        userNotes = parsed.userNotes !== undefined ? String(parsed.userNotes) : "";
        isGst = Boolean(parsed.isGst);
        taxRate = Number(parsed.taxRate ?? 18);
        taxAmount = Number(parsed.taxAmount ?? 0);
        discountType = parsed.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
        discountPercent = Number(parsed.discountPercent ?? 0);
        if (parsed.discountAmount !== undefined) discountAmount = Number(parsed.discountAmount);
        if (parsed.subtotalAmount !== undefined) subtotalAmount = Number(parsed.subtotalAmount);
        if (parsed.totalAmount !== undefined) totalAmount = Number(parsed.totalAmount);
        if (parsed.createdByName) {
          createdByName = String(parsed.createdByName) === "System Admin" ? "Saleem" : String(parsed.createdByName);
        }
        if (parsed.deliveryAddress) deliveryAddress = String(parsed.deliveryAddress);
      } catch {
        userNotes = notes;
      }
    }
  }

  // Calculate subtotal from line items if not set
  if ((!subtotalAmount || subtotalAmount === 0) && po?.lineItems && Array.isArray(po.lineItems)) {
    subtotalAmount = po.lineItems.reduce(
      (acc: number, item: any) => acc + Number(item.quantityOrdered || 0) * Number(item.unitCost || 0),
      0
    );
  }

  // Calculate discount if percentage
  if (discountType === "PERCENTAGE" && discountPercent > 0 && subtotalAmount > 0) {
    discountAmount = Math.round(subtotalAmount * (discountPercent / 100));
  }

  const taxableAmount = Math.max(0, subtotalAmount - discountAmount);

  if (isGst) {
    taxAmount = Math.round(taxableAmount * (taxRate / 100));
    totalAmount = taxableAmount + taxAmount;
  } else {
    taxAmount = 0;
    totalAmount = taxableAmount;
  }

  return {
    userNotes,
    isGst,
    taxRate,
    taxAmount,
    discountType,
    discountPercent,
    discountAmount,
    subtotalAmount,
    totalAmount,
    createdByName,
    deliveryAddress,
  };
}

export function formatPoNotesPayload(data: {
  userNotes: string;
  isGst: boolean;
  taxRate: number;
  taxAmount: number;
  discountType: "FIXED" | "PERCENTAGE";
  discountPercent: number;
  discountAmount: number;
  subtotalAmount: number;
  totalAmount: number;
  createdByName?: string;
  deliveryAddress?: string;
}): string {
  return JSON.stringify({
    userNotes: data.userNotes || "",
    isGst: Boolean(data.isGst),
    taxRate: Number(data.taxRate || 18),
    taxAmount: Number(data.taxAmount || 0),
    discountType: data.discountType || "FIXED",
    discountPercent: Number(data.discountPercent || 0),
    discountAmount: Number(data.discountAmount || 0),
    subtotalAmount: Number(data.subtotalAmount || 0),
    totalAmount: Number(data.totalAmount || 0),
    createdByName: (data.createdByName === "System Admin" || !data.createdByName) ? "Saleem" : data.createdByName,
    deliveryAddress: data.deliveryAddress || "",
  });
}
