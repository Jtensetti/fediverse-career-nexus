
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
    console.log('🔍 Getting reactions for post:', postId);
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    console.log('👤 Current user for reactions:', userId);
    
    // Get all reactions for this post from ap_objects
    const { data: reactions, error } = await supabase
      .from('ap_objects')
      .select('*')
      .eq('type', 'Like')
      .like('content->object->id', `%${postId}%`);
    
    if (error) {
      console.error('❌ Error fetching post reactions:', error);
      return [];
    }
    
    console.log('📊 Raw reactions data:', reactions);
    
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
      
      console.log(`${emoji} reaction:`, { count: filteredReactions.length, hasReacted });
      
      return {
        emoji,
        count: filteredReactions.length,
        hasReacted
      };
    });
    
    console.log('✅ Processed reaction counts:', reactionCounts);
    return reactionCounts;
  } catch (error) {
    console.error('❌ Error getting post reactions:', error);
    return [];
  }
};

// Toggle a reaction (add if not exists, remove if exists)
export const togglePostReaction = async (postId: string, emoji: string): Promise<boolean> => {
  try {
    console.log('🔄 Toggling reaction:', { postId, emoji });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No user found for reaction');
      toast.error('You must be logged in to react to a post');
      return false;
    }

    console.log('👤 User found for reaction:', user.id);

    // Get user's actor
    const { data: actor, error: actorError } = await supabase
      .from('actors')
      .select('id, preferred_username')
      .eq('user_id', user.id)
      .single();

    if (actorError || !actor) {
      console.log('❌ Actor not found:', actorError);
      toast.error('Actor not found');
      return false;
    }

    console.log('🎭 Actor found:', actor);
    
    // Check if the user has already reacted with this emoji
    const { data: existingReaction, error: checkError } = await supabase
      .from('ap_objects')
      .select('*')
      .eq('type', 'Like')
      .eq('attributed_to', actor.id)
      .like('content->object->id', `%${postId}%`)
      .maybeSingle();
    
    if (checkError) {
      console.error('❌ Error checking existing reaction:', checkError);
    }

    console.log('🔍 Existing reaction check:', existingReaction);
    
    if (existingReaction) {
      console.log('🗑️ Removing existing reaction');
      // Remove the reaction
      const { error } = await supabase
        .from('ap_objects')
        .delete()
        .eq('id', existingReaction.id);
      
      if (error) {
        console.error('❌ Error removing reaction:', error);
        toast.error(`Error removing reaction: ${error.message}`);
        return false;
      }
      
      console.log('✅ Reaction removed successfully');
      toast.success('Reaction removed');
      return true;
    } else {
      console.log('➕ Adding new reaction');
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

      console.log('📝 Creating like activity:', likeActivity);

      const { error } = await supabase
        .from('ap_objects')
        .insert({
          type: 'Like',
          content: likeActivity,
          attributed_to: actor.id
        });
      
      if (error) {
        console.error('❌ Error adding reaction:', error);
        toast.error(`Error adding reaction: ${error.message}`);
        return false;
      }
      
      console.log('✅ Reaction added successfully');
      toast.success('Reaction added');
      return true;
    }
  } catch (error) {
    console.error('❌ Error toggling reaction:', error);
    toast.error('Failed to process your reaction. Please try again.');
    return false;
  }
};
