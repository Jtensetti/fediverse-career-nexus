
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request
    const { action, timeframe = '24h', limit = 10 } = await req.json();
    
    // Default time window to 24 hours if not specified
    const windowHours = parseInt(timeframe.replace('h', '')) || 24;
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - windowHours);
    
    switch (action) {
      case 'getMetricsByHost':
        return await getMetricsByHost(limit);
      
      case 'getTopFailingHosts':
        return await getTopFailingHosts(limit);
      
      case 'getRateLimitedHosts':
        return await getRateLimitedHosts(windowStart, 50); // Threshold of 50 requests
      
      case 'getSummary':
        return await getSummary(windowStart);
      
      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
    }
  } catch (error) {
    console.error("Error processing analytics request:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

async function getMetricsByHost(limit: number) {
  const { data, error } = await supabaseClient
    .from('federation_metrics_by_host')
    .select('*')
    .limit(limit);
    
  if (error) {
    throw new Error(`Failed to fetch metrics: ${error.message}`);
  }
  
  return new Response(
    JSON.stringify({ 
      hosts: data 
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

async function getTopFailingHosts(limit: number) {
  const { data, error } = await supabaseClient
    .from('federation_metrics_by_host')
    .select('*')
    .order('failed_requests', { ascending: false })
    .limit(limit);
    
  if (error) {
    throw new Error(`Failed to fetch failing hosts: ${error.message}`);
  }
  
  return new Response(
    JSON.stringify({ 
      hosts: data 
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

async function getRateLimitedHosts(windowStart: Date, threshold: number) {
  const { data, error } = await supabaseClient
    .rpc('get_rate_limited_hosts', {
      window_start: windowStart.toISOString(),
      request_threshold: threshold
    });
    
  if (error) {
    throw new Error(`Failed to fetch rate limited hosts: ${error.message}`);
  }
  
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

async function getSummary(windowStart: Date) {
  // Get overall stats
  const { data: overallStats, error: statsError } = await supabaseClient
    .from('federation_request_logs')
    .select('success, response_time_ms')
    .gte('timestamp', windowStart.toISOString());
    
  if (statsError) {
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
  
  return new Response(
    JSON.stringify({ 
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      success_percent: successPercent.toFixed(2),
      median_latency_ms: medianLatency,
      window_start: windowStart.toISOString(),
      window_end: new Date().toISOString()
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}
