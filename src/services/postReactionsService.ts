
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

// Get all reactions for a post
export const getPostReactions = async (postId: string): Promise<ReactionCount[]> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // Get all reactions for this post from ap_objects
    const { data: reactions, error } = await supabase
      .from('ap_objects')
      .select('*')
      .eq('type', 'Like')
      .like('content->object->id', `%${postId}%`);
    
    if (error) {
      console.error('Error fetching post reactions:', error);
      return [];
    }
    
    // Default emojis we support
    const supportedEmojis = ['❤️', '👍', '😂', '😮', '😢', '😡'];
    
    // Process the reactions to count each emoji type
    const reactionCounts: ReactionCount[] = supportedEmojis.map(emoji => {
      const filteredReactions = reactions?.filter(r => {
        const content = r.content as any;
        return content?.emoji === emoji || (emoji === '👍' && !content?.emoji);
      }) || [];
      
      const hasReacted = filteredReactions.some(r => {
        const content = r.content as any;
        return content?.actor?.id === userId;
      });
      
      return {
        emoji,
        count: filteredReactions.length,
        hasReacted
      };
    });
    
    return reactionCounts;
  } catch (error) {
    console.error('Error getting post reactions:', error);
    return [];
  }
};

// Toggle a reaction (add if not exists, remove if exists)
export const togglePostReaction = async (postId: string, emoji: string): Promise<boolean> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to react to a post');
      return false;
    }

    // Get user's actor
    const { data: actor } = await supabase
      .from('actors')
      .select('id, preferred_username')
      .eq('user_id', user.id)
      .single();

    if (!actor) {
      toast.error('Actor not found');
      return false;
    }
    
    // Check if the user has already reacted with this emoji
    const { data: existingReaction } = await supabase
      .from('ap_objects')
      .select('*')
      .eq('type', 'Like')
      .eq('attributed_to', actor.id)
      .like('content->object->id', `%${postId}%`)
      .single();
    
    if (existingReaction) {
      // Remove the reaction
      const { error } = await supabase
        .from('ap_objects')
        .delete()
        .eq('id', existingReaction.id);
      
      if (error) {
        toast.error(`Error removing reaction: ${error.message}`);
        return false;
      }
      
      toast.success('Reaction removed');
      return true;
    } else {
      // Add the reaction
      const likeActivity = {
        type: 'Like',
        actor: {
          id: actor.id,
          preferredUsername: actor.preferred_username
        },
        object: {
          id: postId
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
        toast.error(`Error adding reaction: ${error.message}`);
        return false;
      }
      
      toast.success('Reaction added');
      return true;
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    toast.error('Failed to process your reaction. Please try again.');
    return false;
  }
};
