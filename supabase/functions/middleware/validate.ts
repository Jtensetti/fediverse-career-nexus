
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Common headers to be used by all endpoints
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature, digest, date, host',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/**
 * Middleware to validate request body against a Zod schema
 * 
 * @param handler The request handler function to wrap
 * @param schema The Zod schema to validate the request body against
 * @returns A new request handler that validates the request body
 */
export function validateRequest<T>(
  handler: (req: Request, validData: T) => Promise<Response>,
  schema: z.Schema<T>
) {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Clone the request to read the body
      const clonedReq = req.clone();
      const body = await clonedReq.json().catch(() => ({}));
      
      // Validate the request body against the schema
      const result = schema.safeParse(body);
      
      if (!result.success) {
        // Return validation errors
        const errorResponse = {
          success: false,
          error: "Validation error",
          details: result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        };
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 422, 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      // Call the handler with validated data
      return handler(req, result.data);
    } catch (error) {
      console.error("Error processing request:", error);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid request format",
          message: error.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  };
}

/**
 * Helper function to validate a request with query parameters
 * 
 * @param handler The request handler function to wrap
 * @param schema The Zod schema to validate the query parameters against
 * @returns A new request handler that validates the query parameters
 */
export function validateQuery<T>(
  handler: (req: Request, validParams: T) => Promise<Response>,
  schema: z.Schema<T>
) {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(req.url);
      const params: Record<string, string> = {};
      
      // Convert URLSearchParams to a plain object
      for (const [key, value] of url.searchParams.entries()) {
        params[key] = value;
      }
      
      // Validate the query parameters against the schema
      const result = schema.safeParse(params);
      
      if (!result.success) {
        // Return validation errors
        const errorResponse = {
          success: false,
          error: "Validation error",
          details: result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        };
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 422, 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      // Call the handler with validated query parameters
      return handler(req, result.data);
    } catch (error) {
      console.error("Error processing request:", error);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid request format",
          message: error.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  };
}
