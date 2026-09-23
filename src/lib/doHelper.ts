export interface DOMetadata {
  userNotes: string;
  company: "TCE" | "TECAIR" | "MTS" | "GREEN_LEAVES";
}

export function parseDoMetadata(notes: string | null | undefined, doRecord?: any): DOMetadata {
  let userNotes = notes || "";
  let company: "TCE" | "TECAIR" | "MTS" | "GREEN_LEAVES" =
    (doRecord?.company === "GREEN_LEAVES" || doRecord?.company === "GREEN LEAVES")
      ? "GREEN_LEAVES"
      : (doRecord?.company === "TECAIR" || doRecord?.company === "MTS")
      ? doRecord.company
      : "TCE";

  if (notes && typeof notes === "string") {
    const trimmed = notes.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        userNotes = parsed.userNotes !== undefined ? String(parsed.userNotes) : (parsed.notes !== undefined ? String(parsed.notes) : "");
        if (parsed.company === "TECAIR" || parsed.company === "TCE" || parsed.company === "MTS" || parsed.company === "GREEN_LEAVES" || parsed.company === "GREEN LEAVES") {
          company = (parsed.company === "GREEN LEAVES" || parsed.company === "GREEN_LEAVES") ? "GREEN_LEAVES" : parsed.company;
        }
      } catch {
        userNotes = notes;
      }
    }
  }

  return {
    userNotes,
    company,
  };
}

export function formatDoNotesPayload(data: {
  userNotes?: string;
  notes?: string;
  company?: "TCE" | "TECAIR" | "MTS" | "GREEN_LEAVES" | string;
}): string {
  const notesText = data.userNotes !== undefined ? data.userNotes : (data.notes || "");
  const company = (data.company === "GREEN_LEAVES" || data.company === "GREEN LEAVES")
    ? "GREEN_LEAVES"
    : (data.company === "TECAIR" || data.company === "MTS")
    ? data.company
    : "TCE";
  return JSON.stringify({
    userNotes: notesText,
    company,
  });
}

/**
 * Returns the company initials / prefix for Delivery Notes (DN.No):
 * - TCE -> TCE
 * - TECAIR -> TECAIR
 * - MTS -> MTS
 * - GREEN_LEAVES -> GL
 */
export function getCompanyDnPrefix(company?: string | null): "TCE" | "TECAIR" | "MTS" | "GL" {
  const normalized = (company || "").trim().toUpperCase();
  if (normalized === "GREEN_LEAVES" || normalized === "GREEN LEAVES" || normalized === "GL") {
    return "GL";
  }
  if (normalized === "TECAIR" || normalized === "TEC") {
    return "TECAIR";
  }
  if (normalized === "MTS") {
    return "MTS";
  }
  return "TCE";
}

/**
 * Formats a DO number (e.g. "DO-10032" or "10032") into official Delivery Note format matching the letter pad:
 * - TCE: "TCE/10032"
 * - TECAIR: "TECAIR/10032"
 * - MTS: "MTS/10032"
 * - GREEN_LEAVES: "GL/10032"
 */
export function formatDnNumber(doNumber?: string | null, company?: string | null): string {
  if (!doNumber) return "";
  const prefix = getCompanyDnPrefix(company);
  
  // Replace standard DO- prefix (e.g. DO-10032 -> GL/10032, TECAIR/10032, etc.)
  if (doNumber.startsWith("DO-")) {
    return doNumber.replace("DO-", `${prefix}/`);
  }
  
  // If it already has any company prefix (e.g. TCE/10032, GL/10032, etc.), swap prefix to selected company
  const companyPrefixRegex = /^(TCE|TECAIR|TEC|MTS|GL|GREEN LEAVES|GREEN_LEAVES)\//i;
  if (companyPrefixRegex.test(doNumber)) {
    return doNumber.replace(companyPrefixRegex, `${prefix}/`);
  }
  
  // If raw number or other string, prefix with selected letterhead brand
  return `${prefix}/${doNumber}`;
}
