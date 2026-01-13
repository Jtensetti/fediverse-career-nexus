import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReplyReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

// Cache for user actor ID to avoid repeated lookups
let cachedActorId: string | null = null;
let cachedUserId: string | null = null;

const getUserActorId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  if (!userId) return null;
  
  // Use cache if available for same user
  if (cachedUserId === userId && cachedActorId) {
    return cachedActorId;
  }
  
  const { data: actor } = await supabase
    .from('actors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
    
  cachedUserId = userId;
  cachedActorId = actor?.id || null;
  return cachedActorId;
};

// Get reactions for a specific reply - FIXED: now properly groups by emoji
export const getReplyReactions = async (replyId: string): Promise<ReplyReactionCount[]> => {
  try {
    const userActorId = await getUserActorId();
    
    // Fetch Like reactions and filter for this specific reply
    const { data: reactions, error } = await supabase
      .from('ap_objects')
      .select('id, content, attributed_to')
      .eq('type', 'Like')
      .limit(1000);
    
    if (error) {
      console.error('Error fetching reactions:', error);
      return [{ emoji: '❤️', count: 0, hasReacted: false }];
    }
    
    // Filter reactions that match the replyId and are reply reactions
    const matchingReactions = (reactions || []).filter(r => {
      const content = r.content as any;
      const objectId = content?.object?.id;
      const targetType = content?.object?.type;
      // Exact match only - no includes() which was causing issues
      return objectId === replyId && targetType === 'reply';
    });
    
    // Group reactions by emoji
    const emojiGroups: Record<string, { count: number; reactorIds: string[] }> = {};
    
    matchingReactions.forEach(r => {
      const content = r.content as any;
      const emoji = content?.emoji || '❤️'; // Default to heart if no emoji
      
      if (!emojiGroups[emoji]) {
        emojiGroups[emoji] = { count: 0, reactorIds: [] };
      }
      emojiGroups[emoji].count++;
      if (r.attributed_to) {
        emojiGroups[emoji].reactorIds.push(r.attributed_to);
      }
    });
    
    // Convert to array with hasReacted flag
    const result: ReplyReactionCount[] = Object.entries(emojiGroups).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      hasReacted: userActorId ? data.reactorIds.includes(userActorId) : false
    }));
    
    // Ensure at least heart emoji is present
    if (!result.find(r => r.emoji === '❤️')) {
      result.unshift({ emoji: '❤️', count: 0, hasReacted: false });
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching reply reactions:', error);
    return [{ emoji: '❤️', count: 0, hasReacted: false }];
  }
};

// Get single reaction count (shorthand for heart)
export const getReplyLikeCount = async (replyId: string): Promise<{ count: number; hasReacted: boolean }> => {
  const reactions = await getReplyReactions(replyId);
  // Return total count across all emojis, and whether user has reacted with any emoji
  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);
  const hasReacted = reactions.some(r => r.hasReacted);
  return { count: totalCount, hasReacted };
};

// Toggle a reaction on a reply - FIXED: proper emoji matching
export const toggleReplyReaction = async (replyId: string, emoji: string = '❤️'): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Please sign in to like comments');
      return false;
    }

    // Get user's actor
    let { data: actor, error: actorError } = await supabase
      .from('actors')
      .select('id, preferred_username')
      .eq('user_id', user.id)
      .maybeSingle();

    if (actorError || !actor) {
      // Create actor on the fly
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, fullname')
        .eq('id', user.id)
        .single();

      if (!profile?.username) {
        toast.error('Please complete your profile first');
        return false;
      }

      const { data: newActor, error: createError } = await supabase
        .from('actors')
        .insert({
          user_id: user.id,
          preferred_username: profile.username,
          type: 'Person',
          status: 'active'
        })
        .select('id, preferred_username')
        .single();

      if (createError || !newActor) {
        toast.error('Unable to process reaction');
        return false;
      }

      actor = newActor;
      // Update cache
      cachedActorId = newActor.id;
      cachedUserId = user.id;
    }

    // Check if user has already reacted to this reply with this specific emoji
    const { data: userReactions } = await supabase
      .from('ap_objects')
      .select('id, content')
      .eq('type', 'Like')
      .eq('attributed_to', actor.id);
    
    // Find existing reaction for this reply with this emoji
    const existingReaction = userReactions?.find(r => {
      const content = r.content as any;
      const objectId = content?.object?.id;
      const targetType = content?.object?.type;
      const reactionEmoji = content?.emoji || '❤️';
      // Exact match only
      return objectId === replyId && targetType === 'reply' && reactionEmoji === emoji;
    });
    
    if (existingReaction) {
      // Remove the reaction
      const { error } = await supabase
        .from('ap_objects')
        .delete()
        .eq('id', existingReaction.id);
      
      if (error) {
        console.error('Error removing reply reaction:', error);
        return false;
      }
      
      return true;
    } else {
      // Add the reaction
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, fullname')
        .eq('id', user.id)
        .single();

      const likeActivity = {
        type: 'Like',
        actor: {
          id: actor.id,
          preferredUsername: actor.preferred_username,
          name: profile?.fullname || profile?.username || actor.preferred_username
        },
        object: {
          id: replyId,
          type: 'reply'
        },
        emoji: emoji,
        published: new Date().toISOString()
      };

      const { error } = await supabase
        .from('ap_objects')
        .insert({
          type: 'Like',
          content: likeActivity,
          attributed_to: actor.id
        });
      
      if (error) {
        console.error('Error adding reply reaction:', error);
        return false;
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error toggling reply reaction:', error);
    return false;
  }
};
