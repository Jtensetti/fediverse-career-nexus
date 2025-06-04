import { supabase } from "@/integrations/supabase/client";

export interface FederatedPost {
  id: string;
  content: any;
  type: string;
  attributed_to: string;
  published_at: string;
  source: 'local' | 'remote';
  actor?: {
    name?: string;
    preferredUsername?: string;
    icon?: {
      url?: string;
    };
  };
  instance?: string;
  moderation_status?: 'normal' | 'probation' | 'blocked';
}

export const getFederatedFeed = async (limit = 20, page = 1): Promise<FederatedPost[]> => {
  const offset = (page - 1) * limit;

  try {
    const { data, error } = await supabase
      .from('federated_feed')
      .select('*')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching federated feed:", error);
      return [];
    }

    // For each post, fetch the associated actor information
    const postsWithActors = await Promise.all(
      data.map(async (post) => {
        // Extract actor information from the content
        let actorInfo = null;
        let instanceDomain = null;
        
        if (post.content && typeof post.content === 'object') {
          const content = post.content as Record<string, any>;
          
          if (content.actor) {
            // For local posts, the actor is directly available
            if (typeof content.actor === 'object') {
              actorInfo = content.actor;
            } 
            // For remote posts, we might need to resolve the actor URL
            else if (typeof content.actor === 'string') {
              // Try to get actor info from cache first
              const actorUrl = content.actor;
              const resolvedActor = await getRemoteActorFromCache(actorUrl);

              if (resolvedActor) {
                actorInfo = resolvedActor;
              } else {
                // Fallback to username only when remote fetch fails
                const username = actorUrl.split('/').pop();
                actorInfo = {
                  preferredUsername: username,
                  name: username
                };
              }

              // Extract domain from the actor URL for moderation status
              try {
                const url = new URL(actorUrl);
                instanceDomain = url.hostname;
              } catch (e) {
                instanceDomain = null;
              }
            }
          }
        }
        
        // Determine moderation status based on the domain from the database
        let moderationStatus: 'normal' | 'probation' | 'blocked' = 'normal';
        
        if (instanceDomain && post.source === 'remote') {
          // Query the blocked_domains table
          const { data: domainData, error: domainError } = await supabase
            .from('blocked_domains')
            .select('status')
            .eq('host', instanceDomain)
            .single();
          
          if (!domainError && domainData) {
            moderationStatus = domainData.status as 'normal' | 'probation' | 'blocked';
          }
        }
        
        return {
          ...post,
          source: post.source as 'local' | 'remote',
          actor: actorInfo,
          instance: instanceDomain,
          moderation_status: moderationStatus
        } as FederatedPost;
      })
    );

    return postsWithActors;
  } catch (error) {
    console.error("Error processing federated feed:", error);
    return [];
  }
};

export const getProxiedMediaUrl = (url: string): string => {
  if (!url) return '';
  
  // Check if the URL is local or remote
  const currentOrigin = window.location.origin;
  
  if (url.startsWith(currentOrigin)) {
    // Local media, no need to proxy
    return url;
  }
  
  // For remote media, use the proxy endpoint
  const encodedUrl = encodeURIComponent(url);
  return `${currentOrigin}/functions/v1/proxy-media?url=${encodedUrl}`;
};

// New function to get actor from cache or fetch and store if not found
export const getRemoteActorFromCache = async (actorUrl: string) => {
  try {
    // Try to get from cache first
    const { data: cachedActor, error: cacheError } = await supabase
      .from('remote_actors_cache')
      .select('actor_data')
      .eq('actor_url', actorUrl)
      .single();

    if (!cacheError && cachedActor) {
      // Update the fetched_at timestamp to keep it fresh
      await supabase
        .from('remote_actors_cache')
        .update({ fetched_at: new Date().toISOString() })
        .eq('actor_url', actorUrl);

      return cachedActor.actor_data;
    }

    // Not in cache - fetch from the remote server
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(actorUrl, {
      headers: { Accept: 'application/activity+json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch actor ${actorUrl}: ${response.status}`);
    }

    const actorData = await response.json();

    // Store in cache
    await supabase.from('remote_actors_cache').upsert({
      actor_url: actorUrl,
      actor_data: actorData,
      fetched_at: new Date().toISOString()
    });

    return actorData;
  } catch (error) {
    console.error('Error getting remote actor from cache:', error);
    return null;
  }
};

// Function to manually cache a remote actor
export const cacheRemoteActor = async (actorUrl: string, actorData: any) => {
  try {
    const { error } = await supabase
      .from('remote_actors_cache')
      .upsert({
        actor_url: actorUrl,
        actor_data: actorData,
        fetched_at: new Date().toISOString()
      });
      
    if (error) {
      console.error("Error caching remote actor:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in cacheRemoteActor:", error);
    return false;
  }
};

// Function to manually clear an actor from cache
export const clearActorCache = async (actorUrl: string) => {
  try {
    const { error } = await supabase
      .from('remote_actors_cache')
      .delete()
      .eq('actor_url', actorUrl);
      
    if (error) {
      console.error("Error clearing actor cache:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in clearActorCache:", error);
    return false;
  }
};

// New function to retrieve domain moderation data
export const getDomainModeration = async () => {
  try {
    const { data, error } = await supabase
      .from('blocked_domains')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching domain moderation:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Error processing domain moderation:", error);
    return [];
  }
};

// Function to add or update a domain moderation entry
export const updateDomainModeration = async (
  host: string, 
  status: 'normal' | 'probation' | 'blocked',
  reason: string
) => {
  try {
    const { data, error } = await supabase
      .from('blocked_domains')
      .upsert(
        { 
          host, 
          status, 
          reason,
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        },
        { 
          onConflict: 'host',
          ignoreDuplicates: false 
        }
      )
      .select();

    if (error) {
      console.error("Error updating domain moderation:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error updating domain moderation:", error);
    return { success: false, error };
  }
};

// Function to delete a domain moderation entry
export const deleteDomainModeration = async (host: string) => {
  try {
    const { error } = await supabase
      .from('blocked_domains')
      .delete()
      .eq('host', host);

    if (error) {
      console.error("Error deleting domain moderation:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting domain moderation:", error);
    return { success: false, error };
  }
};

// Rate limiting functions using the federation-rate-limits Edge Function for security
export const getRateLimitStatus = async (host: string, windowMinutes = 10) => {
  try {
    const { data, error } = await supabase.functions.invoke('federation-rate-limits', {
      body: {
        action: 'getStatus',
        host,
        windowMinutes
      }
    });
    
    if (error) {
      console.error("Error fetching rate limit status:", error);
      return { success: false, error };
    }
    
    return { success: true, ...data };
  } catch (error) {
    console.error("Error processing rate limit status:", error);
    return { success: false, error };
  }
};

// Clear rate limit log entries for a host (admin function)
export const clearRateLimitLogs = async (host: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('federation-rate-limits', {
      body: {
        action: 'clearLogs',
        host
      }
    });
    
    if (error) {
      console.error("Error clearing rate limit logs:", error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error clearing rate limit logs:", error);
    return { success: false, error };
  }
};

// Get all rate limited hosts (for admin view)
export const getRateLimitedHosts = async (requestThreshold = 25, windowMinutes = 10) => {
  try {
    const { data, error } = await supabase.functions.invoke('federation-rate-limits', {
      body: {
        action: 'getLimitedHosts',
        requestThreshold,
        windowMinutes
      }
    });
    
    if (error) {
      console.error("Error fetching rate limited hosts:", error);
      return { success: false, error };
    }
    
    return { success: true, hosts: data.hosts };
  } catch (error) {
    console.error("Error processing rate limited hosts:", error);
    return { success: false, error };
  }
};
