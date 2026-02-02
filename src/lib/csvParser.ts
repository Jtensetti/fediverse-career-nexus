import Papa from 'papaparse';

export interface ParsedCSV<T = Record<string, string>> {
  data: T[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

/**
 * Normalize a column header for flexible matching
 */
export function normalizeColumnHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Full month name map for date parsing
 */
const MONTH_MAP: Record<string, string> = {
  // Full names
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  // Abbreviated names
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Get a column value flexibly by trying multiple possible column names
 */
export function getFlexibleColumn<T extends Record<string, unknown>>(
  row: T,
  possibleNames: string[]
): string | undefined {
  for (const name of possibleNames) {
    const normalizedTarget = normalizeColumnHeader(name);
    for (const key of Object.keys(row)) {
      if (normalizeColumnHeader(key) === normalizedTarget) {
        const value = row[key];
        return typeof value === 'string' ? value : undefined;
      }
    }
  }
  return undefined;
}

/**
 * Parse a CSV string into an array of objects
 */
export function parseCSV<T = Record<string, string>>(
  csvContent: string,
  options?: Papa.ParseConfig
): Promise<ParsedCSV<T>> {
  return new Promise((resolve) => {
    Papa.parse<T>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      ...options,
      complete: (results) => {
        resolve({
          data: results.data,
          errors: results.errors,
          meta: results.meta,
        });
      },
    });
  });
}

/**
 * Parse a date string from LinkedIn format
 * Supports: "Jan 2020", "January 2020", "2020", "2020-01-01"
 */
export function parseLinkedInDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const trimmed = dateStr.trim();
  
  // Try to parse "Month YYYY" format (e.g., "Jan 2020" or "January 2020")
  const monthYearMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const monthLower = monthYearMatch[1].toLowerCase();
    // Try full month name first, then abbreviated
    const month = MONTH_MAP[monthLower] || MONTH_MAP[monthLower.slice(0, 3)];
    if (month) {
      return `${monthYearMatch[2]}-${month}-01`;
    }
  }
  
  // Try to parse just year
  const yearMatch = trimmed.match(/^(\d{4})$/);
  if (yearMatch) {
    return `${yearMatch[1]}-01-01`;
  }
  
  // Try to parse ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  
  // Try to extract year from any format
  const anyYearMatch = trimmed.match(/(\d{4})/);
  if (anyYearMatch) {
    return `${anyYearMatch[1]}-01-01`;
  }
  
  return null;
}

/**
 * Parse a year from a LinkedIn date string
 */
export function parseLinkedInYear(dateStr: string | undefined): number | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const yearMatch = dateStr.match(/(\d{4})/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }
  
  return null;
}

/**
 * Clean and sanitize text content from LinkedIn export
 */
export function cleanText(text: string | undefined): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}
