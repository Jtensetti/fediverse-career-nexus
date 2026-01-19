
import { supabase } from "@/integrations/supabase/client";

export interface FederatedPost {
  id: string;
  content: any;
  created_at: string;
  actor_name?: string;
  actor_avatar?: string;
  type?: string;
  source?: 'local' | 'remote';
  profile?: {
    username?: string;
    fullname?: string;
    avatar_url?: string;
    home_instance?: string;
  };
  actor?: {
    name?: string;
    preferredUsername?: string;
    icon?: {
      url?: string;
    };
  };
  user_id?: string;
  published_at?: string;
  instance?: string;
  moderation_status?: 'normal' | 'probation' | 'blocked';
  content_warning?: string;
}

export type FeedType = 'all' | 'following' | 'local' | 'remote';

// Get IDs of users the current user follows (connections + author follows)
const getFollowedUserIds = async (userId: string): Promise<string[]> => {
  const followedIds: Set<string> = new Set();

  // Get connections (accepted)
  const { data: connections } = await supabase
    .from('user_connections')
    .select('user_id, connected_user_id')
    .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (connections) {
    connections.forEach(c => {
      const otherId = c.user_id === userId ? c.connected_user_id : c.user_id;
      followedIds.add(otherId);
    });
  }

  // Get author follows
  const { data: authorFollows } = await supabase
    .from('author_follows')
    .select('author_id')
    .eq('follower_id', userId);

  if (authorFollows) {
    authorFollows.forEach(f => followedIds.add(f.author_id));
  }

  return Array.from(followedIds);
};

export const getFederatedFeed = async (
  limit: number = 20, 
  offset: number = 0,
  feedType: FeedType = 'all'
): Promise<FederatedPost[]> => {
  try {
    console.log('🌐 Fetching federated feed with limit:', limit, 'offset:', offset, 'feedType:', feedType);

    // Get current user to ensure we can see their posts
    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 Current user for feed:', user?.id);

    // For "following" feed, get the list of followed user IDs first
    let followedUserIds: string[] = [];
    if (feedType === 'following' && user) {
      followedUserIds = await getFollowedUserIds(user.id);
      // Always include user's own posts in the following feed
      followedUserIds.push(user.id);
      console.log('👥 Following feed - followed user IDs:', followedUserIds.length);
      
      // If user follows no one, return empty (they'll only see their own posts)
      if (followedUserIds.length === 1) {
        console.log('📭 User follows no one, returning own posts only');
      }
    }

    // Fetch posts from the federated_feed view and join actor information
    const { data: apObjects, error: apError } = await supabase
      .from('federated_feed')
      .select(
        `
        id,
        content,
        published_at,
        source,
        type,
        attributed_to,
        actors!ap_objects_attributed_to_fkey (
          user_id,
          preferred_username
        )
      `
      )
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (apError) {
      console.error('Error fetching from ap_objects:', apError);
      // Fallback to an empty array instead of throwing
      return [];
    }

    if (!apObjects || apObjects.length === 0) {
      console.log('No federated content found');
      return [];
    }

    console.log('📊 Raw federated objects:', apObjects.length);

    // Filter posts based on feed type
    let filteredObjects = apObjects;
    
    if (feedType === 'following' && user) {
      filteredObjects = apObjects.filter((obj: any) => {
        const actorUserId = obj.actors?.user_id;
        return actorUserId && followedUserIds.includes(actorUserId);
      });
      console.log('📊 Filtered to following:', filteredObjects.length);
    } else if (feedType === 'local') {
      filteredObjects = apObjects.filter((obj: any) => (obj as any).source === 'local');
    } else if (feedType === 'remote') {
      filteredObjects = apObjects.filter((obj: any) => (obj as any).source === 'remote');
    }

    const userIds = filteredObjects
      .map((obj: any) => obj.actors?.user_id)
      .filter((id: string | undefined): id is string => !!id);

    console.log('👥 User IDs found:', userIds);

    let profilesMap: Record<string, { username: string | null; fullname: string | null; avatar_url: string | null; home_instance: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('public_profiles')
        .select('id, username, fullname, avatar_url, home_instance')
        .in('id', userIds);

      console.log('📝 Profiles fetched:', profiles?.length, 'error:', profileError);

      if (profiles) {
        profilesMap = Object.fromEntries(
          profiles.map(p => [p.id, { username: p.username, fullname: p.fullname, avatar_url: p.avatar_url, home_instance: p.home_instance }])
        );
      }
    }

    // Transform the data into our expected format
    const federatedPosts: FederatedPost[] = filteredObjects.map((obj) => {
      const raw = obj.content as any;
      const note = raw?.type === 'Create' ? raw.object : raw;
      const actor = (obj as any).actors;
      const profile = actor?.user_id ? profilesMap[actor.user_id] : undefined;

      const displayName = profile?.fullname || profile?.username || actor?.preferred_username || 'Unknown User';

      // Get content warning from ActivityPub summary field
      const contentWarning = note?.summary || raw?.summary || null;

      return {
        id: obj.id,
        content: note,
        created_at: obj.published_at,
        published_at: obj.published_at,
        actor_name: displayName,
        actor_avatar: profile?.avatar_url || null,
        user_id: actor?.user_id || null,
        profile: profile ? { username: profile.username || undefined, fullname: profile.fullname || undefined, avatar_url: profile.avatar_url || undefined, home_instance: profile.home_instance || undefined } : undefined,
        source: (obj as any).source === 'local' ? 'local' : 'remote',
        type: note?.type || 'Note',
        content_warning: contentWarning,
      };
    });

    console.log('✅ Transformed federated posts:', federatedPosts.length);

    return federatedPosts;
  } catch (error) {
    console.error('Error fetching federated feed:', error);
    // Return empty array instead of throwing to prevent breaking the UI
    return [];
  }
};

export const federateActivity = async (activity: any) => {
  try {
    console.log('🌐 Federating activity:', activity.type);
    
    // For now, just log the activity - federation will be implemented later
    console.log('Activity to federate:', activity);
    
    // Store locally in ap_objects table
    const { data, error } = await supabase
      .from('ap_objects')
      .insert({
        type: activity.type,
        content: activity,
        attributed_to: activity.attributed_to || activity.actor?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing federated activity:', error);
      throw error;
    }

    console.log('✅ Activity federated successfully');
    return data;
  } catch (error) {
    console.error('Error federating activity:', error);
    throw error;
  }
};

// Fix moderation functions to return proper response format
export const getActorModeration = async () => {
  try {
    const { data, error } = await supabase
      .from('blocked_actors')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching actor moderation:', error);
    return [];
  }
};

export const updateActorModeration = async (actorUrl: string, status: string, reason: string) => {
  try {
    const { data, error } = await supabase
      .from('blocked_actors')
      .upsert({
        actor_url: actorUrl,
        status,
        reason,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating actor moderation:', error);
    return { success: false, error };
  }
};

export const deleteActorModeration = async (actorUrl: string) => {
  try {
    const { error } = await supabase
      .from('blocked_actors')
      .delete()
      .eq('actor_url', actorUrl);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting actor moderation:', error);
    return { success: false, error };
  }
};

export const getDomainModeration = async () => {
  try {
    const { data, error } = await supabase
      .from('blocked_domains')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching domain moderation:', error);
    return [];
  }
};

export const updateDomainModeration = async (host: string, status: string, reason: string) => {
  try {
    const { data, error } = await supabase
      .from('blocked_domains')
      .upsert({
        host,
        status,
        reason,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating domain moderation:', error);
    return { success: false, error };
  }
};

export const deleteDomainModeration = async (host: string) => {
  try {
    const { error } = await supabase
      .from('blocked_domains')
      .delete()
      .eq('host', host);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting domain moderation:', error);
    return { success: false, error };
  }
};

export const getRateLimitedHosts = async (requestThreshold: number, timeWindow: number) => {
  try {
    const windowStart = new Date(Date.now() - timeWindow * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .rpc('get_rate_limited_hosts', {
        window_start: windowStart,
        request_threshold: requestThreshold
      });
    
    if (error) throw error;
    
    return {
      success: true,
      hosts: data || []
    };
  } catch (error) {
    console.error('Error fetching rate limited hosts:', error);
    return {
      success: false,
      hosts: []
    };
  }
};

export const getProxiedMediaUrl = (originalUrl: string): string => {
  // Don't proxy empty URLs or local URLs
  if (!originalUrl) return originalUrl;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  // Don't proxy our own URLs
  if (originalUrl.startsWith(supabaseUrl)) {
    return originalUrl;
  }
  
  // Don't proxy data URLs
  if (originalUrl.startsWith('data:')) {
    return originalUrl;
  }
  
  // Proxy remote media through our edge function for privacy
  return `${supabaseUrl}/functions/v1/proxy-media?url=${encodeURIComponent(originalUrl)}`;
};
