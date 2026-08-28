export interface InvoiceMetadata {
  userNotes: string;
  isGst: boolean;
  taxRate: number;
  taxAmount: number;
  discountType: "FIXED" | "PERCENTAGE";
  discountPercent: number;
  discountAmount: number;
  subtotalAmount: number;
  totalAmount: number;
  site?: string;
}

export function parseInvoiceMetadata(notes: string | null | undefined, invoice?: any): InvoiceMetadata {
  let userNotes = notes || "";
  let isGst = true;
  let taxRate = 18;
  let taxAmount = 0;
  let discountType: "FIXED" | "PERCENTAGE" = "FIXED";
  let discountPercent = 0;
  let discountAmount = 0;
  let subtotalAmount = 0;
  let totalAmount = invoice ? Number(invoice.totalAmount || 0) : 0;
  let site = invoice?.site ? String(invoice.site) : "";

  if (notes && typeof notes === "string") {
    const trimmed = notes.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        userNotes = parsed.userNotes !== undefined ? String(parsed.userNotes) : "";
        isGst = parsed.isGst !== undefined ? Boolean(parsed.isGst) : (invoice ? Boolean(invoice.isGst) : true);
        taxRate = Number(parsed.taxRate ?? 18);
        taxAmount = Number(parsed.taxAmount ?? 0);
        discountType = parsed.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
        discountPercent = Number(parsed.discountPercent ?? 0);
        if (parsed.discountAmount !== undefined) discountAmount = Number(parsed.discountAmount);
        if (parsed.subtotalAmount !== undefined) subtotalAmount = Number(parsed.subtotalAmount);
        if (parsed.totalAmount !== undefined) totalAmount = Number(parsed.totalAmount);
        if (parsed.site !== undefined && parsed.site !== null) site = String(parsed.site);
      } catch {
        userNotes = notes;
      }
    }
  }

  // Calculate subtotal from line items if not set
  if ((!subtotalAmount || subtotalAmount === 0) && invoice?.lineItems && Array.isArray(invoice.lineItems)) {
    subtotalAmount = invoice.lineItems.reduce(
      (acc: number, item: any) => acc + Number(item.quantity || 0) * Number(item.salesPrice || 0),
      0
    );
  }

  // Calculate discount if percentage
  if (discountType === "PERCENTAGE" && discountPercent > 0 && subtotalAmount > 0) {
    discountAmount = Math.round(subtotalAmount * (discountPercent / 100));
  } else if (discountAmount > 0) {
    discountAmount = Math.min(discountAmount, subtotalAmount);
  }

  const taxableAmount = Math.max(0, subtotalAmount - discountAmount);
  if (isGst && (!taxAmount || taxAmount === 0)) {
    taxAmount = Math.round(taxableAmount * (taxRate / 100));
  }

  if (!totalAmount || totalAmount === 0) {
    totalAmount = Math.round(taxableAmount + (isGst ? taxAmount : 0));
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
    site,
  };
}

export function formatInvoiceNotesPayload(data: {
  userNotes: string;
  isGst: boolean;
  taxRate: number;
  taxAmount: number;
  discountType: "FIXED" | "PERCENTAGE";
  discountPercent: number;
  discountAmount: number;
  subtotalAmount: number;
  totalAmount: number;
  site?: string;
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
    site: data.site ? data.site.trim() : "",
  });
}
