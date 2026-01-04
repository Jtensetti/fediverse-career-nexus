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
}

// Get replies for a post
export const getPostReplies = async (postId: string): Promise<PostReply[]> => {
  try {
    // Fetch all Note objects and filter for replies client-side
    const { data: replies, error } = await supabase
      .from('ap_objects')
      .select(`
        id,
        content,
        created_at,
        actors!ap_objects_attributed_to_fkey (
          user_id,
          preferred_username
        )
      `)
      .eq('type', 'Note')
      .order('created_at', { ascending: true });

    if (error) return [];

    // Filter replies that match the postId
    const matchingReplies = replies?.filter(reply => {
      const content = reply.content as any;
      const inReplyTo = content?.inReplyTo || content?.content?.inReplyTo;
      return inReplyTo === postId || (typeof inReplyTo === 'string' && inReplyTo.includes(postId));
    }) || [];

    const processedReplies = matchingReplies.map(reply => {
      const content = reply.content as any;
      return {
        id: reply.id,
        content: content?.content || '',
        created_at: reply.created_at,
        user_id: (reply.actors as any)?.user_id || '',
        author: {
          username: (reply.actors as any)?.preferred_username || 'Unknown',
          avatar_url: undefined,
          fullname: undefined
        }
      };
    });

    return processedReplies;
  } catch (error) {
    return [];
  }
};

// Create a reply to a post (or to another reply)
export const createPostReply = async (
  postId: string, 
  content: string, 
  parentReplyId?: string
): Promise<boolean> => {
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

    if (!profile) {
      const { data: profileData } = await supabase
        .from('profiles')
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

    toast.success('Reply posted successfully!');
    return true;
  } catch (error) {
    toast.error('An unexpected error occurred');
    return false;
  }
};
