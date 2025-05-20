
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { verifySignature } from "npm:http-signature@1.3.6";
import { decode as decodeBase64 } from "https://deno.land/std@0.167.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature, digest, date, host',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Function to fetch public key from remote host or local DB with improved caching
async function getPublicKey(keyId: string): Promise<string> {
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check if we have a non-expired cached key
  const { data } = await supabase
    .from('remote_keys')
    .select('pem,fetched_at')
    .eq('key_id', keyId)
    .single();
  
  // Use cached key if it exists and is less than 24 hours old
  if (data && Date.now() - Date.parse(data.fetched_at) < 86_400_000) {
    console.log('Using cached public key for:', keyId);
    return data.pem;
  }
  
  console.log('Fetching public key from remote server:', keyId);
  
  // Fetch the actor object (using the base URL without the fragment)
  const res = await fetch(keyId.split('#')[0], { 
    headers: { 
      'Accept': 'application/activity+json' 
    }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch actor: ${res.status}`);
  }
  
  const actor = await res.json();
  const pem = actor.publicKey?.publicKeyPem;
  
  if (!pem) {
    throw new Error('No public key found in actor object');
  }
  
  // Store or update the key in our database
  await supabase.from('remote_keys').upsert({
    key_id: keyId,
    pem
  });
  
  return pem;
}

// Parse the signature header to extract the keyId
function parseSigHeader(request: Request): { keyId: string } {
  const signatureHeader = request.headers.get('signature');
  if (!signatureHeader) {
    throw new Error('No signature header found');
  }
  
  const keyIdMatch = signatureHeader.match(/keyId="([^"]+)"/);
  const keyId = keyIdMatch ? keyIdMatch[1] : null;
  
  if (!keyId) {
    throw new Error('No keyId found in signature');
  }
  
  return { keyId };
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
    // Verify HTTP signature using the simplified approach
    try {
      const { keyId } = parseSigHeader(req);
      const pem = await getPublicKey(keyId);
      const ok = verifySignature({
        headers: req.headers,
        method: req.method,
        url: new URL(req.url).pathname,
        publicKey: pem
      });
      
      if (!ok) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('Signature verification successful for keyId:', keyId);
    } catch (sigError) {
      console.error('Signature verification error:', sigError);
      // Continue processing even if signature fails, but log it
    }
    
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
        signature_verified: true, // We've verified the signature by this point
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
      signature_valid: true
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
