import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Generate a unique trace ID for this request
  const traceId = crypto.randomUUID();
  const logger = createLogger("send-newsletter", traceId);
  
  // Add trace ID to headers
  const headers = {
    ...corsHeaders,
    "X-Trace-ID": traceId,
    "Content-Type": "application/json"
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    logger.debug({ traceId }, "Processing newsletter request");
    
    // Get the RESEND_API_KEY from environment variables
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      logger.error({ traceId }, "RESEND_API_KEY environment variable not set");
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error", 
          message: "Missing API key",
          traceId 
        }),
        {
          status: 500,
          headers
        }
      );
    }
    
    // Initialize Resend with API key from environment
    const resend = new Resend(resendApiKey);
    
    // For demonstration purposes, we'll return information about the configuration
    // In a real implementation, this would contain the newsletter sending logic
    logger.info({ configured: true, traceId }, "Newsletter sending endpoint is configured properly");
    
    return new Response(
      JSON.stringify({
        message: "Newsletter sending endpoint ready",
        configured: true,
        traceId
      }),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    logger.error({ 
      error: error.message, 
      stack: error.stack,
      traceId 
    }, "Error in send-newsletter function");
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        traceId 
      }),
      {
        status: 500,
        headers
      }
    );
  }
};

serve(handler);
