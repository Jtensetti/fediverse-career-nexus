
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
    console.log('💬 Getting replies for post:', postId);
    
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
      console.error('❌ Error fetching replies:', error);
      return [];
    }

    console.log('💬 Raw replies data:', replies);

    const processedReplies = replies?.map(reply => {
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

    console.log('✅ Processed replies:', processedReplies);
    return processedReplies;
  } catch (error) {
    console.error('❌ Error fetching replies:', error);
    return [];
  }
};

// Create a reply to a post
export const createPostReply = async (postId: string, content: string): Promise<boolean> => {
  try {
    console.log('✍️ Creating reply to post:', { postId, content });
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No user found for reply');
      toast.error('You must be logged in to reply');
      return false;
    }

    console.log('👤 User found for reply:', user.id);

    // Get user's actor
    let { data: actor } = await supabase
      .from('actors')
      .select('id, preferred_username')
      .eq('user_id', user.id)
      .single();
    let profile: { username?: string; fullname?: string } | null = null;

    if (!actor) {
      console.log('❌ Actor not found for reply');
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
        console.error('❌ Failed to create actor for reply:', createError);
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

    console.log('🎭 Actor found for reply:', actor);

    // Create reply object
    const replyObject = {
      type: 'Note',
      content: {
        type: 'Note',
        content: content,
        inReplyTo: postId,
        actor: {
          id: actor.id,
          preferredUsername: actor.preferred_username,
          name: profile?.fullname || profile?.username || actor.preferred_username
        },
        published: new Date().toISOString()
      },
      attributed_to: actor.id
    };

    console.log('📝 Creating reply object:', replyObject);

    const { error } = await supabase
      .from('ap_objects')
      .insert(replyObject);

    if (error) {
      console.error('❌ Error creating reply:', error);
      toast.error(`Failed to create reply: ${error.message}`);
      return false;
    }

    console.log('✅ Reply created successfully');
    toast.success('Reply posted successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating reply:', error);
    toast.error('An unexpected error occurred');
    return false;
  }
};
