import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PostReply {
  id: string;
  content: string;
  author: {
    username: string;
    avatar_url?: string;
    fullname?: string;
  };
  created_at: string;
  user_id: string;
  parent_reply_id?: string | null; // For threading support
}

/**
 * Safely extract the text content from various ActivityPub content structures.
 * Handles:
 * - Direct strings
 * - { content: "text" }
 * - { content: { content: "text" } }
 * - Corrupted "char-map" objects where a string was spread ({ "0": "H", "1": "i", ..., "content": "actual text" })
 */
function extractReplyText(raw: unknown): string {
  // Direct string
  if (typeof raw === 'string') {
    return raw;
  }

  // Not an object at all
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return '';
  }

  const obj = raw as Record<string, unknown>;

  // Check if obj.content exists
  const innerContent = obj.content;

  // If innerContent is a string, return it
  if (typeof innerContent === 'string') {
    return innerContent;
  }

  // If innerContent is an object, dig deeper
  if (innerContent !== null && typeof innerContent === 'object') {
    const inner = innerContent as Record<string, unknown>;

    // Check for nested content field (normal structure or char-map with content field)
    if (typeof inner.content === 'string') {
      return inner.content;
    }

    // If inner.content is also an object, try one more level
    if (inner.content !== null && typeof inner.content === 'object') {
      const deepInner = inner.content as Record<string, unknown>;
      if (typeof deepInner.content === 'string') {
        return deepInner.content;
      }
    }

    // Fallback: check if this looks like a char-map (keys are "0", "1", "2"...)
    // but doesn't have a content field - we can't recover
    if ('0' in inner && '1' in inner) {
      console.warn('[extractReplyText] Detected char-map without recoverable content field');
      return '';
    }
  }

  // Fallback: return empty string
  console.warn('[extractReplyText] Unexpected content structure:', JSON.stringify(raw).slice(0, 200));
  return '';
}

// Get replies for a post (including nested replies via rootPost)
export const getPostReplies = async (postId: string): Promise<PostReply[]> => {
  try {
    // Use RPC function to properly filter by JSON fields
    // PostgREST .or() doesn't support JSON operators, so we use a database function
    const { data: replies, error } = await supabase
      .rpc('get_post_replies', { 
        post_id: postId,
        max_replies: 50 
      });

    if (error) {
      console.error('Error fetching replies:', error);
      return [];
    }

    // Get user IDs to fetch profiles for display names
    const userIds = (replies || [])
      .map((r: any) => r.actor_user_id)
      .filter(Boolean);

    let profilesMap: Record<string, { fullname?: string; username?: string; avatar_url?: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, fullname, username, avatar_url')
        .in('id', userIds);

      if (profiles) {
        profilesMap = Object.fromEntries(
          profiles.map(p => [p.id, { 
            fullname: p.fullname || undefined, 
            username: p.username || undefined, 
            avatar_url: p.avatar_url || undefined 
          }])
        );
      }
    }

    return (replies || []).map((reply: any) => {
      const content = reply.content as any;
      const profile = reply.actor_user_id ? profilesMap[reply.actor_user_id] : undefined;
      
      // Determine parent_reply_id: if inReplyTo is NOT the main post, it's a parent reply
      const inReplyTo = content?.inReplyTo || content?.content?.inReplyTo;
      const parentReplyId = inReplyTo && inReplyTo !== postId ? inReplyTo : null;

      // Use safe extraction to always get a string
      const textContent = extractReplyText(content);

      return {
        id: reply.id,
        content: textContent,
        created_at: reply.created_at,
        user_id: reply.actor_user_id || '',
        parent_reply_id: parentReplyId,
        author: {
          username: profile?.username || reply.actor_username || 'Unknown',
          avatar_url: profile?.avatar_url,
          fullname: profile?.fullname
        }
      };
    });
  } catch (error) {
    console.error('Error in getPostReplies:', error);
    return [];
  }
};

// Helper to get comment owner
async function getCommentOwner(commentId: string): Promise<string | null> {
  const { data } = await supabase
    .from('ap_objects')
    .select('attributed_to')
    .eq('id', commentId)
    .single();
  
  if (!data?.attributed_to) return null;
  
  // Get the user_id from the actor via safe public view (actors table is RLS-restricted)
  const { data: actor } = await supabase
    .from('public_actors')
    .select('user_id')
    .eq('id', data.attributed_to)
    .maybeSingle();
  
  return actor?.user_id || null;
}

// Update a comment/reply
export async function updatePostReply(commentId: string, content: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to edit a comment');

  const ownerId = await getCommentOwner(commentId);
  if (ownerId !== user.id) {
    throw new Error('You can only edit your own comments');
  }

  // Get current content to preserve structure
  const { data: currentData, error: fetchError } = await supabase
    .from('ap_objects')
    .select('content')
    .eq('id', commentId)
    .single();

  if (fetchError || !currentData) {
    throw new Error('Comment not found');
  }

  const currentContent = currentData.content as Record<string, unknown>;
  
  // Safely extract existing inner content - handle corrupt structures
  let innerContent: Record<string, string | Record<string, unknown>> = {};
  const rawInner = currentContent.content;
  
  if (rawInner !== null && typeof rawInner === 'object' && !Array.isArray(rawInner)) {
    const inner = rawInner as Record<string, unknown>;
    // Only preserve valid fields, ignore char-map keys like "0", "1", etc.
    const validKeys = ['type', 'inReplyTo', 'rootPost', 'actor', 'published'];
    for (const key of validKeys) {
      if (key in inner && inner[key] !== undefined) {
        innerContent[key] = inner[key] as string | Record<string, unknown>;
      }
    }
  }
  
  // Build clean updated content structure with explicit type casting for Json compatibility
  const updatedInner = {
    ...innerContent,
    type: (innerContent.type as string) || 'Note',
    content: content, // Plain text - always a string
    updated: new Date().toISOString()
  };
  
  const updatedContent = {
    ...currentContent,
    content: updatedInner
  } as Record<string, unknown>;

  const { error } = await supabase
    .from('ap_objects')
    .update({ 
      content: updatedContent as unknown as Record<string, never>,
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId);

  if (error) throw new Error('Failed to update comment');
}

// Delete a comment/reply
export async function deletePostReply(commentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to delete a comment');

  const ownerId = await getCommentOwner(commentId);
  if (ownerId !== user.id) {
    throw new Error('You can only delete your own comments');
  }

  // Delete the comment
  const { error } = await supabase
    .from('ap_objects')
    .delete()
    .eq('id', commentId);

  if (error) throw new Error('Failed to delete comment');
}

// Create a reply to a post (or to another reply)
export async function createPostReply(
  postId: string, 
  content: string, 
  parentReplyId?: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to reply');
      return false;
    }

    // Get user's actor
    let { data: actor } = await supabase
      .from('actors')
      .select('id, preferred_username')
      .eq('user_id', user.id)
      .single();
    let profile: { username?: string; fullname?: string } | null = null;

    if (!actor) {
      // Attempt to create actor automatically
      const { data: profileData } = await supabase
        .from('public_profiles')
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

    if (!profile) {
      const { data: profileData } = await supabase
        .from('public_profiles')
        .select('username, fullname')
        .eq('id', user.id)
        .single();
      profile = profileData as typeof profile;
    }

    // Create reply object - if parentReplyId is provided, reply to that instead
    const inReplyTo = parentReplyId || postId;
    
    const replyObject = {
      type: 'Note',
      content: {
        type: 'Note',
        content: content,
        inReplyTo: inReplyTo,
        rootPost: postId, // Keep reference to original post for threading
        actor: {
          id: actor.id,
          preferredUsername: actor.preferred_username,
          name: profile?.fullname || profile?.username || actor.preferred_username
        },
        published: new Date().toISOString()
      },
      attributed_to: actor.id
    };

    const { error } = await supabase
      .from('ap_objects')
      .insert(replyObject);

    if (error) {
      toast.error(`Failed to create reply: ${error.message}`);
      return false;
    }

    // Create notification for the post author
    try {
      const { data: postData } = await supabase
        .from('ap_objects')
        .select('attributed_to')
        .eq('id', postId)
        .single();

      if (postData?.attributed_to) {
        const { data: postActor } = await supabase
          .from('public_actors')
          .select('user_id')
          .eq('id', postData.attributed_to)
          .maybeSingle();

        // Don't notify yourself
        if (postActor?.user_id && postActor.user_id !== user.id) {
          await supabase.from('notifications').insert({
            type: 'reply',
            recipient_id: postActor.user_id,
            actor_id: user.id,
            object_id: postId,
            object_type: 'post',
            content: content.substring(0, 100)
          });
        }
      }
    } catch (notifError) {
      // Don't fail the reply if notification fails
      console.error('Failed to create notification:', notifError);
    }

    toast.success('Reply posted successfully!');
    return true;
  } catch (error) {
    toast.error('An unexpected error occurred');
    return false;
  }
};
