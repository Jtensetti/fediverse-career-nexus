
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export type ProfileViewStats = {
  totalViews: number;
  uniqueViewers: number;
  recentViews: {
    id: string;
    viewer_id: string | null;
    viewed_at: string;
  }[];
}

/**
 * Record a profile view when a user views another user's profile
 */
export const recordProfileView = async (viewedUserId: string) => {
  try {
    // Don't record if viewing own profile
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id === viewedUserId) {
      return;
    }

    // Record the profile view
    const { error } = await supabase.from('profile_views').insert({
      viewer_id: session.user.id,
      viewed_id: viewedUserId,
    });

    if (error) {
      console.error("Error recording profile view:", error);
    }
  } catch (error) {
    console.error("Error in recordProfileView:", error);
  }
};

/**
 * Get profile view statistics for a user
 */
export const getProfileViewStats = async (): Promise<ProfileViewStats | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }

    // Get total views count
    const { count: totalViews, error: countError } = await supabase
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('viewed_id', session.user.id);

    // Get unique viewers count
    const { count: uniqueViewers, error: uniqueError } = await supabase
      .from('profile_views')
      .select('viewer_id', { count: 'exact', head: true })
      .eq('viewed_id', session.user.id)
      .not('viewer_id', 'is', null);

    // Get recent views (last 10)
    const { data: recentViews, error: recentError } = await supabase
      .from('profile_views')
      .select('id, viewer_id, viewed_at')
      .eq('viewed_id', session.user.id)
      .order('viewed_at', { ascending: false })
      .limit(10);

    if (countError || uniqueError || recentError) {
      console.error("Error fetching profile view stats:", countError || uniqueError || recentError);
      return null;
    }

    return {
      totalViews: totalViews || 0,
      uniqueViewers: uniqueViewers || 0,
      recentViews: recentViews || [],
    };
  } catch (error) {
    console.error("Error in getProfileViewStats:", error);
    return null;
  }
};

/**
 * Get the user's profile visibility settings
 */
export const getProfileVisibilitySettings = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return true; // Default to true if not logged in
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('show_profile_visitors')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error("Error fetching profile visibility settings:", error);
      return true;
    }

    return data?.show_profile_visitors ?? true;
  } catch (error) {
    console.error("Error in getProfileVisibilitySettings:", error);
    return true;
  }
};

/**
 * Update the user's profile visibility settings
 */
export const updateProfileVisibilitySettings = async (showProfileVisitors: boolean): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to update settings",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: session.user.id,
        show_profile_visitors: showProfileVisitors,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Error updating profile visibility settings:", error);
      toast({
        title: "Error updating settings",
        description: "Your settings could not be updated",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Settings updated",
      description: `Profile visitors ${showProfileVisitors ? 'visible' : 'hidden'}`,
    });
    return true;
  } catch (error) {
    console.error("Error in updateProfileVisibilitySettings:", error);
    return false;
  }
};
