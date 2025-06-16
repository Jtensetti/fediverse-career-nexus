
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
      .like('content->inReplyTo', `%${postId}%`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching replies:', error);
      return [];
    }

    return replies?.map(reply => {
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
    }) || [];
  } catch (error) {
    console.error('Error fetching replies:', error);
    return [];
  }
};

// Create a reply to a post
export const createPostReply = async (postId: string, content: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to reply');
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

    // Create reply object
    const replyObject = {
      type: 'Note',
      content: {
        type: 'Note',
        content: content,
        inReplyTo: postId,
        actor: {
          id: actor.id,
          preferredUsername: actor.preferred_username
        },
        published: new Date().toISOString()
      },
      attributed_to: actor.id
    };

    const { error } = await supabase
      .from('ap_objects')
      .insert(replyObject);

    if (error) {
      console.error('Error creating reply:', error);
      toast.error(`Failed to create reply: ${error.message}`);
      return false;
    }

    toast.success('Reply posted successfully!');
    return true;
  } catch (error) {
    console.error('Error creating reply:', error);
    toast.error('An unexpected error occurred');
    return false;
  }
};
