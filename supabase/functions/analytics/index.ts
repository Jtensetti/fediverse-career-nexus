import { createLogger } from "../_shared/logger.ts";
import { adminHandler } from "../_shared/user-auth.ts";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { z } from "npm:zod@3.25.76";

// Common headers to be used by all endpoints
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature, digest, date, host',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

import { validateRequest } from "../_shared/validate.ts";

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);


const logRequest = (logger: any, req: Request) => {
  logger.info({ method: req.method, url: req.url }, "Incoming request");
};

const logResponse = (logger: any, status: number, startTime: number) => {
  const duration = performance.now() - startTime;
  logger.info({ status, duration: `${duration.toFixed(2)}ms` }, "Request completed");
};

// Define the schema for analytics requests
const analyticsSchema = z.object({
  action: z.enum([
    "getMetricsByHost",
    "getTopFailingHosts",
    "getRateLimitedHosts",
    "getSummary"
  ], {
    required_error: "Action is required",
    invalid_type_error: "Invalid action type"
  }),
  timeframe: z.string().regex(/^\d+h$/, "Timeframe must be in format '24h'").default("24h"),
  limit: z.number().int().positive().default(10)
});

// Type inference from the schema
type AnalyticsRequest = z.infer<typeof analyticsSchema>;

// Handler with validation
const handleAnalytics = async (req: Request, data: AnalyticsRequest): Promise<Response> => {
  const startTime = performance.now();
  const logger = createLogger("analytics");

  logRequest(logger, req);

  try {
    const { action, timeframe, limit } = data;

    logger.debug({ action, timeframe, limit }, "Processing analytics request");

    // Default time window to 24 hours if not specified
    const windowHours = parseInt(timeframe.replace('h', '')) || 24;
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - windowHours);

    let response;

    switch (action) {
      case 'getMetricsByHost':
        response = await getMetricsByHost(limit, logger);
        break;

      case 'getTopFailingHosts':
        response = await getTopFailingHosts(limit, logger);
        break;

      case 'getRateLimitedHosts':
        response = await getRateLimitedHosts(windowStart, 50, logger); // Threshold of 50 requests
        break;

      case 'getSummary':
        response = await getSummary(windowStart, logger);
        break;

      default:
        logger.warn({ action }, "Unknown action requested");
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
    }

    logResponse(logger, 200, startTime);
    return response;
  } catch (error) {
    logger.error({ error: (error instanceof Error ? error.message : "Request failed"), stack: (error instanceof Error ? error.stack : undefined) }, "Error processing analytics request");

    logResponse(logger, 500, startTime);

    return new Response(
      JSON.stringify({ error: "Internal server error", details: (error instanceof Error ? error.message : "Request failed") }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
};

async function getMetricsByHost(limit: number, logger: any) {
  logger.debug({ limit }, "Getting metrics by host");

  const { data, error } = await supabaseClient
    .from('federation_metrics_by_host')
    .select('*')
    .limit(limit);

  if (error) {
    logger.error({ error: (error instanceof Error ? error.message : "Request failed") }, "Failed to fetch metrics by host");
    throw new Error(`Failed to fetch metrics: ${(error instanceof Error ? error.message : "Request failed")}`);
  }

  logger.debug({ resultCount: data?.length }, "Retrieved metrics by host");

  return new Response(
    JSON.stringify({
      hosts: data
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

async function getTopFailingHosts(limit: number, logger: any) {
  logger.debug({ limit }, "Getting top failing hosts");

  const { data, error } = await supabaseClient
    .from('federation_metrics_by_host')
    .select('*')
    .order('failed_requests', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error({ error: (error instanceof Error ? error.message : "Request failed") }, "Failed to fetch failing hosts");
    throw new Error(`Failed to fetch failing hosts: ${(error instanceof Error ? error.message : "Request failed")}`);
  }

  logger.debug({ resultCount: data?.length }, "Retrieved top failing hosts");

  return new Response(
    JSON.stringify({
      hosts: data
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

async function getRateLimitedHosts(windowStart: Date, threshold: number, logger: any) {
  logger.debug({ windowStart: windowStart.toISOString(), threshold }, "Getting rate limited hosts");

  const { data, error } = await supabaseClient
    .rpc('get_rate_limited_hosts', {
      window_start: windowStart.toISOString(),
      request_threshold: threshold
    });

  if (error) {
    logger.error({ error: (error instanceof Error ? error.message : "Request failed") }, "Failed to fetch rate limited hosts");
    throw new Error(`Failed to fetch rate limited hosts: ${(error instanceof Error ? error.message : "Request failed")}`);
  }

  logger.debug({ resultCount: data?.length }, "Retrieved rate limited hosts");

  return new Response(
    JSON.stringify({
      hosts: data,
      threshold: threshold,
      window_start: windowStart.toISOString()
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

async function getSummary(windowStart: Date, logger: any) {
  logger.debug({ windowStart: windowStart.toISOString() }, "Getting federation summary");

  // Get overall stats
  const { data: overallStats, error: statsError } = await supabaseClient
    .from('federation_request_logs')
    .select('success, response_time_ms')
    .gte('timestamp', windowStart.toISOString());

  if (statsError) {
    logger.error({ error: statsError.message }, "Failed to fetch overall stats");
    throw new Error(`Failed to fetch overall stats: ${statsError.message}`);
  }

  // Calculate metrics
  const totalRequests = overallStats.length;
  const successfulRequests = overallStats.filter(log => log.success).length;
  const successPercent = totalRequests > 0 ? (successfulRequests / totalRequests * 100) : 0;

  // Calculate median latency
  const responseTimes = overallStats.map(log => log.response_time_ms).sort((a, b) => a - b);
  const medianLatency = responseTimes.length > 0
    ? responseTimes[Math.floor(responseTimes.length / 2)]
    : 0;

  const summary = {
    total_requests: totalRequests,
    successful_requests: successfulRequests,
    success_percent: successPercent.toFixed(2),
    median_latency_ms: medianLatency,
    window_start: windowStart.toISOString(),
    window_end: new Date().toISOString()
  };

  logger.info(summary, "Generated federation summary");

  return new Response(
    JSON.stringify(summary),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

// Apply validation middleware
Deno.serve(adminHandler(validateRequest(handleAnalytics, analyticsSchema)));
