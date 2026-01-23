import { supabase } from "@/integrations/supabase/client";
import { ReactionKey, REACTIONS } from "@/lib/reactions";
import { toast } from "sonner";

export interface ReactionCount {
  reaction: ReactionKey;
  count: number;
  hasReacted: boolean;
}

export interface ToggleReactionResult {
  success: boolean;
  action: 'added' | 'removed' | 'switched' | 'error';
  reaction: ReactionKey;
}

type TargetType = 'post' | 'reply' | 'message';

// Get reactions for a target (post or reply)
export async function getReactions(
  targetType: TargetType,
  targetId: string
): Promise<ReactionCount[]> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Fetch all reactions for this target
    const { data: reactions, error } = await supabase
      .from('reactions')
      .select('reaction, user_id')
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    if (error) {
      console.error('Error fetching reactions:', error);
      return REACTIONS.map(r => ({ reaction: r, count: 0, hasReacted: false }));
    }

    // Count reactions and check user's reaction
    const counts: Record<ReactionKey, { count: number; hasReacted: boolean }> = {} as any;
    REACTIONS.forEach(r => {
      counts[r] = { count: 0, hasReacted: false };
    });

    reactions?.forEach(r => {
      const key = r.reaction as ReactionKey;
      if (counts[key]) {
        counts[key].count++;
        if (userId && r.user_id === userId) {
          counts[key].hasReacted = true;
        }
      }
    });

    return REACTIONS.map(r => ({
      reaction: r,
      count: counts[r].count,
      hasReacted: counts[r].hasReacted,
    }));
  } catch (error) {
    console.error('Error in getReactions:', error);
    return REACTIONS.map(r => ({ reaction: r, count: 0, hasReacted: false }));
  }
}

// Toggle a reaction (add, remove, or switch)
export async function toggleReaction(
  targetType: TargetType,
  targetId: string,
  reaction: ReactionKey
): Promise<ToggleReactionResult> {
  console.log('🎯 toggleReaction called:', { targetType, targetId, reaction });
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('⚠️ toggleReaction: User not authenticated');
      toast.error("Please sign in to react");
      return { success: false, action: 'error', reaction };
    }
    
    console.log('👤 toggleReaction: User authenticated:', user.id);

    // Check for existing reaction
    const { data: existing, error: fetchError } = await supabase
      .from('reactions')
      .select('id, reaction')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing reaction:', fetchError);
      toast.error("Failed to process reaction");
      return { success: false, action: 'error', reaction };
    }

    if (existing) {
      if (existing.reaction === reaction) {
        // Same reaction - remove it
        const { error: deleteError } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existing.id);

        if (deleteError) {
          console.error('❌ toggleReaction: Error removing reaction:', deleteError);
          toast.error("Failed to remove reaction");
          return { success: false, action: 'error', reaction };
        }

        console.log('✅ toggleReaction: Reaction removed successfully');
        return { success: true, action: 'removed', reaction };
      } else {
        // Different reaction - switch it
        const { error: updateError } = await supabase
          .from('reactions')
          .update({ reaction, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (updateError) {
          console.error('❌ toggleReaction: Error switching reaction:', updateError);
          toast.error("Failed to update reaction");
          return { success: false, action: 'error', reaction };
        }

        console.log('✅ toggleReaction: Reaction switched successfully');
        return { success: true, action: 'switched', reaction };
      }
    } else {
      // No existing reaction - add new one
      const { error: insertError } = await supabase
        .from('reactions')
        .insert({
          target_type: targetType,
          target_id: targetId,
          user_id: user.id,
          reaction,
        });

      if (insertError) {
        console.error('❌ toggleReaction: Error adding reaction:', insertError);
        toast.error("Failed to add reaction");
        return { success: false, action: 'error', reaction };
      }
      
      console.log('✅ toggleReaction: Reaction added successfully');

      // Create notification for the content owner
      try {
        let ownerId: string | null = null;
        let parentId: string | null = null;

        if (targetType === 'post') {
          const { data: postData } = await supabase
            .from('ap_objects')
            .select('attributed_to')
            .eq('id', targetId)
            .single();

          if (postData?.attributed_to) {
            const { data: actor } = await supabase
              .from('actors')
              .select('user_id')
              .eq('id', postData.attributed_to)
              .single();
            ownerId = actor?.user_id || null;
          }
        } else if (targetType === 'reply') {
          const { data: replyData } = await supabase
            .from('ap_objects')
            .select('attributed_to, content')
            .eq('id', targetId)
            .single();

          if (replyData?.attributed_to) {
            const { data: actor } = await supabase
              .from('actors')
              .select('user_id')
              .eq('id', replyData.attributed_to)
              .single();
            ownerId = actor?.user_id || null;
            
            // Extract rootPost or inReplyTo for navigation
            const content = replyData.content as any;
            parentId = content?.rootPost || content?.content?.rootPost || 
                       content?.inReplyTo || content?.content?.inReplyTo || null;
          }
        }

        // Don't notify yourself
        if (ownerId && ownerId !== user.id) {
          await supabase.from('notifications').insert({
            type: 'like',
            recipient_id: ownerId,
            actor_id: user.id,
            object_id: targetId,
            object_type: targetType,
            content: JSON.stringify({ 
              parentId: parentId || undefined,
              reaction: reaction 
            }),
          });
        }
      } catch (notifError) {
        // Don't fail the reaction if notification fails
        console.error('Failed to create notification:', notifError);
      }

      return { success: true, action: 'added', reaction };
    }
  } catch (error) {
    console.error('Error in toggleReaction:', error);
    toast.error("Failed to process reaction");
    return { success: false, action: 'error', reaction };
  }
}

// Convenience functions for posts, replies, and messages
export const getPostReactions = (postId: string) => getReactions('post', postId);
export const getReplyReactions = (replyId: string) => getReactions('reply', replyId);
export const getMessageReactions = (messageId: string) => getReactions('message', messageId);
export const togglePostReaction = (postId: string, reaction: ReactionKey) => 
  toggleReaction('post', postId, reaction);
export const toggleReplyReaction = (replyId: string, reaction: ReactionKey) => 
  toggleReaction('reply', replyId, reaction);

interface MessageReactionContext {
  recipientId?: string;
  senderId?: string;
}

// Special function for message reactions that handles notifications properly
export async function toggleMessageReaction(
  messageId: string, 
  reaction: ReactionKey,
  context?: MessageReactionContext
): Promise<ToggleReactionResult> {
  console.log('🎯 toggleMessageReaction called:', { messageId, reaction, context });
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('⚠️ toggleMessageReaction: User not authenticated');
      toast.error("Please sign in to react");
      return { success: false, action: 'error', reaction };
    }

    // Check for existing reaction
    const { data: existing, error: fetchError } = await supabase
      .from('reactions')
      .select('id, reaction')
      .eq('target_type', 'message')
      .eq('target_id', messageId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing reaction:', fetchError);
      toast.error("Failed to process reaction");
      return { success: false, action: 'error', reaction };
    }

    if (existing) {
      if (existing.reaction === reaction) {
        // Same reaction - remove it
        const { error: deleteError } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existing.id);

        if (deleteError) {
          console.error('❌ Error removing message reaction:', deleteError);
          toast.error("Failed to remove reaction");
          return { success: false, action: 'error', reaction };
        }

        console.log('✅ Message reaction removed successfully');
        return { success: true, action: 'removed', reaction };
      } else {
        // Different reaction - switch it
        const { error: updateError } = await supabase
          .from('reactions')
          .update({ reaction, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (updateError) {
          console.error('❌ Error switching message reaction:', updateError);
          toast.error("Failed to update reaction");
          return { success: false, action: 'error', reaction };
        }

        console.log('✅ Message reaction switched successfully');
        return { success: true, action: 'switched', reaction };
      }
    } else {
      // No existing reaction - add new one
      const { error: insertError } = await supabase
        .from('reactions')
        .insert({
          target_type: 'message',
          target_id: messageId,
          user_id: user.id,
          reaction,
        });

      if (insertError) {
        console.error('❌ Error adding message reaction:', insertError);
        toast.error("Failed to add reaction");
        return { success: false, action: 'error', reaction };
      }

      console.log('✅ Message reaction added successfully');

      // Create notification for the message sender (if we have context)
      // The sender is the one who should be notified when someone reacts
      try {
        const messageOwnerId = context?.senderId;
        
        if (messageOwnerId && messageOwnerId !== user.id) {
          await supabase.from('notifications').insert({
            type: 'message_reaction',
            recipient_id: messageOwnerId,
            actor_id: user.id,
            object_id: messageId,
            object_type: 'message',
            content: JSON.stringify({ 
              reaction,
              conversationWith: context?.recipientId === user.id ? context?.senderId : context?.recipientId
            }),
          });
          console.log('✅ Notification created for message reaction');
        }
      } catch (notifError) {
        // Don't fail the reaction if notification fails
        console.error('Failed to create message reaction notification:', notifError);
      }

      return { success: true, action: 'added', reaction };
    }
  } catch (error) {
    console.error('Error in toggleMessageReaction:', error);
    toast.error("Failed to process reaction");
    return { success: false, action: 'error', reaction };
  }
}

// Batch fetch reactions for multiple replies (avoids N+1)
export async function getBatchReplyReactions(
  replyIds: string[]
): Promise<Record<string, ReactionCount[]>> {
  if (replyIds.length === 0) return {};

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    const { data: reactions, error } = await supabase
      .from('reactions')
      .select('reaction, user_id, target_id')
      .eq('target_type', 'reply')
      .in('target_id', replyIds);

    if (error) {
      console.error('Error batch fetching reply reactions:', error);
      return {};
    }

    // Build result map
    const result: Record<string, ReactionCount[]> = {};
    
    replyIds.forEach(replyId => {
      const counts: Record<ReactionKey, { count: number; hasReacted: boolean }> = {} as any;
      REACTIONS.forEach(r => {
        counts[r] = { count: 0, hasReacted: false };
      });
      
      reactions?.filter(r => r.target_id === replyId).forEach(r => {
        const key = r.reaction as ReactionKey;
        if (counts[key]) {
          counts[key].count++;
          if (userId && r.user_id === userId) {
            counts[key].hasReacted = true;
          }
        }
      });
      
      result[replyId] = REACTIONS.map(r => ({
        reaction: r,
        count: counts[r].count,
        hasReacted: counts[r].hasReacted,
      }));
    });

    return result;
  } catch (error) {
    console.error('Error in getBatchReplyReactions:', error);
    return {};
  }
}
