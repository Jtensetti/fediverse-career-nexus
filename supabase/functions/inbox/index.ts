
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { verifySignature } from "npm:http-signature@1.3.6";
import { decode as decodeBase64 } from "https://deno.land/std@0.167.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature, digest, date, host',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Function to fetch public key from remote host or local DB
async function fetchPublicKey(keyId: string): Promise<string | null> {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // First check if we already have this key cached
    const { data: keyData, error: keyError } = await supabase
      .from('remote_keys')
      .select('pem')
      .eq('key_id', keyId)
      .single();
    
    if (keyData && keyData.pem) {
      console.log('Using cached public key for:', keyId);
      return keyData.pem;
    }
    
    console.log('Fetching public key from remote server:', keyId);
    
    // Parse the keyId URL to get the actor URL
    const keyIdUrl = new URL(keyId);
    const actorUrl = keyIdUrl.protocol + '//' + keyIdUrl.host + keyIdUrl.pathname.split('#')[0];
    
    // Fetch the actor object
    const actorResponse = await fetch(actorUrl, {
      headers: {
        'Accept': 'application/activity+json'
      }
    });
    
    if (!actorResponse.ok) {
      throw new Error(`Failed to fetch actor: ${actorResponse.status}`);
    }
    
    const actor = await actorResponse.json();
    
    // Extract the public key from the actor object
    let publicKeyPem = null;
    if (actor.publicKey && actor.publicKey.publicKeyPem) {
      publicKeyPem = actor.publicKey.publicKeyPem;
    }
    
    if (!publicKeyPem) {
      throw new Error('No public key found in actor object');
    }
    
    // Store the key in our database for future use
    await supabase.from('remote_keys').insert({
      key_id: keyId,
      pem: publicKeyPem
    });
    
    return publicKeyPem;
  } catch (error) {
    console.error('Error fetching public key:', error);
    return null;
  }
}

// Function to verify HTTP signatures for ActivityPub
async function verifyHttpSignature(request: Request): Promise<{ valid: boolean; keyId: string | null }> {
  try {
    // Clone the request to avoid consuming the body
    const reqClone = request.clone();
    
    // Convert Request to the format needed by http-signature
    const headers = reqClone.headers;
    const method = reqClone.method;
    const url = new URL(reqClone.url).pathname;
    
    // Extract key ID from the Signature header
    const signatureHeader = headers.get('signature');
    let keyId = null;
    
    if (signatureHeader) {
      // Parse the keyId from the Signature header
      const keyIdMatch = signatureHeader.match(/keyId="([^"]+)"/);
      keyId = keyIdMatch ? keyIdMatch[1] : null;
      
      if (keyId) {
        // Fetch the actor's public key using keyId
        const publicKeyPem = await fetchPublicKey(keyId);
        
        if (publicKeyPem) {
          // Verify the signature with the fetched public key
          const valid = verifySignature({
            headers,
            method,
            url,
            publicKey: publicKeyPem
          });
          
          console.log('Signature verification result:', { valid, keyId });
          
          return {
            valid,
            keyId
          };
        }
      }
    }
    
    return { valid: false, keyId };
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
    const { valid, keyId } = await verifyHttpSignature(req);
    
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
