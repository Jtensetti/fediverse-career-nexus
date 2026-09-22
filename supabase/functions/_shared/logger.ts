// Only aggregate counters and status codes belong in application logs.
const allowed = new Set(['durationMs', 'duration', 'count', 'processed', 'emailsSent', 'errorsEncountered', 'status', 'partition', 'queueSize', 'limit']);
export function logMetrics(data: unknown): Record<string, number | boolean> {
  if (!data || typeof data !== 'object') return {};
  return Object.fromEntries(Object.entries(data).filter(([key, value]) => allowed.has(key) &&
    (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))))) as Record<string, number | boolean>;
}
export function createLogger(functionName: string, _traceId?: string) {
  const prefix = `[${functionName}]`;
  return {
    debug: (_data: unknown, _message?: string) => {},
    info: (data: unknown, message?: string) => console.info(prefix, message || '', logMetrics(data)),
    warn: (data: unknown, message?: string) => console.warn(prefix, message || '', logMetrics(data)),
    error: (data: unknown, message?: string) => console.error(prefix, message || '', logMetrics(data)),
  };
}
