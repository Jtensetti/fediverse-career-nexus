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
    
    if (error) return [];
    
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
    let { data: actor, error: actorError } = await supabase
      .from('actors')
      .select('id, preferred_username')
      .eq('user_id', user.id)
      .single();
    let profile: { username?: string; fullname?: string } | null = null;

    if (actorError || !actor) {
      // Attempt to create actor on the fly
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, fullname')
        .eq('id', user.id)
        .single();

      profile = profileData as typeof profile;

      if (!profile?.username) {
        toast.error('Actor not found');
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
        toast.error('Actor not found');
        return false;
      }

      actor = newActor;
    }

    // Fetch profile for actor name if not already loaded
    if (!profile) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, fullname')
        .eq('id', user.id)
        .single();
      profile = profileData as typeof profile;
    }
    
    // Check if the user has already reacted with this emoji
    const { data: existingReaction } = await supabase
      .from('ap_objects')
      .select('*')
      .eq('type', 'Like')
      .eq('attributed_to', actor.id)
      .like('content->object->id', `%${postId}%`)
      .maybeSingle();
    
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
          preferredUsername: actor.preferred_username,
          name: profile?.fullname || profile?.username || actor.preferred_username
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
    toast.error('Failed to process your reaction. Please try again.');
    return false;
  }
};
