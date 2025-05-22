
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../middleware/validate.ts";
import { createLogger, logRequest, logResponse } from "../middleware/logger.ts";

const logger = createLogger("healthz");

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: {
      status: "pass" | "warn" | "fail";
      latency_ms: number;
      message?: string;
    };
    queue: {
      status: "pass" | "warn" | "fail";
      pending_count: number;
      max_allowed: number;
      message?: string;
    };
  };
}

serve(async (req) => {
  // Generate a unique trace ID for this request
  const traceId = crypto.randomUUID();
  
  // Set CORS headers and add trace ID
  const headers = { 
    ...corsHeaders, 
    "Content-Type": "application/json",
    "X-Trace-ID": traceId 
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  // Start timer for DB latency measurement
  const startTime = performance.now();
  let healthCheck: HealthCheckResult = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: "fail",
        latency_ms: 0
      },
      queue: {
        status: "fail",
        pending_count: 0,
        max_allowed: 1000 // This threshold can be adjusted based on system capacity
      }
    }
  };
  
  try {
    logger.debug({ traceId }, "Starting health check");
    
    // Check 1: Database connectivity - use a simple query to test
    try {
      const { data, error } = await supabaseClient.rpc('version');
      
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      if (error) {
        throw error;
      }
      
      healthCheck.checks.database = {
        status: latency < 500 ? "pass" : "warn",
        latency_ms: latency,
        message: latency < 500 ? "Database responding normally" : "Database response time slow"
      };
      
      logger.debug({ latency, traceId }, "Database check completed");
    } catch (error) {
      logger.error({ error: error.message, traceId }, "Database check failed");
      healthCheck.checks.database = {
        status: "fail",
        latency_ms: Math.round(performance.now() - startTime),
        message: `Database error: ${error.message}`
      };
      healthCheck.status = "unhealthy";
    }
    
    // Check 2: Queue depth - check pending items in federation queue
    try {
      const { data: queueStats, error: queueError } = await supabaseClient
        .from('federation_queue_stats')
        .select('*');
        
      if (queueError) {
        throw queueError;
      }
      
      const totalPending = queueStats?.reduce((total, stat) => {
        return total + (stat.pending_count || 0);
      }, 0) || 0;
      
      const queueThresholdWarning = 500;
      const queueThresholdError = 1000;
      
      let queueStatus: "pass" | "warn" | "fail" = "pass";
      let queueMessage = "Queue depth normal";
      
      if (totalPending > queueThresholdError) {
        queueStatus = "fail";
        queueMessage = `Queue depth critical: ${totalPending} pending items`;
      } else if (totalPending > queueThresholdWarning) {
        queueStatus = "warn";
        queueMessage = `Queue depth high: ${totalPending} pending items`;
      }
      
      healthCheck.checks.queue = {
        status: queueStatus,
        pending_count: totalPending,
        max_allowed: queueThresholdError,
        message: queueMessage
      };
      
      logger.debug({ pending_count: totalPending, traceId }, "Queue check completed");
      
      // Update overall status if queue is in warning state
      if (queueStatus === "fail" && healthCheck.status === "healthy") {
        healthCheck.status = "unhealthy";
      } else if (queueStatus === "warn" && healthCheck.status === "healthy") {
        healthCheck.status = "degraded";
      }
      
    } catch (error) {
      logger.error({ error: error.message, traceId }, "Queue check failed");
      healthCheck.checks.queue = {
        status: "fail",
        pending_count: 0,
        max_allowed: 1000,
        message: `Queue check error: ${error.message}`
      };
      healthCheck.status = "unhealthy";
    }
    
    logger.info({ 
      health_status: healthCheck.status,
      db_status: healthCheck.checks.database.status,
      queue_status: healthCheck.checks.queue.status,
      traceId
    }, "Health check completed");
    
    // Return appropriate HTTP status code based on health status
    const httpStatus = 
      healthCheck.status === "healthy" ? 200 :
      healthCheck.status === "degraded" ? 200 : 503;
    
    return new Response(
      JSON.stringify(healthCheck),
      { 
        status: httpStatus,
        headers 
      }
    );
    
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack, traceId }, "Health check failed");
    
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        message: "Internal server error",
        traceId
      }),
      { 
        status: 500,
        headers 
      }
    );
  }
});
