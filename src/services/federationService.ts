
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
}

export const getFederatedFeed = async (limit: number = 20): Promise<FederatedPost[]> => {
  try {
    console.log('🌐 Fetching federated feed with limit:', limit);

    // Get current user to ensure we can see their posts
    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 Current user for feed:', user?.id);

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
      .limit(limit);

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

    const userIds = apObjects
      .map((obj: any) => obj.actors?.user_id)
      .filter((id: string | undefined): id is string => !!id);

    console.log('👥 User IDs found:', userIds);

    let profilesMap: Record<string, { username: string | null; fullname: string | null; avatar_url: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, fullname, avatar_url')
        .in('id', userIds);

      console.log('📝 Profiles fetched:', profiles?.length, 'error:', profileError);

      if (profiles) {
        profilesMap = Object.fromEntries(
          profiles.map(p => [p.id, { username: p.username, fullname: p.fullname, avatar_url: p.avatar_url }])
        );
      }
    }

    // Transform the data into our expected format
    const federatedPosts: FederatedPost[] = apObjects.map((obj) => {
      const raw = obj.content as any;
      const note = raw?.type === 'Create' ? raw.object : raw;
      const actor = (obj as any).actors;
      const profile = actor?.user_id ? profilesMap[actor.user_id] : undefined;

      const displayName = profile?.fullname || profile?.username || actor?.preferred_username || 'Unknown User';

      console.log('🔍 Processing post:', {
        id: obj.id,
        actorUserId: actor?.user_id,
        profile: profile,
        displayName: displayName
      });

      return {
        id: obj.id,
        content: note,
        created_at: obj.published_at,
        published_at: obj.published_at,
        actor_name: displayName,
        actor_avatar: profile?.avatar_url || null,
        user_id: actor?.user_id || null,
        profile: profile ? { username: profile.username || undefined, fullname: profile.fullname || undefined, avatar_url: profile.avatar_url || undefined } : undefined,
        source: (obj as any).source === 'local' ? 'local' : 'remote',
        type: note?.type || 'Note',
      };
    });

    console.log('✅ Transformed federated posts:', federatedPosts.length);
    federatedPosts.forEach(post => {
      console.log('📄 Post:', {
        id: post.id,
        actor_name: post.actor_name,
        user_id: post.user_id,
        source: post.source
      });
    });

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
  // For now, just return the original URL
  // In production, this would proxy through our media endpoint
  return originalUrl;
};
