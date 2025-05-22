
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { createLogger } from "../middleware/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Generate a unique trace ID for this request
  const traceId = crypto.randomUUID();
  const logger = createLogger("proxy-media", traceId);
  
  // Add trace ID to headers
  const headers = {
    ...corsHeaders,
    "X-Trace-ID": traceId
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // Log the incoming request
    logger.debug({ method: req.method, url: req.url, traceId }, "Received proxy-media request");
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      logger.error({ traceId }, "Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY");
      return new Response(JSON.stringify({ 
        error: "Server configuration error", 
        traceId 
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get URL from request
    const url = new URL(req.url);
    const mediaUrl = url.searchParams.get("url");

    if (!mediaUrl) {
      logger.warn({ traceId }, "No URL provided in request");
      return new Response(JSON.stringify({ 
        error: "No URL provided", 
        traceId 
      }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    // Fetch the remote media
    logger.debug({ mediaUrl, traceId }, "Fetching remote media");
    const response = await fetch(mediaUrl);
    
    if (!response.ok) {
      logger.error({ 
        mediaUrl, 
        statusCode: response.status, 
        statusText: response.statusText,
        traceId 
      }, "Failed to fetch media");
      
      return new Response(JSON.stringify({ 
        error: "Failed to fetch media", 
        traceId 
      }), {
        status: response.status,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    // Get content type and data
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const data = await response.arrayBuffer();
    
    logger.info({ 
      mediaUrl, 
      contentType, 
      size: data.byteLength,
      traceId 
    }, "Successfully proxied media");

    // Return the media with appropriate headers
    return new Response(data, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400" // Cache for 24 hours
      }
    });
  } catch (error) {
    logger.error({ 
      error: error.message, 
      stack: error.stack,
      traceId 
    }, "Error proxying media");
    
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      traceId 
    }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }
});
