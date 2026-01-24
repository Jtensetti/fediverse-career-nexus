
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
    is_freelancer?: boolean;
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

export type FeedType = 'following' | 'local' | 'federated';

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

// Get IDs of remote users the current user follows (users with home_instance set)
const getRemoteFollowedUserIds = async (userId: string): Promise<string[]> => {
  const followedIds = await getFollowedUserIds(userId);
  
  if (followedIds.length === 0) return [];

  // Check which of these users are remote (have home_instance set)
  const { data: remoteProfiles } = await supabase
    .from('public_profiles')
    .select('id')
    .in('id', followedIds)
    .not('home_instance', 'is', null);

  return remoteProfiles?.map(p => p.id) || [];
};

export const getFederatedFeed = async (
  limit: number = 20, 
  offset: number = 0,
  feedType: FeedType = 'following',
  userId?: string
): Promise<FederatedPost[]> => {
  try {
    console.log('🌐 Fetching federated feed with limit:', limit, 'offset:', offset, 'feedType:', feedType);

    // For "following" feed, get the list of followed user IDs first
    let followedUserIds: string[] = [];
    if (feedType === 'following' && userId) {
      followedUserIds = await getFollowedUserIds(userId);
      // Always include user's own posts in the following feed
      followedUserIds.push(userId);
      console.log('👥 Following feed - followed user IDs:', followedUserIds.length);
      
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
      return [];
    }

    if (!apObjects || apObjects.length === 0) {
      console.log('No federated content found');
      return [];
    }

    console.log('📊 Raw federated objects:', apObjects.length);
    console.log('📊 Feed type:', feedType, 'User ID:', userId);
    console.log('📊 Sample raw object sources:', apObjects.slice(0, 3).map((o: any) => ({ id: o.id?.slice(0, 8), source: o.source, type: o.type })));

    // Filter posts based on feed type
    let filteredObjects = apObjects;
    
    if (feedType === 'following' && userId) {
      // Following feed: posts AND boosts from followed users
      console.log('👥 Following feed - checking against', followedUserIds.length, 'followed user IDs');
      filteredObjects = apObjects.filter((obj: any) => {
        const actorUserId = obj.actors?.user_id;
        const isIncluded = actorUserId && followedUserIds.includes(actorUserId);
        return isIncluded;
      });
      console.log('📊 Filtered to following:', filteredObjects.length, 'from', apObjects.length);
    } else if (feedType === 'local') {
      // Local feed: all local posts, exclude Announce to avoid duplication
      filteredObjects = apObjects.filter((obj: any) => 
        obj.source === 'local' && obj.type !== 'Announce'
      );
      console.log('📊 Filtered to local:', filteredObjects.length, 'from', apObjects.length);
    } else if (feedType === 'federated') {
      // Federated feed: local posts + remote posts from followed users
      if (userId) {
        const remoteFollowedIds = await getRemoteFollowedUserIds(userId);
        console.log('🌐 Remote followed IDs:', remoteFollowedIds.length);
        filteredObjects = apObjects.filter((obj: any) => {
          // Include all local posts
          if (obj.source === 'local') return true;
          // Include remote posts from users we follow
          const actorUserId = obj.actors?.user_id;
          return actorUserId && remoteFollowedIds.includes(actorUserId);
        });
      }
      // If no user logged in, show all posts
      console.log('📊 Filtered to federated:', filteredObjects.length, 'from', apObjects.length);
    }

    const userIds = filteredObjects
      .map((obj: any) => obj.actors?.user_id)
      .filter((id: string | undefined): id is string => !!id);

    console.log('👥 User IDs found:', userIds);

    let profilesMap: Record<string, { username: string | null; fullname: string | null; avatar_url: string | null; home_instance: string | null; is_freelancer: boolean }> = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('public_profiles')
        .select('id, username, fullname, avatar_url, home_instance, is_freelancer')
        .in('id', userIds);

      console.log('📝 Profiles fetched:', profiles?.length, 'error:', profileError);

      if (profiles) {
        profilesMap = Object.fromEntries(
          profiles.map(p => [p.id, { username: p.username, fullname: p.fullname, avatar_url: p.avatar_url, home_instance: p.home_instance, is_freelancer: p.is_freelancer || false }])
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
        profile: profile ? { username: profile.username || undefined, fullname: profile.fullname || undefined, avatar_url: profile.avatar_url || undefined, home_instance: profile.home_instance || undefined, is_freelancer: profile.is_freelancer || false } : undefined,
        source: (obj as any).source === 'local' ? 'local' : 'remote',
        type: note?.type || 'Note',
        content_warning: contentWarning,
      };
    });

    console.log('✅ Transformed federated posts:', federatedPosts.length);

    return federatedPosts;
  } catch (error) {
    console.error('Error fetching federated feed:', error);
    return [];
  }
};

export const federateActivity = async (activity: any) => {
  try {
    console.log('🌐 Federating activity:', activity.type);
    
    console.log('Activity to federate:', activity);
    
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
  if (!originalUrl) return originalUrl;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  if (originalUrl.startsWith(supabaseUrl)) {
    return originalUrl;
  }
  
  if (originalUrl.startsWith('data:')) {
    return originalUrl;
  }
  
  return `${supabaseUrl}/functions/v1/proxy-media?url=${encodeURIComponent(originalUrl)}`;
};
