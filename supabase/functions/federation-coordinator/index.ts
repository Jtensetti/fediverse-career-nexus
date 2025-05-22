
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, corsHeaders } from "../middleware/validate.ts";
import { createRequestLogger, logRequest, logResponse } from "../middleware/logger.ts";

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Number of partitions to coordinate
const NUM_PARTITIONS = 4;

// Define the schema for the coordinator request
const coordinatorSchema = z.object({
  // Make all fields optional since this endpoint doesn't strictly require parameters
  partition: z.number().int().min(0).max(NUM_PARTITIONS - 1).optional()
});

// Type inference from the schema
type CoordinatorRequest = z.infer<typeof coordinatorSchema>;

async function invokeWorker(partition: number, logger: any) {
  try {
    logger.debug({ partition }, `Invoking worker for partition ${partition}`);
    
    const response = await supabaseClient.functions.invoke("federation", {
      body: { partition }
    });
    
    if (response.error) {
      logger.error({ partition, error: response.error.message }, `Error invoking worker for partition ${partition}`);
    } else {
      logger.info(
        { partition, itemsProcessed: response.data?.itemsCount || 0 }, 
        `Worker completed for partition ${partition}`
      );
    }
    
    return {
      partition,
      success: !response.error,
      message: response.data?.message || response.error?.message || "No response",
      itemsProcessed: response.data?.itemsCount || 0
    };
  } catch (error) {
    logger.error(
      { partition, error: error.message, stack: error.stack }, 
      `Error invoking worker for partition ${partition}`
    );
    
    return {
      partition,
      success: false,
      message: `Error: ${error.message}`,
      itemsProcessed: 0
    };
  }
}

// Handler with validation
const handleCoordinator = async (req: Request, data: CoordinatorRequest): Promise<Response> => {
  const startTime = performance.now();
  const logger = createRequestLogger(req, "federation-coordinator");
  
  logRequest(logger, req);
  
  try {
    logger.info("Federation coordinator starting");
    
    // Get queue stats for each partition
    const { data: queueStats, error: statsError } = await supabaseClient
      .from('federation_queue_stats')
      .select('*');
    
    if (statsError) {
      logger.error({ error: statsError.message }, "Failed to get queue stats");
      throw new Error(`Failed to get queue stats: ${statsError.message}`);
    }
    
    logger.debug({ queueStats }, "Queue stats retrieved");
    
    // Launch workers in parallel, one per partition
    const workerPromises = [];
    for (let i = 0; i < NUM_PARTITIONS; i++) {
      workerPromises.push(invokeWorker(i, logger));
    }
    
    // Wait for all workers to complete
    const results = await Promise.all(workerPromises);
    
    logger.info({ results }, "All workers completed");
    
    logResponse(logger, 200, startTime);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Federation coordinator completed successfully",
        results
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, "Error in federation coordinator");
    
    logResponse(logger, 500, startTime);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
};

// Apply validation middleware
serve(validateRequest(handleCoordinator, coordinatorSchema));
