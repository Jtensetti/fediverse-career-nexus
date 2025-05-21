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
              // In a production app, we would fetch the actor info from remote
              // For now, we'll just extract the username from the URL
              const actorUrl = content.actor;
              const username = actorUrl.split('/').pop();
              
              // Extract domain from the actor URL for moderation status
              try {
                const url = new URL(actorUrl);
                instanceDomain = url.hostname;
              } catch (e) {
                instanceDomain = null;
              }
              
              actorInfo = {
                preferredUsername: username,
                name: username
              };
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

// New functions for managing rate limits

// Get rate limit status for a given host
export const getRateLimitStatus = async (host: string, windowMinutes = 10) => {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    
    // Use the REST API approach instead of direct table access
    // This works around the TypeScript definition limitation
    const { data, error, count } = await supabase
      .from('federation_request_logs')
      .select('*', { count: 'exact' })
      .eq('remote_host', host)
      .gte('timestamp', windowStart)
      .order('timestamp', { ascending: false }) as any;
      
    if (error) {
      console.error("Error fetching rate limit status:", error);
      return { success: false, error };
    }
    
    return { 
      success: true, 
      count,
      requests: data 
    };
  } catch (error) {
    console.error("Error processing rate limit status:", error);
    return { success: false, error };
  }
};

// Clear rate limit log entries for a host (admin function)
export const clearRateLimitLogs = async (host: string) => {
  try {
    // Use the REST API approach instead of direct table access
    const { error } = await supabase
      .from('federation_request_logs')
      .delete()
      .eq('remote_host', host) as any;
      
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
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    
    // Use a REST API query with custom filtering instead of the RPC function
    // This works around the TypeScript definition limitation
    const { data, error } = await supabase
      .from('federation_request_logs')
      .select('remote_host, count(*), max(timestamp)')
      .gte('timestamp', windowStart)
      .group('remote_host')
      .order('count', { ascending: false }) as any;
      
    if (error) {
      console.error("Error fetching rate limited hosts:", error);
      return { success: false, error };
    }
    
    // Filter results that exceed threshold locally
    const filteredData = data.filter((item: any) => item.count >= requestThreshold);
    
    return { 
      success: true, 
      hosts: filteredData.map((item: any) => ({
        remote_host: item.remote_host,
        request_count: parseInt(item.count),
        latest_request: item.max
      }))
    };
  } catch (error) {
    console.error("Error processing rate limited hosts:", error);
    return { success: false, error };
  }
};
