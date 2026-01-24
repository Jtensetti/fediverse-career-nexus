import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptToken } from '../_shared/token-encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MastodonStatus {
  id: string;
  created_at: string;
  content: string;
  account: {
    id: string;
    username: string;
    display_name: string;
    avatar: string;
    url: string;
    acct: string;
  };
  reblog?: MastodonStatus;
  media_attachments?: Array<{
    id: string;
    type: string;
    url: string;
    preview_url: string;
  }>;
  spoiler_text?: string;
  favourites_count: number;
  reblogs_count: number;
  replies_count: number;
  url: string;
  uri: string;
  in_reply_to_id?: string;
}

interface FederatedPost {
  id: string;
  content: any;
  created_at: string;
  published_at: string;
  actor_name: string;
  actor_avatar: string;
  user_id: string | null;
  profile: {
    username: string;
    fullname: string;
    avatar_url: string;
    home_instance: string;
  };
  source: 'remote';
  type: string;
  content_warning: string | null;
  remote_url: string;
  is_boost: boolean;
  original_post?: FederatedPost;
}

function transformMastodonStatus(status: MastodonStatus, instance: string): FederatedPost {
  const isBoost = !!status.reblog;
  const actualStatus = status.reblog || status;
  
  // Extract instance from account URL or acct
  const accountInstance = actualStatus.account.acct.includes('@') 
    ? actualStatus.account.acct.split('@')[1] 
    : instance;

  const post: FederatedPost = {
    id: `remote-${instance}-${status.id}`,
    content: {
      type: isBoost ? 'Announce' : 'Note',
      content: actualStatus.content,
      published: actualStatus.created_at,
      attachment: actualStatus.media_attachments?.map(a => ({
        type: a.type === 'image' ? 'Image' : a.type,
        url: a.url,
        mediaType: a.type === 'image' ? 'image/jpeg' : undefined,
      })),
    },
    created_at: status.created_at,
    published_at: status.created_at,
    actor_name: actualStatus.account.display_name || actualStatus.account.username,
    actor_avatar: actualStatus.account.avatar,
    user_id: null, // Remote users don't have local IDs
    profile: {
      username: actualStatus.account.username,
      fullname: actualStatus.account.display_name || actualStatus.account.username,
      avatar_url: actualStatus.account.avatar,
      home_instance: accountInstance,
    },
    source: 'remote',
    type: isBoost ? 'Announce' : 'Note',
    content_warning: actualStatus.spoiler_text || null,
    remote_url: actualStatus.url || actualStatus.uri,
    is_boost: isBoost,
  };

  // If it's a boost, include info about who boosted it
  if (isBoost && status.account) {
    post.content.boostedBy = {
      username: status.account.username,
      display_name: status.account.display_name,
      avatar: status.account.avatar,
      instance: status.account.acct.includes('@') 
        ? status.account.acct.split('@')[1] 
        : instance,
    };
  }

  return post;
}

async function fetchHomeTimeline(
  instance: string, 
  accessToken: string, 
  limit: number = 20,
  maxId?: string
): Promise<MastodonStatus[]> {
  let url = `https://${instance}/api/v1/timelines/home?limit=${limit}`;
  if (maxId) {
    url += `&max_id=${maxId}`;
  }

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error(`Failed to fetch home timeline: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to fetch home timeline: ${response.status}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse query params
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const maxId = url.searchParams.get('max_id') || undefined;

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // First, get the user from the auth header
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to access encrypted tokens
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user's federated session
    const { data: session, error: sessionError } = await serviceClient
      .from('federated_sessions')
      .select('remote_instance, access_token_encrypted')
      .eq('profile_id', user.id)
      .single();

    if (sessionError || !session) {
      // User doesn't have a federated session - return empty array
      return new Response(JSON.stringify({ 
        posts: [],
        message: 'No federated session found. User may not have signed up via Fediverse.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decrypt the access token
    const accessToken = await decryptToken(session.access_token_encrypted);

    // Fetch the home timeline from the user's instance
    const statuses = await fetchHomeTimeline(
      session.remote_instance, 
      accessToken, 
      limit,
      maxId
    );

    // Filter out replies (we only want top-level posts)
    const topLevelStatuses = statuses.filter(s => !s.in_reply_to_id);

    // Transform to our format
    const posts = topLevelStatuses.map(s => transformMastodonStatus(s, session.remote_instance));

    // Get the last ID for pagination
    const lastId = statuses.length > 0 ? statuses[statuses.length - 1].id : null;

    return new Response(JSON.stringify({ 
      posts,
      next_max_id: lastId,
      instance: session.remote_instance,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching home timeline:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to fetch home timeline',
      posts: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
