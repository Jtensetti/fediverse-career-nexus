
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
    console.log('🔍 Checking boost status for post:', postId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ No user found for boost check');
      return false;
    }

    console.log('👤 User found for boost check:', user.id);

    const { data: actor } = await supabase
      .from('actors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!actor) {
      console.log('❌ No actor found for boost check');
      return false;
    }

    console.log('🎭 Actor found for boost check:', actor.id);

    const { data: boost } = await supabase
      .from('ap_objects')
      .select('id')
      .eq('type', 'Announce')
      .eq('attributed_to', actor.id)
      .like('content->object->id', `%${postId}%`)
      .maybeSingle();

    const hasBoosted = !!boost;
    console.log('🔄 Boost status:', hasBoosted);
    return hasBoosted;
  } catch (error) {
    console.error('❌ Error checking boost status:', error);
    return false;
  }
};

// Get boost count for a post
export const getPostBoostCount = async (postId: string): Promise<number> => {
  try {
    console.log('📊 Getting boost count for post:', postId);
    
    const { data: boosts, error } = await supabase
      .from('ap_objects')
      .select('id')
      .eq('type', 'Announce')
      .like('content->object->id', `%${postId}%`);

    if (error) {
      console.error('❌ Error fetching boost count:', error);
      return 0;
    }

    const count = boosts?.length || 0;
    console.log('📊 Boost count:', count);
    return count;
  } catch (error) {
    console.error('❌ Error getting boost count:', error);
    return 0;
  }
};

// Toggle boost for a post
export const togglePostBoost = async (postId: string): Promise<boolean> => {
  try {
    console.log('🔄 Toggling boost for post:', postId);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No user found for boost');
      toast.error('You must be logged in to boost posts');
      return false;
    }

    console.log('👤 User found for boost:', user.id);

    // Get user's actor
    let { data: actor } = await supabase
      .from('actors')
      .select('id, preferred_username')
      .eq('user_id', user.id)
      .single();
    let profile: { username?: string; fullname?: string } | null = null;

    if (!actor) {
      console.log('❌ Actor not found for boost');
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
        console.error('❌ Failed to create actor for boost:', createError);
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

    console.log('🎭 Actor found for boost:', actor);

    // Check if already boosted
    const { data: existingBoost } = await supabase
      .from('ap_objects')
      .select('*')
      .eq('type', 'Announce')
      .eq('attributed_to', actor.id)
      .like('content->object->id', `%${postId}%`)
      .maybeSingle();

    console.log('🔍 Existing boost check:', existingBoost);

    if (existingBoost) {
      console.log('🗑️ Removing existing boost');
      // Remove boost
      const { error } = await supabase
        .from('ap_objects')
        .delete()
        .eq('id', existingBoost.id);

      if (error) {
        console.error('❌ Error removing boost:', error);
        toast.error(`Error removing boost: ${error.message}`);
        return false;
      }

      console.log('✅ Boost removed successfully');
      toast.success('Boost removed');
      return true;
    } else {
      console.log('➕ Adding new boost');
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

      console.log('📝 Creating announce activity:', announceActivity);

      const { error } = await supabase
        .from('ap_objects')
        .insert({
          type: 'Announce',
          content: announceActivity,
          attributed_to: actor.id
        });

      if (error) {
        console.error('❌ Error adding boost:', error);
        toast.error(`Error adding boost: ${error.message}`);
        return false;
      }

      console.log('✅ Boost added successfully');
      toast.success('Post boosted');
      return true;
    }
  } catch (error) {
    console.error('❌ Error toggling boost:', error);
    toast.error('Failed to process boost. Please try again.');
    return false;
  }
};
