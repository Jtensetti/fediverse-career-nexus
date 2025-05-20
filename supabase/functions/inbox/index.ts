
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { verify } from 'https://esm.sh/@small-tech/https-signature-verifier@0.3.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature, digest, date, host',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Function to verify HTTP signatures for ActivityPub
async function verifyHttpSignature(request: Request, supabase: any): Promise<boolean> {
  try {
    // Get required headers for verification
    const signature = request.headers.get('signature')
    const digest = request.headers.get('digest')
    const date = request.headers.get('date')
    
    // Check if required headers are present
    if (!signature || !digest || !date) {
      console.log('Missing required headers for signature verification')
      return false
    }
    
    // Parse the actor URL from the signature header
    const keyIdMatch = signature.match(/keyId="([^"]+)"/)
    if (!keyIdMatch || !keyIdMatch[1]) {
      console.log('Could not extract keyId from signature header')
      return false
    }
    
    const keyId = keyIdMatch[1]
    const actorUrl = keyId.split('#')[0]
    
    // Fetch the actor's public key
    console.log(`Fetching public key for actor: ${actorUrl}`)
    const response = await fetch(actorUrl, {
      headers: {
        'Accept': 'application/activity+json'
      }
    })
    
    if (!response.ok) {
      console.log(`Failed to fetch actor data: ${response.status}`)
      return false
    }
    
    const actorData = await response.json()
    
    // Extract the public key
    let publicKey = null
    if (actorData.publicKey && actorData.publicKey.publicKeyPem) {
      publicKey = actorData.publicKey.publicKeyPem
    } else if (Array.isArray(actorData.publicKey)) {
      // Some implementations use an array of keys
      const mainKey = actorData.publicKey.find((key: any) => key.id === keyId)
      if (mainKey && mainKey.publicKeyPem) {
        publicKey = mainKey.publicKeyPem
      }
    }
    
    if (!publicKey) {
      console.log('Could not find public key in actor data')
      return false
    }
    
    // Get request body for verification
    const requestBody = await request.clone().text()
    
    // Create verification object
    const options = {
      url: request.url,
      method: request.method,
      headers: {
        'signature': signature,
        'digest': digest,
        'date': date,
        'host': new URL(request.url).host
      },
      body: requestBody,
      publicKey: publicKey
    }
    
    // Verify the signature
    const isValid = await verify(options)
    console.log(`Signature verification result: ${isValid}`)
    
    return isValid
  } catch (error) {
    console.error('Error during signature verification:', error)
    return false
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
    const isSignatureValid = await verifyHttpSignature(req, supabase)
    
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
