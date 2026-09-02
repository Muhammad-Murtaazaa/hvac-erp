/**
 * Utility functions for building clean, safe, and standardized PDF filenames across the ERP system.
 * Format: [DocType]_[PartyOrEntityName]_[ReferenceOrPeriod].pdf
 */

export function sanitizeFileNamePart(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/[<>:"/\\|?*\x00-\x1F#%&{}\\<>*?/$!'":@+`|=]/g, " ") // replace illegal characters with space
    .trim()
    .replace(/\s+/g, "_") // replace whitespace sequences with a single underscore
    .replace(/_+/g, "_"); // collapse multiple underscores
}

export interface PdfFileNameOptions {
  docType: string;
  partyName?: string | null;
  reference?: string | null;
  dateOrPeriod?: string | null;
  extension?: boolean;
}

export function buildPdfFileName({
  docType,
  partyName,
  reference,
  dateOrPeriod,
  extension = true,
}: PdfFileNameOptions): string {
  const cleanType = sanitizeFileNamePart(docType) || "Document";
  const cleanParty = sanitizeFileNamePart(partyName);
  const cleanRef = sanitizeFileNamePart(reference);
  const cleanDate = sanitizeFileNamePart(dateOrPeriod);

  const tokens: string[] = [cleanType];

  if (cleanParty) {
    tokens.push(cleanParty);
  }

  if (cleanRef) {
    tokens.push(cleanRef);
  }

  // If dateOrPeriod is provided and not already included inside reference
  if (cleanDate && (!cleanRef || !cleanRef.includes(cleanDate))) {
    tokens.push(cleanDate);
  }

  const baseName = tokens.filter(Boolean).join("_");
  return extension ? `${baseName || "Document"}.pdf` : (baseName || "Document");
}

export function buildContentDispositionHeader(fileName: string, inline = false): string {
  const safeAscii = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const encodedName = encodeURIComponent(fileName);
  const disposition = inline ? "inline" : "attachment";
  return `${disposition}; filename="${safeAscii}"; filename*=UTF-8''${encodedName}`;
}
