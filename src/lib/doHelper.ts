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
