
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.37.0"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createLogger } from "../_shared/logger.ts";

console.log("Function initialized: create-jitsi-meeting")

// Common headers to be used by all endpoints
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature, digest, date, host',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/**
 * Middleware to validate request body against a Zod schema
 */
function validateRequest<T>(
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

// Simple logger implementation
const createRequestLogger = (req: Request, functionName: string) => ({
  info: (data: any, message?: string) => console.log(`[${functionName}] INFO:`, message || '', data),
  debug: (data: any, message?: string) => console.log(`[${functionName}] DEBUG:`, message || '', data),
  warn: (data: any, message?: string) => console.warn(`[${functionName}] WARN:`, message || '', data),
  error: (data: any, message?: string) => console.error(`[${functionName}] ERROR:`, message || '', data)
});

const logRequest = (logger: any, req: Request) => {
  logger.info({ method: req.method, url: req.url }, "Incoming request");
};

const logResponse = (logger: any, status: number, startTime: number) => {
  const duration = performance.now() - startTime;
  logger.info({ status, duration: `${duration.toFixed(2)}ms` }, "Request completed");
};

// Define the schema for the request body
const jitsiMeetingSchema = z.object({
  roomName: z.string().min(1, "Room name is required"),
  userDisplayName: z.string().optional().default("Participant")
});

// Type inference from the schema
type JitsiMeetingRequest = z.infer<typeof jitsiMeetingSchema>;

// Handler with validation
const handleJitsiMeeting = async (req: Request, data: JitsiMeetingRequest) => {
  const startTime = performance.now();
  const logger = createRequestLogger(req, "jitsi-meeting");
  
  logRequest(logger, req);
  
  try {
    const { roomName, userDisplayName } = data;
    
    logger.debug({ roomName, userDisplayName }, "Processing meeting creation request");
    
    // Create Jitsi JWT for secure rooms (optional, can be enabled if needed)
    // This is a simple implementation - in production you might want to use a more secure approach
    const domain = "meet.jit.si" // Default public Jitsi server
    const appId = crypto.randomUUID() // Generate a random ID for this session
    
    // Generate a random meeting ID if none provided
    const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    const meetingId = sanitizedRoomName || crypto.randomUUID().replace(/-/g, "")
    
    // Create meeting URL
    const meetingUrl = `https://${domain}/${meetingId}`
    
    // Generate config with iFrame API options
    const config = {
      roomName: meetingId,
      width: "100%",
      height: "100%",
      parentNode: "jitsi-container",
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
          'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
          'security'
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
        TOOLBAR_ALWAYS_VISIBLE: true,
      },
      userInfo: {
        displayName: userDisplayName
      }
    }
    
    logger.info({ meetingUrl, meetingId }, "Created Jitsi meeting");
    
    const responseBody = {
      meetingUrl,
      config,
      domain,
      roomName: meetingId
    };

    logResponse(logger, 200, startTime);
    
    return new Response(
      JSON.stringify(responseBody),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, "Error creating Jitsi meeting");
    
    logResponse(logger, 500, startTime);
    
    return new Response(
      JSON.stringify({ error: "Failed to create meeting" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

// Apply validation middleware
serve(validateRequest(handleJitsiMeeting, jitsiMeetingSchema));
