// First part of the file stays the same
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { verifySignature } from "npm:http-signature@1.3.6";
import { decode as decodeBase64 } from "https://deno.land/std@0.167.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature, digest, date, host',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Function to check if a host has exceeded rate limits
async function checkRateLimit(remoteHost: string, requestLimit: number = 30, windowMinutes: number = 10): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return false; // Allow the request but log the error
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get current timestamp and the timestamp for start of window
  const now = new Date();
  const windowStart = new Date(now.getTime() - (windowMinutes * 60 * 1000));
  
  try {
    // First, cleanup old requests that are outside our window
    await supabase
      .from('federation_request_logs')
      .delete()
      .lt('timestamp', windowStart.toISOString());
    
    // Count requests within our window
    const { count, error: countError } = await supabase
      .from('federation_request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('remote_host', remoteHost)
      .gte('timestamp', windowStart.toISOString());
    
    if (countError) {
      console.error('Error checking rate limit:', countError);
      return false; // Allow the request if we can't check (fail open for legitimate traffic)
    }
    
    // Log this request
    const { error: insertError } = await supabase
      .from('federation_request_logs')
      .insert({
        remote_host: remoteHost,
        endpoint: 'inbox',
        timestamp: now.toISOString(),
      });
    
    if (insertError) {
      console.error('Error logging request:', insertError);
    }
    
    // If count is null (shouldn't happen) or exceeds limit, return true (rate limited)
    return (count ?? 0) >= requestLimit;
  } catch (error) {
    console.error('Error in rate limit check:', error);
    return false; // Allow the request if the check fails
  }
}

// Function to fetch public key from remote host or local DB with improved caching
async function getPublicKey(keyId: string): Promise<string> {
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    throw new Error("Server configuration error");
  }
  
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

// Extract the remote host from a URL or keyId
function extractRemoteHost(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    console.error('Error extracting host from URL:', error);
    return url; // Return original if parsing fails
  }
}

// Log the signature verification result
async function logSignatureVerification(
  remoteHost: string, 
  keyId: string, 
  success: boolean, 
  error?: string
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables for logging");
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase
      .from('federation_request_logs')
      .insert({
        remote_host: remoteHost,
        endpoint: 'inbox',
        success: success,
        status_code: success ? 202 : 401,
        error_message: error || null,
        response_time_ms: 0  // We don't measure response time for verification logs
      });
      
  } catch (logError) {
    console.error('Error logging signature verification:', logError);
    // Non-blocking - continue even if logging fails
  }
}

// Function to check domain moderation status
async function checkDomainModeration(remoteHost: string): Promise<{ status: string; blocked: boolean; reason?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing required environment variables for domain check");
    return { status: 'normal', blocked: false };
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase
      .from('blocked_domains')
      .select('status, reason')
      .eq('host', remoteHost)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking domain moderation:', error);
      return { status: 'normal', blocked: false };
    }
    
    if (!data) {
      // Domain not in moderation list, allow normal processing
      return { status: 'normal', blocked: false };
    }
    
    return {
      status: data.status,
      blocked: data.status === 'blocked',
      reason: data.reason
    };
  } catch (error) {
    console.error('Error in domain moderation check:', error);
    return { status: 'normal', blocked: false };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Extract the remote host for rate limiting and logging
    let remoteHost = "";
    let keyId = "";
    
    // Try to get host from signature keyId first
    try {
      const sigInfo = parseSigHeader(req);
      keyId = sigInfo.keyId;
      remoteHost = extractRemoteHost(keyId);
    } catch (sigError) {
      // If signature parsing fails, use fallback methods
      const origin = req.headers.get('origin');
      if (origin) {
        remoteHost = extractRemoteHost(origin);
      } else {
        // Last resort: use the host header
        remoteHost = req.headers.get('host') || "unknown-host";
      }
      
      console.error(`Signature parsing failed from ${remoteHost}:`, sigError);
      
      // Log the failed signature and return 401
      await logSignatureVerification(
        remoteHost,
        keyId || "unknown",
        false,
        `Invalid signature format: ${sigError.message}`
      );
      
      return new Response(JSON.stringify({ error: 'Invalid signature format' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // DOMAIN MODERATION CHECK - Check if the sender's domain is blocked
    const domainModerationStatus = await checkDomainModeration(remoteHost);
    
    if (domainModerationStatus.blocked) {
      console.warn(`Blocked domain attempted to send activity: ${remoteHost}, reason: ${domainModerationStatus.reason}`);
      
      // Log the blocked attempt for audit
      await logSignatureVerification(
        remoteHost,
        keyId,
        false,
        `Domain blocked: ${domainModerationStatus.reason || 'No reason specified'}`
      );
      
      return new Response(JSON.stringify({ 
        error: 'Domain blocked', 
        reason: 'This domain has been blocked by the administrator' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Log if domain is on probation (but still process the request)
    if (domainModerationStatus.status === 'probation') {
      console.info(`Processing activity from domain on probation: ${remoteHost}, reason: ${domainModerationStatus.reason}`);
    }
    
    // Check rate limiting before processing the request
    const isRateLimited = await checkRateLimit(remoteHost);
    if (isRateLimited) {
      console.warn(`Rate limited request from ${remoteHost}`);
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '600' // Suggest retry after 10 minutes
        },
      });
    }
    
    // Parse the request body first for validation
    const body = await req.text();
    let activityBody;
    try {
      activityBody = JSON.parse(body);
    } catch (parseError) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // STRICT VALIDATION 1: Verify Digest header
    const digestHeader = req.headers.get('digest');
    if (!digestHeader) {
      await logSignatureVerification(
        remoteHost,
        keyId,
        false,
        "Missing Digest header"
      );
      
      return new Response(JSON.stringify({ error: 'Missing Digest header' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Compute SHA-256 hash of request body
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const computedDigest = `SHA-256=${btoa(String.fromCharCode(...new Uint8Array(hash)))}`;
    
    if (digestHeader !== computedDigest) {
      await logSignatureVerification(
        remoteHost,
        keyId,
        false,
        `Digest mismatch: expected ${computedDigest}, got ${digestHeader}`
      );
      
      return new Response(JSON.stringify({ error: 'Invalid digest' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // STRICT VALIDATION 2: Enforce request freshness
    const dateHeader = req.headers.get('date');
    if (!dateHeader) {
      await logSignatureVerification(
        remoteHost,
        keyId,
        false,
        "Missing Date header"
      );
      
      return new Response(JSON.stringify({ error: 'Missing Date header' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const requestTime = new Date(dateHeader);
    const now = new Date();
    const timeDiffMs = Math.abs(now.getTime() - requestTime.getTime());
    const maxAgeMs = 5 * 60 * 1000; // 5 minutes
    
    if (timeDiffMs > maxAgeMs) {
      await logSignatureVerification(
        remoteHost,
        keyId,
        false,
        `Request too old: ${timeDiffMs}ms > ${maxAgeMs}ms`
      );
      
      return new Response(JSON.stringify({ error: 'Request too old' }), {
        status: 408,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // STRICT VALIDATION 3: Match signature to actor
    const actorUrl = activityBody.actor;
    if (!actorUrl) {
      await logSignatureVerification(
        remoteHost,
        keyId,
        false,
        "Missing actor in activity"
      );
      
      return new Response(JSON.stringify({ error: 'Missing actor in activity' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Extract base URL from keyId (remove fragment)
    const keyIdBaseUrl = keyId.split('#')[0];
    const actorBaseUrl = typeof actorUrl === 'string' ? actorUrl : actorUrl.id || actorUrl;
    
    if (keyIdBaseUrl !== actorBaseUrl) {
      await logSignatureVerification(
        remoteHost,
        keyId,
        false,
        `Actor mismatch: keyId ${keyIdBaseUrl} != actor ${actorBaseUrl}`
      );
      
      return new Response(JSON.stringify({ error: 'Signature actor mismatch' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Verify HTTP signature - STRICT VALIDATION
    let signatureIsValid = false;
    try {
      const pem = await getPublicKey(keyId);
      
      // Use http-signature's verifySignature function
      const isValid = verifySignature({
        headers: req.headers,
        method: req.method,
        url: new URL(req.url).pathname,
        publicKey: pem
      });
      
      if (!isValid) {
        await logSignatureVerification(
          remoteHost,
          keyId,
          false,
          "Invalid signature (verification failed)"
        );
        
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      signatureIsValid = true;
      console.log('Signature verification successful for keyId:', keyId);
      await logSignatureVerification(remoteHost, keyId, true);
    } catch (sigError) {
      console.error('Signature verification error:', sigError);
      
      await logSignatureVerification(
        remoteHost,
        keyId,
        false,
        `Signature verification error: ${sigError.message}`
      );
      
      return new Response(JSON.stringify({ 
        error: 'Signature verification failed', 
        details: sigError.message 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Basic validation
    if (!activityBody || !activityBody.type || !activityBody.actor) {
      return new Response(JSON.stringify({ error: 'Invalid ActivityPub object' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine the recipient
    const path = new URL(req.url).pathname;
    const username = path.split('/').pop();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Find the recipient actor
    const { data: actorData, error: actorError } = await supabase
      .from('actors')
      .select('id')
      .eq('preferred_username', username)
      .single();

    if (actorError || !actorData) {
      console.error('Error finding recipient actor:', actorError);
      return new Response(JSON.stringify({ error: 'Recipient not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Store the activity in the inbox_events table
    // Include moderation status for domains on probation
    const { data, error } = await supabase
      .from('inbox_events')
      .insert({
        activity: activityBody,
        recipient_id: actorData.id,
        sender: activityBody.actor,
        signature_verified: signatureIsValid,
        // Add a note if the domain is on probation
        ...(domainModerationStatus.status === 'probation' && {
          notes: `From domain on probation: ${domainModerationStatus.reason || 'No reason specified'}`
        })
      })
      .select();

    if (error) {
      console.error('Error storing inbox event:', error);
      return new Response(JSON.stringify({ error: 'Failed to process activity' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return success response
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Activity accepted',
      signature_valid: signatureIsValid,
      domain_status: domainModerationStatus.status
    }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error processing request:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
