import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReplyReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface ToggleReplyReactionResult {
  ok: boolean;
  action: 'added' | 'removed' | 'switched';
  previousEmoji?: string;
  emoji: string;
}

const SUPPORTED_EMOJIS = ['❤️', '🎉', '✌️', '🤗', '😮'];

// Cache for user actor ID
let cachedActorId: string | null = null;
let cachedUserId: string | null = null;

const getUserActorId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  if (!userId) return null;
  
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

// Get reactions for a specific reply/comment
export const getReplyReactions = async (replyId: string): Promise<ReplyReactionCount[]> => {
  try {
    const userActorId = await getUserActorId();
    
    // Query Likes that reference this reply
    const { data: reactions, error } = await supabase
      .from('ap_objects')
      .select('id, content, attributed_to')
      .eq('type', 'Like')
      .textSearch('content', replyId, { type: 'plain' });
    
    if (error) {
      console.error('Error fetching reply reactions:', error);
      return SUPPORTED_EMOJIS.map(emoji => ({ emoji, count: 0, hasReacted: false }));
    }
    
    // Filter to exact matches for this reply
    const matchingReactions = (reactions || []).filter(r => {
      const content = r.content as any;
      const objectId = content?.object?.id;
      const objectType = content?.object?.type;
      return objectId === replyId && objectType === 'reply';
    });
    
    // Count by emoji
    const reactionCounts: ReplyReactionCount[] = SUPPORTED_EMOJIS.map(emoji => {
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
    console.error('Error in getReplyReactions:', error);
    return SUPPORTED_EMOJIS.map(emoji => ({ emoji, count: 0, hasReacted: false }));
  }
};

// Get single reaction count (shorthand for heart)
export const getReplyLikeCount = async (replyId: string): Promise<{ count: number; hasReacted: boolean }> => {
  const reactions = await getReplyReactions(replyId);
  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);
  const hasReacted = reactions.some(r => r.hasReacted);
  return { count: totalCount, hasReacted };
};

// Toggle a reaction on a reply with proper switching behavior
export const toggleReplyReaction = async (replyId: string, emoji: string = '❤️'): Promise<ToggleReplyReactionResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to react');
      return { ok: false, action: 'added', emoji };
    }

    // Get or create actor
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

    if (!profile) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, fullname')
        .eq('id', user.id)
        .maybeSingle();
      profile = profileData as typeof profile;
    }
    
    // Find existing reaction by this user for this reply
    const { data: allUserLikes } = await supabase
      .from('ap_objects')
      .select('id, content')
      .eq('type', 'Like')
      .eq('attributed_to', actor.id)
      .textSearch('content', replyId, { type: 'plain' });
    
    const existingReaction = allUserLikes?.find(r => {
      const content = r.content as any;
      const objectId = content?.object?.id;
      const objectType = content?.object?.type;
      return objectId === replyId && objectType === 'reply';
    });
    
    if (existingReaction) {
      const existingContent = existingReaction.content as any;
      const existingEmoji = existingContent?.emoji || '❤️';
      
      if (existingEmoji === emoji) {
        // Same emoji - remove
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
        // Different emoji - switch
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
      // Add new reaction
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
        console.error('Error adding reaction:', error);
        toast.error('Failed to add reaction');
        return { ok: false, action: 'added', emoji };
      }
      
      return { ok: true, action: 'added', emoji };
    }
  } catch (error) {
    console.error('Error in toggleReplyReaction:', error);
    toast.error('Failed to process reaction');
    return { ok: false, action: 'added', emoji };
  }
};
