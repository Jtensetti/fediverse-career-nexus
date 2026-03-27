
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Profile view types matching the database schema
export interface ProfileView {
  id: string;
  profile_id: string;
  viewer_id: string | null;
  created_at: string;
}

export interface ProfileViewStats {
  totalViews: number;
  uniqueViewers: number;
  recentViews: ProfileView[];
}

// Record a profile view
export const recordProfileView = async (profileId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const profileView = {
      profile_id: profileId,
      viewer_id: user?.id || null,
    };
    
    const { error } = await supabase
      .from('profile_views')
      .insert(profileView);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error recording profile view:', error);
    return false;
  }
};

// Get profile view statistics
export const getProfileViewStats = async (): Promise<ProfileViewStats | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    // Get total views
    const { count: totalViews, error: countError } = await supabase
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id);
    
    if (countError) throw countError;
    
    // Get unique viewers
    const { data: uniqueData, error: uniqueError } = await supabase
      .from('profile_views')
      .select('viewer_id')
      .eq('profile_id', user.id)
      .not('viewer_id', 'is', null);
    
    if (uniqueError) throw uniqueError;
    
    // Count unique viewer_ids
    const uniqueViewerIds = new Set(uniqueData?.map(v => v.viewer_id) || []);
    
    // Get recent views (last 30)
    const { data: recentViews, error: recentError } = await supabase
      .from('profile_views')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    
    if (recentError) throw recentError;
    
    return {
      totalViews: totalViews || 0,
      uniqueViewers: uniqueViewerIds.size,
      recentViews: (recentViews || []) as ProfileView[]
    };
  } catch (error) {
    console.error('Error fetching profile view stats:', error);
    toast({
      variant: "destructive",
      title: "Failed to load profile view statistics",
      description: "There was an error loading your profile view data."
    });
    return null;
  }
};
