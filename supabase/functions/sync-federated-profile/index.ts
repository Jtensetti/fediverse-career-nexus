import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { decryptToken } from "../_shared/token-encryption.ts";

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
}

// Strip HTML tags from bio
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// Fetch remote account data
async function fetchRemoteAccount(domain: string, accessToken: string): Promise<MastodonAccount | null> {
  const verifyUrl = `https://${domain}/api/v1/accounts/verify_credentials`;
  
  try {
    const response = await fetch(verifyUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!response.ok) {
      console.error(`Fetch remote account failed: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fetch remote account error:', error);
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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Syncing federated profile for user: ${user.id}`);

    // Check if user is a federated user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('auth_type, home_instance, remote_actor_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (profile.auth_type !== 'federated' || !profile.home_instance) {
      return new Response(JSON.stringify({ error: 'This feature is only available for federated accounts' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the federated session
    const { data: session, error: sessionError } = await supabase
      .from('federated_sessions')
      .select('access_token_encrypted, remote_instance')
      .eq('profile_id', user.id)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ 
        error: 'No active federated session found. Please re-authenticate with your Fediverse account.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Decrypt the access token using AES-GCM (with legacy fallback)
    const accessToken = await decryptToken(session.access_token_encrypted);

    // Fetch the latest account data from the remote instance
    const remoteAccount = await fetchRemoteAccount(session.remote_instance, accessToken);
    
    if (!remoteAccount) {
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch data from your home instance. Your session may have expired.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update the local profile with remote data
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        fullname: remoteAccount.display_name || remoteAccount.username,
        bio: stripHtml(remoteAccount.note || ''),
        avatar_url: remoteAccount.avatar,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update the federated session last verified time
    await supabase
      .from('federated_sessions')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('profile_id', user.id);

    console.log(`Successfully synced profile for user: ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      profile: {
        displayName: remoteAccount.display_name || remoteAccount.username,
        bio: stripHtml(remoteAccount.note || ''),
        avatarUrl: remoteAccount.avatar
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sync federated profile error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
