import { remoteFetch, readJson } from "../_shared/remote-fetch.ts";
import { tokenHash, OAUTH_SCOPES } from "../_shared/oauth.ts";
import { getSiteUrl } from "../_shared/federation-urls.ts";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";
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
  redirectUri: string,
  codeVerifier: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null> {
  const tokenUrl = `https://${domain}/oauth/token`;
  
  try {
    const response = await remoteFetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        scope: OAUTH_SCOPES,
        code_verifier: codeVerifier
      })
    });
    
    if (!response.ok) {
      console.error(`Token exchange failed: ${response.status}`);
      return null;
    }
    
    const data = await readJson(response);
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
    const response = await remoteFetch(verifyUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!response.ok) {
      console.error(`Verify credentials failed: ${response.status}`);
      return null;
    }
    
    return await readJson(response);
  } catch (error) {
    console.error('Verify credentials error:', error);
    return null;
  }
}

// Generate a unique username for the federated user
function generateUsername(account: MastodonAccount, domain: string): string {
  // Use their remote username with instance suffix
  const baseUsername = account.username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15);
  const domainPrefix = domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${baseUsername}_${domainPrefix}`.slice(0, 24);
}

// Strip HTML tags from bio
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

Deno.serve(async (req) => {
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

    if (typeof state !== "string" || !/^[a-f0-9]{64}$/.test(state)) {
      return new Response(JSON.stringify({ error: "Invalid sign-in state" }), { status: 400, headers: corsHeaders });
    }
    // DELETE RETURNING consumes state atomically. A replay or expired state has no row.
    const { data: stateData, error: stateError } = await supabase.from("federated_oauth_states")
      .delete().eq("state_hash", await tokenHash(state)).gt("expires_at", new Date().toISOString()).select().maybeSingle();
    if (stateError || !stateData || stateData.redirect_uri !== `${getSiteUrl()}/auth/callback` || redirectUri !== stateData.redirect_uri) {
      return new Response(JSON.stringify({ error: "Sign-in expired or was already used. Start again." }), { status: 400, headers: corsHeaders });
    }
    const domain = stateData.instance_domain;

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

    const tokenRedirectUri = stateData.redirect_uri;
    const tokenResult = await exchangeCodeForToken(
      domain,
      code,
      oauthClient.client_id,
      oauthClient.client_secret,
      tokenRedirectUri,
      stateData.code_verifier
    );

    if (!tokenResult) {
      return new Response(JSON.stringify({ error: 'Failed to authenticate with remote instance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the user's identity
    const account = await verifyCredentials(domain, tokenResult.accessToken);
    if (!account || account.username.toLowerCase() !== stateData.username.toLowerCase()) {
      return new Response(JSON.stringify({ error: 'Failed to verify your identity with the remote instance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Verified user: ${account.username}@${domain}`);

    const remoteActorUrl = account.url;
    const fullHandle = `${account.username}@${domain}`;

    if (!account.id || new URL(remoteActorUrl).hostname !== domain) throw new Error("Remote account URL must belong to its OAuth issuer");
    const { data: identity, error: lookupError } = await supabase.from("federated_identities")
      .select("user_id").eq("instance_domain", domain).eq("remote_account_id", String(account.id)).maybeSingle();
    if (lookupError) throw lookupError;
    if (stateData.link_user_id) {
      const bearer = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
      const { data: { user }, error } = await supabase.auth.getUser(bearer || "");
      if (error || !user || user.id !== stateData.link_user_id) throw new Error("Original Nolto session is required to link accounts");
      if (identity && identity.user_id !== user.id) throw new Error("Mastodon account is already linked to a different Nolto account");
    }
    let profileId: string;
    let isNewUser = false;
    if (stateData.link_user_id || identity) {
      profileId = stateData.link_user_id || identity!.user_id;
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
          remote_username: account.username,
          preferred_username: username,
          fullname: account.display_name || account.username,
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
      const { error: profileError } = await supabase
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
      if (profileError) throw profileError;

    }

    if (!identity) {
      const { error: linkError } = await supabase.from("federated_identities").insert({ instance_domain: domain, remote_account_id: String(account.id), user_id: profileId });
      if (linkError) throw linkError;
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

    const { error: sessionSaveError } = await supabase
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

    if (sessionSaveError) throw sessionSaveError;
    const { data: authIdentity, error: identityError } = await supabase.auth.admin.getUserById(profileId);
    if (identityError || !authIdentity.user?.email) throw new Error("Local sign-in identity missing");
    // Generate a session for the existing local auth identity, even if its email was changed.

    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: authIdentity.user.email,
      options: {
        redirectTo: getSiteUrl()
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
    // Supabase may use either 'token' or 'token_hash' depending on version/PKCE settings
    const magicLinkUrl = new URL(sessionData.properties.action_link);
    const token = magicLinkUrl.searchParams.get('token_hash') || magicLinkUrl.searchParams.get('token');
    const tokenType = magicLinkUrl.searchParams.get('type');
    
    if (!token) {
      console.error('Authentication token missing from generated link');
      return new Response(JSON.stringify({ error: 'Failed to generate authentication token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: savedProfile, error: savedProfileError } = await supabase.from("public_profiles")
      .select("username").eq("id", profileId).single();
    if (savedProfileError) throw savedProfileError;

    return new Response(JSON.stringify({
      success: true,
      isNewUser,
      profile: {
        id: profileId,
        username: savedProfile.username,
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
