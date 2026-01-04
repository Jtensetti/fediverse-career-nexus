import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PostBoost {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

// Check if user has boosted a post
export const hasUserBoostedPost = async (postId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: actor } = await supabase
      .from('actors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!actor) return false;

    const { data: boost } = await supabase
      .from('ap_objects')
      .select('id')
      .eq('type', 'Announce')
      .eq('attributed_to', actor.id)
      .like('content->object->id', `%${postId}%`)
      .maybeSingle();

    return !!boost;
  } catch (error) {
    return false;
  }
};

// Get boost count for a post
export const getPostBoostCount = async (postId: string): Promise<number> => {
  try {
    const { data: boosts, error } = await supabase
      .from('ap_objects')
      .select('id')
      .eq('type', 'Announce')
      .like('content->object->id', `%${postId}%`);

    if (error) return 0;

    return boosts?.length || 0;
  } catch (error) {
    return 0;
  }
};

// Toggle boost for a post
export const togglePostBoost = async (postId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to boost posts');
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

    // Check if already boosted
    const { data: existingBoost } = await supabase
      .from('ap_objects')
      .select('*')
      .eq('type', 'Announce')
      .eq('attributed_to', actor.id)
      .like('content->object->id', `%${postId}%`)
      .maybeSingle();

    if (existingBoost) {
      // Remove boost
      const { error } = await supabase
        .from('ap_objects')
        .delete()
        .eq('id', existingBoost.id);

      if (error) {
        toast.error(`Error removing boost: ${error.message}`);
        return false;
      }

      toast.success('Boost removed');
      return true;
    } else {
      // Add boost
      const announceActivity = {
        type: 'Announce',
        actor: {
          id: actor.id,
          preferredUsername: actor.preferred_username,
          name: profile?.fullname || profile?.username || actor.preferred_username
        },
        object: {
          id: postId
        },
        published: new Date().toISOString()
      };

      const { error } = await supabase
        .from('ap_objects')
        .insert({
          type: 'Announce',
          content: announceActivity,
          attributed_to: actor.id
        });

      if (error) {
        toast.error(`Error adding boost: ${error.message}`);
        return false;
      }

      toast.success('Post boosted');
      return true;
    }
  } catch (error) {
    toast.error('Failed to process boost. Please try again.');
    return false;
  }
};
