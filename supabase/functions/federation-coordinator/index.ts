
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, corsHeaders } from "../middleware/validate.ts";

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

async function invokeWorker(partition: number) {
  try {
    console.log(`Invoking worker for partition ${partition}`);
    const response = await supabaseClient.functions.invoke("federation", {
      body: { partition }
    });
    
    return {
      partition,
      success: !response.error,
      message: response.data?.message || response.error?.message || "No response",
      itemsProcessed: response.data?.itemsCount || 0
    };
  } catch (error) {
    console.error(`Error invoking worker for partition ${partition}:`, error);
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
  try {
    console.log("Federation coordinator starting");
    
    // Get queue stats for each partition
    const { data: queueStats, error: statsError } = await supabaseClient
      .from('federation_queue_stats')
      .select('*');
    
    if (statsError) {
      throw new Error(`Failed to get queue stats: ${statsError.message}`);
    }
    
    console.log("Queue stats:", queueStats);
    
    // Launch workers in parallel, one per partition
    const workerPromises = [];
    for (let i = 0; i < NUM_PARTITIONS; i++) {
      workerPromises.push(invokeWorker(i));
    }
    
    // Wait for all workers to complete
    const results = await Promise.all(workerPromises);
    
    console.log("All workers completed", results);
    
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
    console.error("Error in federation coordinator:", error);
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
