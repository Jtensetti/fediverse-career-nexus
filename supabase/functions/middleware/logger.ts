
import { pino } from "https://deno.land/x/pino@v4.14.0/mod.ts";
import { pinoLogflare } from "https://esm.sh/pino-logflare@0.4.0";

/**
 * Configures and returns a Pino logger instance with appropriate transport based on available credentials
 * 
 * @returns Configured Pino logger instance
 */
export function createLogger(context = "general", requestId?: string) {
  // Get environment variables
  const logflareSourceId = Deno.env.get("LOGFLARE_SOURCE_ID");
  const logflareApiKey = Deno.env.get("LOGFLARE_API_KEY");
  const sentryDsn = Deno.env.get("SENTRY_DSN");
  
  // Set environment
  const environment = Deno.env.get("ENVIRONMENT") || "development";
  const isProduction = environment === "production";
  
  // Base configuration with JSON output
  const baseConfig = {
    level: isProduction ? "info" : "debug",
    base: {
      environment,
      context,
      requestId,
    },
  };

  // If Logflare credentials are available, configure Logflare transport
  if (logflareSourceId && logflareApiKey) {
    console.log(`Configuring logger with Logflare transport for context: ${context}`);
    
    const stream = pinoLogflare({
      apiKey: logflareApiKey,
      sourceToken: logflareSourceId,
    });

    return pino({
      ...baseConfig,
      browser: {
        transmit: {
          level: isProduction ? "info" : "debug",
          send: (level, logEvent) => {
            // Send log to Logflare
            const headers = {
              "X-Logflare-Source": logflareSourceId,
              "X-API-KEY": logflareApiKey,
              "Content-Type": "application/json",
            };
            
            // Don't wait for the response as this is background logging
            fetch("https://api.logflare.app/logs", {
              method: "POST",
              headers,
              body: JSON.stringify({
                message: logEvent.messages[0],
                metadata: { ...logEvent.bindings[0], level },
              }),
            }).catch(err => {
              console.error("Failed to send logs to Logflare:", err);
            });
          },
        },
      },
    });
  } 
  // If Sentry DSN is available, configure Sentry transport
  else if (sentryDsn) {
    console.log(`Configuring logger with Sentry transport for context: ${context}`);
    
    // Initialize Sentry
    const sentryTransport = {
      target: "pino/file",
      options: { destination: 1 },
      level: isProduction ? "info" : "debug",
    };
    
    const logger = pino({
      ...baseConfig,
      transport: sentryTransport,
    });
    
    // Add a hook to send errors to Sentry
    const originalError = logger.error;
    logger.error = (obj, ...args) => {
      // Send to Sentry
      const dsn = sentryDsn;
      const event = {
        message: typeof obj === 'string' ? obj : JSON.stringify(obj),
        level: 'error',
        extra: typeof obj === 'object' ? obj : { args },
        tags: {
          environment,
          context,
        },
      };
      
      // Don't wait for the response as this is background logging
      fetch(`${new URL(dsn).origin}/api/1/store/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.split('@')[0].split('//')[1]}`
        },
        body: JSON.stringify(event),
      }).catch(err => {
        console.error("Failed to send logs to Sentry:", err);
      });
      
      // Call the original error method
      return originalError.call(logger, obj, ...args);
    };
    
    return logger;
  } 
  // Fallback to console-based JSON logger
  else {
    console.log(`Configuring console JSON logger for context: ${context}`);
    return pino(baseConfig);
  }
}

/**
 * Helper function to create a request-scoped logger with unique request ID
 */
export function createRequestLogger(req: Request, context: string) {
  // Generate unique request ID if not present
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  return createLogger(context, requestId);
}

/**
 * Log request details including method, path, and headers
 */
export function logRequest(logger: any, req: Request) {
  const url = new URL(req.url);
  logger.info({
    type: "request",
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(req.headers),
  }, `${req.method} ${url.pathname}`);
}

/**
 * Log response details including status code and processing time
 */
export function logResponse(logger: any, status: number, startTime: number) {
  const processingTime = performance.now() - startTime;
  logger.info({
    type: "response",
    status,
    processingTime: `${processingTime.toFixed(2)}ms`,
  }, `Response: ${status} (${processingTime.toFixed(2)}ms)`);
}
