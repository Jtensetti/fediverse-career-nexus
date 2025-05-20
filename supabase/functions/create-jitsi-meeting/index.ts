
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.37.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

console.log("Function initialized: create-jitsi-meeting")

serve(async (req) => {
  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Get request body
    const { roomName, userDisplayName } = await req.json()

    if (!roomName) {
      return new Response(
        JSON.stringify({ error: "Room name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

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
        displayName: userDisplayName || "Participant"
      }
    }
    
    console.log(`Created Jitsi meeting: ${meetingUrl}`)
    
    return new Response(
      JSON.stringify({ 
        meetingUrl,
        config,
        domain,
        roomName: meetingId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error creating Jitsi meeting:", error)
    return new Response(
      JSON.stringify({ error: "Failed to create meeting" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
