import Papa from 'papaparse';

export interface ParsedCSV<T = Record<string, string>> {
  data: T[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
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
 * Parse a date string from LinkedIn format (e.g., "Jan 2020" or "2020")
 */
export function parseLinkedInDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const trimmed = dateStr.trim();
  
  // Try to parse "Mon YYYY" format
  const monthYearMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04',
      may: '05', jun: '06', jul: '07', aug: '08',
      sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const month = monthMap[monthYearMatch[1].toLowerCase().slice(0, 3)];
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
