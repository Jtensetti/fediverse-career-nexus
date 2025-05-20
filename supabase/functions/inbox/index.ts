
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Function to verify HTTP signatures
// In a production implementation, this would be more robust
async function verifyHttpSignature(request: Request): Promise<boolean> {
  const signature = request.headers.get('signature')
  if (!signature) {
    return false
  }
  
  // TODO: Implement proper signature verification
  // This is a placeholder - actual implementation would:
  // 1. Parse the signature header
  // 2. Get the actor's public key
  // 3. Verify the signature against the request
  
  // For now, we're just accepting all signatures
  console.log('Signature verification is a placeholder')
  return true
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Parse the request body
    const body = await req.json()
    
    // Basic validation
    if (!body || !body.type || !body.actor) {
      return new Response(JSON.stringify({ error: 'Invalid ActivityPub object' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine the recipient
    // In a real implementation, extract from path params or headers
    const path = new URL(req.url).pathname
    const username = path.split('/').pop()
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Find the recipient actor
    const { data: actorData, error: actorError } = await supabase
      .from('actors')
      .select('id')
      .eq('preferred_username', username)
      .single()

    if (actorError || !actorData) {
      console.error('Error finding recipient actor:', actorError)
      return new Response(JSON.stringify({ error: 'Recipient not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify HTTP signature
    const isSignatureValid = await verifyHttpSignature(req)
    
    // Store the activity in the inbox_events table
    const { data, error } = await supabase
      .from('inbox_events')
      .insert({
        activity: body,
        recipient_id: actorData.id,
        sender: body.actor,
        signature_verified: isSignatureValid,
      })
      .select()

    if (error) {
      console.error('Error storing inbox event:', error)
      return new Response(JSON.stringify({ error: 'Failed to process activity' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Return success response
    return new Response(JSON.stringify({ success: true, message: 'Activity accepted' }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error processing request:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
