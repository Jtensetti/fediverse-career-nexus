import { supabase } from "@/integrations/supabase/client";
import { ReactionKey, REACTIONS } from "@/lib/reactions";

export interface ReactionUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  reaction: ReactionKey;
}

export interface ReactionUsersResult {
  users: ReactionUser[];
  counts: Record<ReactionKey, number>;
  total: number;
}

type TargetType = 'post' | 'reply' | 'article';

/**
 * Fetch all users who reacted to a target (post, reply, or article)
 */
export async function getReactionUsers(
  targetType: TargetType,
  targetId: string
): Promise<ReactionUsersResult> {
  try {
    if (targetType === 'article') {
      return getArticleReactionUsers(targetId);
    }

    // Fetch reactions first
    const { data: reactions, error: reactionsError } = await supabase
      .from('reactions')
      .select('reaction, user_id')
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    if (reactionsError) {
      console.error('Error fetching reactions:', reactionsError);
      return { users: [], counts: {} as Record<ReactionKey, number>, total: 0 };
    }

    if (!reactions || reactions.length === 0) {
      const emptyCounts: Record<ReactionKey, number> = {} as Record<ReactionKey, number>;
      REACTIONS.forEach(r => { emptyCounts[r] = 0; });
      return { users: [], counts: emptyCounts, total: 0 };
    }

    // Get unique user IDs and fetch profiles separately
    const userIds = [...new Set(reactions.map(r => r.user_id))];
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, fullname, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of user profiles
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const users: ReactionUser[] = [];
    const counts: Record<ReactionKey, number> = {} as Record<ReactionKey, number>;
    REACTIONS.forEach(r => { counts[r] = 0; });

    reactions.forEach(r => {
      const profile = profileMap.get(r.user_id);
      const reactionKey = r.reaction as ReactionKey;
      
      if (REACTIONS.includes(reactionKey)) {
        counts[reactionKey]++;
        
        if (profile) {
          users.push({
            userId: profile.id,
            username: profile.username || 'unknown',
            displayName: profile.fullname || profile.username || 'Unknown User',
            avatarUrl: profile.avatar_url,
            reaction: reactionKey,
          });
        }
      }
    });

    return {
      users,
      counts,
      total: users.length,
    };
  } catch (error) {
    console.error('Error in getReactionUsers:', error);
    return { users: [], counts: {} as Record<ReactionKey, number>, total: 0 };
  }
}

/**
 * Fetch users who reacted to an article (uses article_reactions table)
 */
async function getArticleReactionUsers(articleId: string): Promise<ReactionUsersResult> {
  try {
    // Fetch article reactions first
    const { data: reactions, error: reactionsError } = await supabase
      .from('article_reactions')
      .select('emoji, user_id')
      .eq('article_id', articleId);

    if (reactionsError) {
      console.error('Error fetching article reactions:', reactionsError);
      return { users: [], counts: {} as Record<ReactionKey, number>, total: 0 };
    }

    if (!reactions || reactions.length === 0) {
      const emptyCounts: Record<ReactionKey, number> = {} as Record<ReactionKey, number>;
      REACTIONS.forEach(r => { emptyCounts[r] = 0; });
      return { users: [], counts: emptyCounts, total: 0 };
    }

    // Get unique user IDs and fetch profiles separately
    const userIds = [...new Set(reactions.map(r => r.user_id))];
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, fullname, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of user profiles
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Map emojis to reaction keys
    const emojiToReaction: Record<string, ReactionKey> = {
      '❤️': 'love',
      '🎉': 'celebrate',
      '👍': 'support',
      '✌️': 'support',
      '🤗': 'empathy',
      '😮': 'insightful',
      '💡': 'insightful',
    };

    const users: ReactionUser[] = [];
    const counts: Record<ReactionKey, number> = {} as Record<ReactionKey, number>;
    REACTIONS.forEach(r => { counts[r] = 0; });

    reactions.forEach(r => {
      const profile = profileMap.get(r.user_id);
      const reactionKey = emojiToReaction[r.emoji] || 'love';
      
      counts[reactionKey]++;
      
      if (profile) {
        users.push({
          userId: profile.id,
          username: profile.username || 'unknown',
          displayName: profile.fullname || profile.username || 'Unknown User',
          avatarUrl: profile.avatar_url,
          reaction: reactionKey,
        });
      }
    });

    return {
      users,
      counts,
      total: users.length,
    };
  } catch (error) {
    console.error('Error in getArticleReactionUsers:', error);
    return { users: [], counts: {} as Record<ReactionKey, number>, total: 0 };
  }
}

// Convenience functions
export const getPostReactionUsers = (postId: string) => getReactionUsers('post', postId);
export const getReplyReactionUsers = (replyId: string) => getReactionUsers('reply', replyId);
export const getArticleReactionUsersList = (articleId: string) => getReactionUsers('article', articleId);
