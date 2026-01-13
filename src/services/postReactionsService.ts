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

export interface ToggleReactionResult {
  ok: boolean;
  action: 'added' | 'removed' | 'switched';
  previousEmoji?: string;
  emoji: string;
}

const SUPPORTED_EMOJIS = ['❤️', '🎉', '✌️', '🤗', '😮'];

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

// Get all reactions for a specific post - uses JSONB containment query
export const getPostReactions = async (postId: string): Promise<ReactionCount[]> => {
  try {
    const userActorId = await getUserActorId();
    
    // Query Likes that reference this specific post using JSONB containment
    const { data: reactions, error } = await supabase
      .from('ap_objects')
      .select('id, content, attributed_to')
      .eq('type', 'Like')
      .contains('content', { object: { id: postId } });
    
    if (error) {
      console.error('Error fetching post reactions:', error);
      return SUPPORTED_EMOJIS.map(emoji => ({ emoji, count: 0, hasReacted: false }));
    }
    
    // Filter out reply reactions (keep only post reactions)
    const matchingReactions = (reactions || []).filter(r => {
      const content = r.content as any;
      return content?.object?.type !== 'reply';
    });
    
    // Count reactions by emoji
    const reactionCounts: ReactionCount[] = SUPPORTED_EMOJIS.map(emoji => {
      const filteredReactions = matchingReactions.filter(r => {
        const content = r.content as any;
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
    return SUPPORTED_EMOJIS.map(emoji => ({ emoji, count: 0, hasReacted: false }));
  }
};

// Toggle a reaction with proper switching behavior
// - Same emoji clicked: remove reaction
// - Different emoji clicked: switch to new emoji
// - No existing reaction: add new reaction
export const togglePostReaction = async (postId: string, emoji: string): Promise<ToggleReactionResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to react to a post');
      return { ok: false, action: 'added', emoji };
    }

    // Get or create user's actor
    let { data: actor, error: actorError } = await supabase
      .from('actors')
      .select('id, preferred_username')
      .eq('user_id', user.id)
      .maybeSingle();

    if (actorError && actorError.code !== 'PGRST116') {
      console.error('Error fetching actor:', actorError);
      toast.error('Failed to process reaction');
      return { ok: false, action: 'added', emoji };
    }

    let profile: { username?: string; fullname?: string } | null = null;

    if (!actor) {
      // Create actor on the fly
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, fullname')
        .eq('id', user.id)
        .maybeSingle();

      profile = profileData as typeof profile;

      if (!profile?.username) {
        toast.error('Profile not found');
        return { ok: false, action: 'added', emoji };
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
        console.error('Error creating actor:', createError);
        toast.error('Failed to create actor');
        return { ok: false, action: 'added', emoji };
      }

      actor = newActor;
      cachedActorId = newActor.id;
      cachedUserId = user.id;
    }

    // Fetch profile for actor name if not already loaded
    if (!profile) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, fullname')
        .eq('id', user.id)
        .maybeSingle();
      profile = profileData as typeof profile;
    }
    
    // Find existing reaction by this user for this post using JSONB containment
    const { data: allUserLikes } = await supabase
      .from('ap_objects')
      .select('id, content')
      .eq('type', 'Like')
      .eq('attributed_to', actor.id)
      .contains('content', { object: { id: postId } });
    
    // Find the exact match for this post (not a reply reaction)
    const existingReaction = allUserLikes?.find(r => {
      const content = r.content as any;
      return content?.object?.type !== 'reply';
    });
    
    if (existingReaction) {
      const existingContent = existingReaction.content as any;
      const existingEmoji = existingContent?.emoji || '❤️';
      
      if (existingEmoji === emoji) {
        // Same emoji - remove reaction
        const { error } = await supabase
          .from('ap_objects')
          .delete()
          .eq('id', existingReaction.id);
        
        if (error) {
          console.error('Error removing reaction:', error);
          toast.error('Failed to remove reaction');
          return { ok: false, action: 'removed', emoji };
        }
        
        return { ok: true, action: 'removed', emoji };
      } else {
        // Different emoji - switch reaction by updating the existing row
        const updatedContent = {
          ...existingContent,
          emoji: emoji
        };
        
        const { error } = await supabase
          .from('ap_objects')
          .update({ content: updatedContent })
          .eq('id', existingReaction.id);
        
        if (error) {
          console.error('Error switching reaction:', error);
          toast.error('Failed to switch reaction');
          return { ok: false, action: 'switched', previousEmoji: existingEmoji, emoji };
        }
        
        return { ok: true, action: 'switched', previousEmoji: existingEmoji, emoji };
      }
    } else {
      // No existing reaction - add new one
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
        console.error('Error adding reaction:', error);
        toast.error('Failed to add reaction');
        return { ok: false, action: 'added', emoji };
      }
      
      return { ok: true, action: 'added', emoji };
    }
  } catch (error) {
    console.error('Error in togglePostReaction:', error);
    toast.error('Failed to process reaction');
    return { ok: false, action: 'added', emoji };
  }
};
