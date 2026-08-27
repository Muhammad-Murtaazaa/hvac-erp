/**
 * Universal Date Handling Utilities for HVAC ERP
 * Eliminates timezone shift / 1-day behind bugs across local client, server, DB, and PDF generation.
 */

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's LOCAL timezone.
 * Avoids the UTC-offset bug inherent to `new Date().toISOString().split("T")[0]`.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Safely formats any date/string input for HTML `<input type="date">` fields (YYYY-MM-DD).
 * Ensures consistency without timezone shifting.
 */
export function formatDateForInput(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return getLocalDateString();
  
  if (typeof dateInput === "string") {
    // If it starts with YYYY-MM-DD, extract it directly to prevent timezone shift
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return getLocalDateString();
  return getLocalDateString(d);
}

/**
 * Formats a date for UI display or PDF export (defaults to DD/MM/YYYY 'en-GB' format).
 * Safely handles strings with UTC midnight (T00:00:00.000Z) or date-only format (YYYY-MM-DD)
 * so they NEVER render as the previous day in timezones behind UTC (e.g. UTC-5).
 */
export function formatDateDisplay(
  dateInput: string | Date | null | undefined,
  locale: string = "en-GB"
): string {
  if (!dateInput) return "-";

  if (typeof dateInput === "string") {
    // Match standard YYYY-MM-DD pattern
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);

      if (locale === "en-GB") {
        return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
      } else if (locale === "en-US") {
        return `${month}/${day}/${year}`;
      } else {
        // Construct local date without timezone offset
        return new Date(year, month - 1, day).toLocaleDateString(locale);
      }
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(locale);
}

/**
 * Parses an incoming date string or Date object for database storage.
 * If given a date-only string (e.g. "2026-08-27"), sets the time to midday UTC (12:00:00.000Z).
 * Midday UTC guarantees the date stays on the exact same calendar day across ALL world timezones (UTC-11 to UTC+12).
 */
export function parseDateForStorage(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) return new Date();

  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00.000Z`);
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date();
  return d;
}
