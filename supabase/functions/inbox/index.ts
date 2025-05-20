
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import verifier from "npm:@small-tech/https-signature-verifier@0.3.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature, digest, date, host',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Function to verify HTTP signatures for ActivityPub
async function verifySignature(request: Request): Promise<{ valid: boolean; keyId: string | null }> {
  try {
    // Clone the request to avoid consuming the body
    const reqClone = request.clone();
    
    // Use the npm package for verification
    const result = await verifier.verify(reqClone);
    console.log('Signature verification result:', result);
    
    return {
      valid: result.valid,
      keyId: result.keyId
    };
  } catch (error) {
    console.error('Error during signature verification:', error);
    return { valid: false, keyId: null };
  }
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
    // Verify HTTP signature first
    const { valid, keyId } = await verifySignature(req);
    
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
    
    // Store the activity in the inbox_events table
    const { data, error } = await supabase
      .from('inbox_events')
      .insert({
        activity: body,
        recipient_id: actorData.id,
        sender: body.actor,
        signature_verified: valid,
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
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Activity accepted',
      signature_valid: valid,
      key_id: keyId
    }), {
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
