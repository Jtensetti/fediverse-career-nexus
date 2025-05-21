
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

// Mock domain moderation data - in a real app, this would be stored in the database
const DOMAIN_MODERATION: Record<string, 'normal' | 'probation' | 'blocked'> = {
  'example.social': 'probation',
  'suspicious.federation': 'blocked',
  'problematic.app': 'blocked',
  'warning.social': 'probation'
};

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
        
        // Determine moderation status based on the domain
        let moderationStatus: 'normal' | 'probation' | 'blocked' = 'normal';
        if (instanceDomain && post.source === 'remote') {
          moderationStatus = DOMAIN_MODERATION[instanceDomain] || 'normal';
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
