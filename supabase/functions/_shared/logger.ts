
/**
 * Simple logger for Supabase Edge Functions.
 * Adds the function name and optional trace ID to each log entry.
 */
export function createLogger(functionName: string, traceId?: string) {
  const prefix = traceId
    ? `[${functionName}][${traceId}]`
    : `[${functionName}]`;
  return {
    debug: (data: any, message?: string) =>
      console.log(`${prefix} DEBUG:`, message || '', data),
    info: (data: any, message?: string) =>
      console.log(`${prefix} INFO:`, message || '', data),
    warn: (data: any, message?: string) =>
      console.warn(`${prefix} WARN:`, message || '', data),
    error: (data: any, message?: string) =>
      console.error(`${prefix} ERROR:`, message || '', data)
  };
}
