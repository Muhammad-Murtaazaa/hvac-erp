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
  company?: "TCE" | "TECAIR" | "MTS" | "GREEN_LEAVES";
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
  let company: "TCE" | "TECAIR" | "MTS" | "GREEN_LEAVES" =
    (po?.company === "GREEN_LEAVES" || po?.company === "GREEN LEAVES")
      ? "GREEN_LEAVES"
      : (po?.company === "TECAIR" || po?.company === "MTS")
      ? po.company
      : "TCE";

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
        if (parsed.company === "TECAIR" || parsed.company === "TCE" || parsed.company === "MTS" || parsed.company === "GREEN_LEAVES" || parsed.company === "GREEN LEAVES") {
          company = (parsed.company === "GREEN LEAVES" || parsed.company === "GREEN_LEAVES") ? "GREEN_LEAVES" : parsed.company;
        }
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
    company,
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
  company?: "TCE" | "TECAIR" | "MTS" | "GREEN_LEAVES" | string;
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
    company: (data.company === "GREEN_LEAVES" || data.company === "GREEN LEAVES")
      ? "GREEN_LEAVES"
      : (data.company === "TECAIR" || data.company === "MTS")
      ? data.company
      : "TCE",
  });
}

export function getCompanyDisplayName(company?: string): string {
  switch (company) {
    case "TECAIR":
      return "TecAir";
    case "MTS":
      return "MTS";
    case "GREEN_LEAVES":
      return "Green Leaves Pvt Ltd";
    case "TCE":
    default:
      return "Technicool Engineering";
  }
}

export function getDefaultPoTerms(company?: string): string {
  const comp = getCompanyDisplayName(company);
  return `TERMS & CONDITIONS

1. Order Acceptance: This Purchase Order shall be considered accepted upon written confirmation or commencement of supply/work by the Supplier.
2. Price: The agreed price shall be as mentioned in this Purchase Order or approved quotation. Any change in price shall require prior written approval from ${comp}.
3. Taxes & GST: Applicable taxes/GST, if any, shall be charged strictly as mentioned in this Purchase Order or approved quotation. No GST or other tax shall be added separately unless specifically agreed and mentioned in the PO/quotation.
4. Delivery: The Supplier shall deliver the goods/materials within the agreed delivery period. Any expected delay shall be communicated to ${comp} in advance.
5. Quality: All goods/materials supplied shall be as per the approved quotation, specifications, make, model and agreed quality standards.
6. Inspection: ${comp} reserves the right to inspect the supplied goods/materials. Any defective, damaged or incorrect material may be rejected or returned to the Supplier.
7. Quantity: Goods shall be supplied strictly according to the quantity mentioned in the PO. Any additional quantity requires prior written approval from ${comp}.
8. Warranty: Warranty, where applicable, shall be as per the manufacturer's/Supplier's warranty terms and the terms agreed in the quotation/PO.
9. Documentation: The Supplier shall provide the required invoice, delivery challan, warranty documents, serial numbers and other relevant documents, where applicable.
10. Invoice: The invoice must clearly mention the relevant PO number, item description, quantity, rate, applicable taxes and other agreed details.
11. Payment: Payment shall be made as mutually agreed between both parties.
12. Freight & Transportation: Freight, transportation, loading/unloading and other charges shall be borne by the party as specifically agreed in the PO/quotation.
13. Damaged Material: Any material damaged during transportation due to improper packing or handling shall be the Supplier's responsibility, unless otherwise agreed.
14. Cancellation: ${comp} reserves the right to cancel or modify the PO in case of material delay, non-compliance with specifications, or other agreed contractual reasons.
15. Additional Work/Charges: Any extra work, material or charges outside the scope of this PO shall require prior written approval from ${comp} before execution.
16. PO Applicability: This Purchase Order is issued by ${comp}, as specified on the Purchase Order, and all terms and conditions shall apply accordingly.
17. Discrepancies: In case of any discrepancy between the PO and quotation, the terms specifically mentioned in the Purchase Order shall prevail unless otherwise agreed in writing.`;
}

export function updateTermsCompany(termsText: string, newCompany: string): string {
  if (!termsText || !termsText.trim()) return getDefaultPoTerms(newCompany);
  const targetName = getCompanyDisplayName(newCompany);
  return termsText
    .replace(/Technicool Engineering\s*\/\s*TecAir/gi, targetName)
    .replace(/Technicool Engineering/gi, targetName)
    .replace(/Green Leaves Pvt Ltd/gi, targetName)
    .replace(/TecAir/gi, targetName)
    .replace(/\bMTS\b/g, targetName);
}
