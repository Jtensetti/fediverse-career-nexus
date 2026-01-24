import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface WebFingerLink {
  rel: string;
  type?: string;
  href?: string;
  template?: string;
}

interface WebFingerResponse {
  subject: string;
  aliases?: string[];
  links: WebFingerLink[];
}

// Parse a Fediverse handle like @user@mastodon.social
function parseHandle(handle: string): { username: string; domain: string } | null {
  // Remove leading @ if present
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
  const parts = cleanHandle.split('@');
  
  if (parts.length !== 2) return null;
  
  const [username, domain] = parts;
  if (!username || !domain) return null;
  
  return { username, domain };
}

// Perform WebFinger lookup to discover the actor
async function webfingerLookup(username: string, domain: string): Promise<WebFingerResponse | null> {
  const webfingerUrl = `https://${domain}/.well-known/webfinger?resource=acct:${username}@${domain}`;
  
  try {
    const response = await fetch(webfingerUrl, {
      headers: { 'Accept': 'application/jrd+json, application/json' }
    });
    
    if (!response.ok) {
      console.error(`WebFinger lookup failed: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('WebFinger lookup error:', error);
    return null;
  }
}

// Register an OAuth client with a Mastodon-compatible instance
// Mastodon allows multiple redirect URIs, so we can include both domains
async function registerOAuthClient(domain: string, redirectUri: string): Promise<{ clientId: string; clientSecret: string } | null> {
  const appsUrl = `https://${domain}/api/v1/apps`;
  
  // Include both the custom domain and the lovable.app domain as valid redirect URIs
  // This prevents 422 errors when users access from different domains
  const redirectUris = [
    redirectUri,
    'https://nolto.social/auth/callback',
    'https://fediverse-career.lovable.app/auth/callback'
  ];
  
  // Deduplicate and join with newlines (Mastodon format for multiple URIs)
  const uniqueUris = [...new Set(redirectUris)].join('\n');
  
  try {
    const response = await fetch(appsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Nolto - Professional Fediverse Network',
        redirect_uris: uniqueUris,
        scopes: 'read',
        website: 'https://nolto.social'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OAuth registration failed: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    return {
      clientId: data.client_id,
      clientSecret: data.client_secret
    };
  } catch (error) {
    console.error('OAuth registration error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { handle, redirectUri } = await req.json();
    
    if (!handle || !redirectUri) {
      return new Response(JSON.stringify({ error: 'Handle and redirectUri are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse the Fediverse handle
    const parsed = parseHandle(handle);
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Invalid Fediverse handle format. Use @username@instance.social' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { username, domain } = parsed;
    console.log(`Initiating federated auth for ${username}@${domain}`);

    // Verify the user exists via WebFinger
    const webfinger = await webfingerLookup(username, domain);
    if (!webfinger) {
      return new Response(JSON.stringify({ error: `Could not find user @${username}@${domain}. Please check the handle and try again.` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find the ActivityPub profile URL
    const actorLink = webfinger.links.find(l => l.rel === 'self' && l.type === 'application/activity+json');
    const actorUrl = actorLink?.href;

    // Check if we already have an OAuth client for this instance
    const { data: existingClient } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('instance_domain', domain)
      .single();

    let clientId: string;
    let clientSecret: string;
    
    // List of known valid redirect domains - use existing client if it matches any
    const validDomains = ['nolto.social', 'fediverse-career.lovable.app'];
    const existingDomain = existingClient?.redirect_uri?.match(/https?:\/\/([^/]+)/)?.[1];
    const requestedDomain = redirectUri.match(/https?:\/\/([^/]+)/)?.[1];
    
    // Use existing client if both the existing and requested URIs are from our known domains
    const canReuseClient = existingClient && 
      validDomains.some(d => existingDomain?.includes(d)) && 
      validDomains.some(d => requestedDomain?.includes(d));

    if (canReuseClient) {
      console.log(`Using existing OAuth client for ${domain} (compatible redirect URI)`);
      clientId = existingClient.client_id;
      clientSecret = existingClient.client_secret;
      
      // Update our stored redirect_uri to match the current request
      if (existingClient.redirect_uri !== redirectUri) {
        await supabase
          .from('oauth_clients')
          .update({ redirect_uri: redirectUri })
          .eq('instance_domain', domain);
      }
    } else {
      // Need to register a new OAuth client
      console.log(`Registering new OAuth client for ${domain}`);
      
      const registration = await registerOAuthClient(domain, redirectUri);
      
      if (!registration) {
        return new Response(JSON.stringify({ 
          error: `Could not register with ${domain}. This instance may not support OAuth login.` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Store the client credentials
      const { error: insertError } = await supabase
        .from('oauth_clients')
        .insert({
          instance_domain: domain,
          client_id: registration.clientId,
          client_secret: registration.clientSecret,
          redirect_uri: redirectUri,
          scopes: 'read'
        });

      if (insertError) {
        console.error('Failed to store OAuth client:', insertError);
      }

      clientId = registration.clientId;
      clientSecret = registration.clientSecret;
    }

    // Generate a state parameter for CSRF protection
    const state = crypto.randomUUID();

    // Store the state temporarily (could use a dedicated table, but we'll encode it)
    const stateData = btoa(JSON.stringify({
      domain,
      username,
      actorUrl,
      redirectUri,
      timestamp: Date.now()
    }));

    // Build the authorization URL
    const authUrl = new URL(`https://${domain}/oauth/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', 'read');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', stateData);

    console.log(`Generated auth URL for ${domain}`);

    return new Response(JSON.stringify({
      authorizationUrl: authUrl.toString(),
      state: stateData,
      domain,
      username,
      actorUrl
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Federated auth init error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
