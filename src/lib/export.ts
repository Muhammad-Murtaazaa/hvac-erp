import * as XLSX from "xlsx";

/**
 * Converts an array of objects into a CSV string.
 */
export function convertToCSV(data: Record<string, any>[]): string {
  if (!data || data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map((header) => `"${header.replace(/"/g, '""')}"`).join(","));

  // Data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      if (val === null || val === undefined) return '""';
      if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Converts an array of objects into an Excel (.xlsx) Buffer.
 */
export function convertToExcelBuffer(data: Record<string, any>[], sheetName = "Report"): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
