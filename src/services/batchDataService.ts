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

// Batch fetch all data for multiple posts at once - using efficient RPC calls
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

    // Get user's actor ID for boost checking (single query)
    let userActorId: string | null = null;
    if (userId) {
      const { data: actor } = await supabase
        .from('actors')
        .select('id')
        .eq('user_id', userId)
        .single();
      userActorId = actor?.id || null;
    }

    // Use efficient RPC for boost counts - fetches only counts for our posts
    const { data: boostCounts } = await supabase.rpc('get_batch_boost_counts', {
      post_ids: postIds
    });

    if (boostCounts && Array.isArray(boostCounts)) {
      boostCounts.forEach((bc: { post_id: string; boost_count: number }) => {
        const postData = result.get(bc.post_id);
        if (postData) {
          postData.boostCount = Number(bc.boost_count) || 0;
        }
      });
    }

    // Use efficient RPC for reply counts - fetches only counts for our posts
    const { data: replyCounts } = await supabase.rpc('get_batch_reply_counts', {
      post_ids: postIds
    });

    if (replyCounts && Array.isArray(replyCounts)) {
      replyCounts.forEach((rc: { post_id: string; reply_count: number }) => {
        const postData = result.get(rc.post_id);
        if (postData) {
          postData.replyCount = Number(rc.reply_count) || 0;
        }
      });
    }

    // Check if user has boosted any of these posts (if logged in)
    if (userActorId) {
      const { data: userBoosts } = await supabase
        .from('ap_objects')
        .select('id, content')
        .eq('type', 'Announce')
        .eq('attributed_to', userActorId)
        .limit(100);

      if (userBoosts) {
        userBoosts.forEach(boost => {
          const content = boost.content as any;
          const objectId = content?.object?.id || content?.object;
          
          // Find matching post ID
          const matchingPostId = postIds.find(pid => 
            objectId === pid || (typeof objectId === 'string' && objectId.includes(pid))
          );
          
          if (matchingPostId) {
            const postData = result.get(matchingPostId);
            if (postData) {
              postData.userBoosted = true;
            }
          }
        });
      }
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
