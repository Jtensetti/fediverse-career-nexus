/**
 * Lightweight logger.
 *
 * - `debug` / `info` / `warn` are silenced in production builds to keep the
 *   shipped bundle and end-user devtools clean.
 * - `error` always logs so production exceptions remain visible (and can be
 *   forwarded to monitoring later).
 *
 * This is a drop-in replacement for `console.*` calls used purely for
 * developer diagnostics. Do not use it for user-facing messages — use
 * `toast` for that.
 */

const isProd = import.meta.env.PROD;

type LogArgs = Parameters<typeof console.log>;

export const logger = {
  debug: (...args: LogArgs) => {
    if (!isProd) console.debug(...args);
  },
  info: (...args: LogArgs) => {
    if (!isProd) console.info(...args);
  },
  warn: (...args: LogArgs) => {
    if (!isProd) console.warn(...args);
  },
  error: (...args: LogArgs) => {
    // Always surface errors, even in production.
    console.error(...args);
  },
};

export default logger;
