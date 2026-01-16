import { supabase } from "@/integrations/supabase/client";
import { ReactionKey, REACTIONS } from "@/lib/reactions";

export interface BatchReactionCount {
  reaction: ReactionKey;
  count: number;
  hasReacted: boolean;
}

export interface BatchPostData {
  reactions: BatchReactionCount[];
  boostCount: number;
  replyCount: number;
  userBoosted: boolean;
}

// Batch fetch all data for multiple posts at once
export async function getBatchPostData(
  postIds: string[],
  userId?: string
): Promise<Map<string, BatchPostData>> {
  const result = new Map<string, BatchPostData>();
  
  if (postIds.length === 0) return result;

  // Initialize default data for all posts
  postIds.forEach(id => {
    result.set(id, {
      reactions: REACTIONS.map(r => ({ reaction: r, count: 0, hasReacted: false })),
      boostCount: 0,
      replyCount: 0,
      userBoosted: false
    });
  });

  try {
    // Batch fetch reactions for all posts in ONE query
    const { data: reactions } = await supabase
      .from('reactions')
      .select('target_id, reaction, user_id')
      .eq('target_type', 'post')
      .in('target_id', postIds);

    // Process reactions
    if (reactions) {
      reactions.forEach(r => {
        const postData = result.get(r.target_id);
        if (postData) {
          const reactionData = postData.reactions.find(rd => rd.reaction === r.reaction);
          if (reactionData) {
            reactionData.count++;
            if (userId && r.user_id === userId) {
              reactionData.hasReacted = true;
            }
          }
        }
      });
    }

    // Get user's actor ID for boost checking
    let userActorId: string | null = null;
    if (userId) {
      const { data: actor } = await supabase
        .from('actors')
        .select('id')
        .eq('user_id', userId)
        .single();
      userActorId = actor?.id || null;
    }

    // Batch fetch boosts (Announce objects) - only fetch boosts for these specific posts
    // We need to fetch and filter since content->object->id is in JSON
    const { data: boosts } = await supabase
      .from('ap_objects')
      .select('id, content, attributed_to')
      .eq('type', 'Announce')
      .limit(500); // Reasonable limit for performance

    if (boosts) {
      boosts.forEach(boost => {
        const content = boost.content as any;
        const objectId = content?.object?.id;
        
        // Check if this boost is for one of our posts
        const matchingPostId = postIds.find(pid => 
          objectId === pid || (typeof objectId === 'string' && objectId.includes(pid))
        );
        
        if (matchingPostId) {
          const postData = result.get(matchingPostId);
          if (postData) {
            postData.boostCount++;
            if (userActorId && boost.attributed_to === userActorId) {
              postData.userBoosted = true;
            }
          }
        }
      });
    }

    // Batch fetch reply counts - use efficient count query with grouping
    const { data: replies } = await supabase
      .from('ap_objects')
      .select('id, content')
      .eq('type', 'Note')
      .limit(1000); // Reasonable limit

    if (replies) {
      replies.forEach(reply => {
        const content = reply.content as any;
        const inReplyTo = content?.inReplyTo || content?.content?.inReplyTo;
        const rootPost = content?.rootPost || content?.content?.rootPost;
        
        // Match if this is a direct reply or nested reply
        const matchingPostId = postIds.find(pid => 
          inReplyTo === pid || rootPost === pid || 
          (typeof inReplyTo === 'string' && inReplyTo.includes(pid))
        );
        
        if (matchingPostId) {
          const postData = result.get(matchingPostId);
          if (postData) {
            postData.replyCount++;
          }
        }
      });
    }

  } catch (error) {
    console.error('Error in getBatchPostData:', error);
  }

  return result;
}

// Simpler function to just get reaction counts for posts without boost/reply data
export async function getBatchReactions(
  postIds: string[],
  userId?: string
): Promise<Map<string, BatchReactionCount[]>> {
  const result = new Map<string, BatchReactionCount[]>();
  
  if (postIds.length === 0) return result;

  // Initialize default reactions for all posts
  postIds.forEach(id => {
    result.set(id, REACTIONS.map(r => ({ reaction: r, count: 0, hasReacted: false })));
  });

  try {
    const { data: reactions } = await supabase
      .from('reactions')
      .select('target_id, reaction, user_id')
      .eq('target_type', 'post')
      .in('target_id', postIds);

    if (reactions) {
      reactions.forEach(r => {
        const postReactions = result.get(r.target_id);
        if (postReactions) {
          const reactionData = postReactions.find(rd => rd.reaction === r.reaction);
          if (reactionData) {
            reactionData.count++;
            if (userId && r.user_id === userId) {
              reactionData.hasReacted = true;
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Error in getBatchReactions:', error);
  }

  return result;
}
