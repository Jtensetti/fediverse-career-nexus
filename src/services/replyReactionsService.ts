import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReplyReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

// Get all reactions for a reply/comment
export const getReplyReactions = async (replyId: string): Promise<ReplyReactionCount[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    let userActorId: string | null = null;
    if (userId) {
      const { data: actor } = await supabase
        .from('actors')
        .select('id')
        .eq('user_id', userId)
        .single();
      userActorId = actor?.id || null;
    }
    
    // Get all Like reactions for this reply
    const { data: reactions, error } = await supabase
      .from('ap_objects')
      .select('*')
      .eq('type', 'Like');
    
    if (error) return [];
    
    // Filter reactions that match the replyId (stored as object.id in content)
    const matchingReactions = reactions?.filter(r => {
      const content = r.content as any;
      const objectId = content?.object?.id;
      const targetType = content?.object?.type;
      return (objectId === replyId || (typeof objectId === 'string' && objectId.includes(replyId))) 
        && targetType === 'reply';
    }) || [];
    
    // We primarily support heart for comments
    const supportedEmojis = ['❤️'];
    
    const reactionCounts: ReplyReactionCount[] = supportedEmojis.map(emoji => {
      const filteredReactions = matchingReactions.filter(r => {
        const content = r.content as any;
        return content?.emoji === emoji;
      });
      
      const hasReacted = filteredReactions.some(r => r.attributed_to === userActorId);
      
      return {
        emoji,
        count: filteredReactions.length,
        hasReacted
      };
    });
    
    return reactionCounts;
  } catch (error) {
    console.error('Error fetching reply reactions:', error);
    return [];
  }
};

// Get single reaction count (shorthand for heart)
export const getReplyLikeCount = async (replyId: string): Promise<{ count: number; hasReacted: boolean }> => {
  const reactions = await getReplyReactions(replyId);
  const heartReaction = reactions.find(r => r.emoji === '❤️');
  return { count: heartReaction?.count || 0, hasReacted: heartReaction?.hasReacted || false };
};

// Toggle a reaction on a reply
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
      .single();

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
    }

    // Check if user has already reacted to this reply
    const { data: allReactions } = await supabase
      .from('ap_objects')
      .select('*')
      .eq('type', 'Like')
      .eq('attributed_to', actor.id);
    
    const existingReaction = allReactions?.find(r => {
      const content = r.content as any;
      const objectId = content?.object?.id;
      const targetType = content?.object?.type;
      return (objectId === replyId || (typeof objectId === 'string' && objectId.includes(replyId)))
        && targetType === 'reply';
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
          type: 'reply' // Mark this as a reply reaction
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
