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

// Get all reactions for a post - optimized
export const getPostReactions = async (postId: string): Promise<ReactionCount[]> => {
  const supportedEmojis = ['❤️', '🎉', '✌️', '🤗', '😮'];
  
  try {
    const userActorId = await getUserActorId();
    
    // Fetch Like reactions with a reasonable limit
    const { data: reactions, error } = await supabase
      .from('ap_objects')
      .select('id, content, attributed_to')
      .eq('type', 'Like')
      .limit(1000);
    
    if (error) {
      console.error('Error fetching post reactions:', error);
      return supportedEmojis.map(emoji => ({ emoji, count: 0, hasReacted: false }));
    }
    
    // Filter reactions that match the postId AND are not reply reactions
    const matchingReactions = (reactions || []).filter(r => {
      const content = r.content as any;
      const objectId = content?.object?.id;
      const isReplyReaction = content?.object?.type === 'reply';
      // Only match post reactions, not reply reactions
      return !isReplyReaction && objectId === postId;
    });
    
    // Process the reactions to count each emoji type
    const reactionCounts: ReactionCount[] = supportedEmojis.map(emoji => {
      const filteredReactions = matchingReactions.filter(r => {
        const content = r.content as any;
        // For legacy support, treat no emoji as '❤️'
        const reactionEmoji = content?.emoji || '❤️';
        return reactionEmoji === emoji;
      });
      
      const hasReacted = userActorId 
        ? filteredReactions.some(r => r.attributed_to === userActorId)
        : false;
      
      return {
        emoji,
        count: filteredReactions.length,
        hasReacted
      };
    });
    
    return reactionCounts;
  } catch (error) {
    console.error('Error in getPostReactions:', error);
    return supportedEmojis.map(emoji => ({ emoji, count: 0, hasReacted: false }));
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
    
    // Check if the user has already reacted - fetch all and filter
    const { data: allReactions } = await supabase
      .from('ap_objects')
      .select('*')
      .eq('type', 'Like')
      .eq('attributed_to', actor.id);
    
    const existingReaction = allReactions?.find(r => {
      const content = r.content as any;
      const objectId = content?.object?.id;
      return objectId === postId || (typeof objectId === 'string' && objectId.includes(postId));
    });
    
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
