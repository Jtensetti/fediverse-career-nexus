import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { encryptToken } from "../_shared/token-encryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface MastodonAccount {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  note: string;
  url: string;
  avatar: string;
  header: string;
  followers_count: number;
  following_count: number;
}

// Exchange authorization code for access token
async function exchangeCodeForToken(
  domain: string, 
  code: string, 
  clientId: string, 
  clientSecret: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null> {
  const tokenUrl = `https://${domain}/oauth/token`;
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        scope: 'read'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token exchange failed: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    return null;
  }
}

// Verify the user's credentials with the remote instance
async function verifyCredentials(domain: string, accessToken: string): Promise<MastodonAccount | null> {
  const verifyUrl = `https://${domain}/api/v1/accounts/verify_credentials`;
  
  try {
    const response = await fetch(verifyUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!response.ok) {
      console.error(`Verify credentials failed: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Verify credentials error:', error);
    return null;
  }
}

// Generate a unique username for the federated user
function generateUsername(account: MastodonAccount, domain: string): string {
  // Use their remote username with instance suffix
  const baseUsername = account.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const domainPrefix = domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${baseUsername}_${domainPrefix}`;
}

// Strip HTML tags from bio
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
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
    const { code, state, redirectUri } = await req.json();
    
    if (!code || !state) {
      return new Response(JSON.stringify({ error: 'Code and state are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Decode and validate the state
    let stateData: { domain: string; username: string; actorUrl?: string; redirectUri?: string; timestamp: number };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid state parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if state is not too old (15 minutes max)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return new Response(JSON.stringify({ error: 'Authentication session expired. Please try again.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { domain } = stateData;
    console.log(`Processing OAuth callback for ${domain}`);

    // Get the OAuth client for this domain
    const { data: oauthClient, error: clientError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('instance_domain', domain)
      .single();

    if (clientError || !oauthClient) {
      console.error('OAuth client not found:', clientError);
      return new Response(JSON.stringify({ error: 'OAuth configuration not found for this instance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Exchange code for token - prioritize state-embedded redirectUri for exact match
    const tokenRedirectUri = stateData.redirectUri || redirectUri || oauthClient.redirect_uri;
    console.log(`Using redirect URI for token exchange: ${tokenRedirectUri}`);
    
    const tokenResult = await exchangeCodeForToken(
      domain,
      code,
      oauthClient.client_id,
      oauthClient.client_secret,
      tokenRedirectUri
    );

    if (!tokenResult) {
      return new Response(JSON.stringify({ error: 'Failed to authenticate with remote instance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the user's identity
    const account = await verifyCredentials(domain, tokenResult.accessToken);
    if (!account) {
      return new Response(JSON.stringify({ error: 'Failed to verify your identity with the remote instance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Verified user: ${account.username}@${domain}`);

    const remoteActorUrl = account.url;
    const fullHandle = `${account.username}@${domain}`;

    // Check if this federated user already has a profile
    const { data: existingProfile } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('remote_actor_url', remoteActorUrl)
      .single();

    let profileId: string;
    let isNewUser = false;

    if (existingProfile) {
      console.log(`Found existing profile for ${fullHandle}`);
      profileId = existingProfile.id;

      // Update profile with latest info from remote
      await supabase
        .from('profiles')
        .update({
          fullname: account.display_name || account.username,
          bio: stripHtml(account.note || ''),
          avatar_url: account.avatar,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);
    } else {
      console.log(`Creating new profile for ${fullHandle}`);
      isNewUser = true;

      // Generate a unique username
      let username = generateUsername(account, domain);
      
      // Check if username exists and add suffix if needed
      const { data: usernameCheck } = await supabase
        .from('public_profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (usernameCheck) {
        username = `${username}_${Date.now().toString(36).slice(-4)}`;
      }

      // Create a new auth user for this federated account
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: `${account.username}@${domain}.federated.local`,
        email_confirm: true,
        user_metadata: {
          federated: true,
          remote_instance: domain,
          remote_actor_url: remoteActorUrl,
          remote_username: account.username
        }
      });

      if (authError || !authUser.user) {
        console.error('Failed to create auth user:', authError);
        return new Response(JSON.stringify({ error: 'Failed to create local account' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      profileId = authUser.user.id;

      // The trigger should create the profile, but let's update it with remote data
      await supabase
        .from('profiles')
        .update({
          username,
          fullname: account.display_name || account.username,
          bio: stripHtml(account.note || ''),
          avatar_url: account.avatar,
          auth_type: 'federated',
          remote_actor_url: remoteActorUrl,
          home_instance: domain
        })
        .eq('id', profileId);

      // Create an actor for federation
      await supabase
        .from('actors')
        .insert({
          user_id: profileId,
          preferred_username: username,
          type: 'Person',
          is_remote: false, // This is their local representation
          remote_actor_url: remoteActorUrl,
          remote_inbox_url: `${remoteActorUrl}/inbox`
        });
    }

    // Encrypt tokens using AES-GCM
    const encryptedAccessToken = await encryptToken(tokenResult.accessToken);
    const encryptedRefreshToken = tokenResult.refreshToken 
      ? await encryptToken(tokenResult.refreshToken) 
      : null;

    // Store/update the federated session with encrypted tokens
    const tokenExpiry = tokenResult.expiresIn 
      ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
      : null;

    await supabase
      .from('federated_sessions')
      .upsert({
        profile_id: profileId,
        remote_actor_url: remoteActorUrl,
        remote_instance: domain,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: tokenExpiry,
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'profile_id,remote_instance'
      });

    // Generate a session for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `${account.username}@${domain}.federated.local`,
      options: {
        redirectTo: '/'
      }
    });

    if (sessionError) {
      console.error('Failed to generate session:', sessionError);
      return new Response(JSON.stringify({ error: 'Failed to create session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract the token from the magic link
    const magicLinkUrl = new URL(sessionData.properties.action_link);
    const token = magicLinkUrl.searchParams.get('token');
    const tokenType = magicLinkUrl.searchParams.get('type');

    console.log(`Successfully authenticated ${fullHandle}`);

    return new Response(JSON.stringify({
      success: true,
      isNewUser,
      profile: {
        id: profileId,
        username: existingProfile?.username || generateUsername(account, domain),
        fullname: account.display_name || account.username,
        avatar_url: account.avatar,
        home_instance: domain,
        remote_actor_url: remoteActorUrl
      },
      // Return the magic link token for client-side session creation
      auth: {
        token,
        type: tokenType
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Federated auth callback error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
