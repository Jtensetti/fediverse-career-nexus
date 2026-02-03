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

    // Fetch reactions with user info for posts/replies
    const { data: reactions, error } = await supabase
      .from('reactions')
      .select(`
        reaction,
        user_id,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    if (error) {
      console.error('Error fetching reaction users:', error);
      return { users: [], counts: {} as Record<ReactionKey, number>, total: 0 };
    }

    const users: ReactionUser[] = [];
    const counts: Record<ReactionKey, number> = {} as Record<ReactionKey, number>;
    REACTIONS.forEach(r => { counts[r] = 0; });

    reactions?.forEach(r => {
      const profile = r.profiles as any;
      const reactionKey = r.reaction as ReactionKey;
      
      if (profile && REACTIONS.includes(reactionKey)) {
        users.push({
          userId: profile.id,
          username: profile.username || 'unknown',
          displayName: profile.full_name || profile.username || 'Unknown User',
          avatarUrl: profile.avatar_url,
          reaction: reactionKey,
        });
        counts[reactionKey]++;
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
    const { data: reactions, error } = await supabase
      .from('article_reactions')
      .select(`
        emoji,
        user_id,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('article_id', articleId);

    if (error) {
      console.error('Error fetching article reaction users:', error);
      return { users: [], counts: {} as Record<ReactionKey, number>, total: 0 };
    }

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

    reactions?.forEach(r => {
      const profile = r.profiles as any;
      const reactionKey = emojiToReaction[r.emoji] || 'love';
      
      if (profile) {
        users.push({
          userId: profile.id,
          username: profile.username || 'unknown',
          displayName: profile.full_name || profile.username || 'Unknown User',
          avatarUrl: profile.avatar_url,
          reaction: reactionKey,
        });
        counts[reactionKey]++;
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
