
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  headline?: string;
  bio?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  domain?: string;
  connections?: number;
  profileViews?: number;
  networkVisibilityEnabled?: boolean;
  connectionDegree?: number;
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
  };
  experience?: Experience[];
  education?: Education[];
  skills?: Skill[];
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  isCurrentRole: boolean;
  startDate: string;
  endDate?: string;
  location?: string;
  description?: string;
  isVerified?: boolean;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  startYear: number;
  endYear?: number;
  isVerified?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  endorsements: number;
}

/**
 * Ensure a profile row exists for the given user. If none is found,
 * a minimal profile will be created with a fallback username.
 */
export const ensureUserProfile = async (userId: string) => {
  try {
    console.log('🔍 ensureUserProfile: Checking profile for user:', userId);
    
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, fullname')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('ensureUserProfile: error fetching profile:', error);
      return null;
    }

    if (!profile) {
      console.log('ensureUserProfile: Creating new profile for user:', userId);
      const username = `user_${userId.slice(0, 8)}`;
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ 
          id: userId, 
          username, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, username, fullname')
        .single();

      if (insertError || !newProfile) {
        console.error('ensureUserProfile: failed to create profile:', insertError);
        return null;
      }

      profile = newProfile;
      console.log('✅ ensureUserProfile: Created new profile:', profile);
    } else {
      console.log('✅ ensureUserProfile: Found existing profile:', profile);
    }

    return profile;
  } catch (err) {
    console.error('ensureUserProfile: unexpected error:', err);
    return null;
  }
};

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    // Check session first
    const { data: { session } } = await supabase.auth.getSession();
    console.log('👤 getCurrentUserProfile - Session check:', {
      has_session: !!session,
      user_id: session?.user?.id,
      email: session?.user?.email
    });
    
    if (!session?.user) {
      console.error('❌ No session found in getCurrentUserProfile');
      return null;
    }

    const user = session.user;

    // First ensure the profile exists
    const ensuredProfile = await ensureUserProfile(user.id);
    if (!ensuredProfile) {
      console.error('❌ Failed to ensure profile exists');
      return null;
    }

    // Get user profile
    console.log('🔍 Fetching complete profile for user:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      throw profileError;
    }

    if (!profile) {
      console.error('❌ No profile found after ensuring it exists');
      return null;
    }

    console.log('📋 Profile data:', profile);

    // Get experience
    const { data: experience, error: experienceError } = await supabase
      .from("experiences")
      .select("*")
      .eq("user_id", user.id);

    if (experienceError) throw experienceError;

    // Get education
    const { data: education, error: educationError } = await supabase
      .from("education")
      .select("*")
      .eq("user_id", user.id);

    if (educationError) throw educationError;

    // Get skills
    const { data: skills, error: skillsError } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", user.id);

    if (skillsError) throw skillsError;

    // Get user settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("show_network_connections")
      .eq("user_id", user.id)
      .single();

    if (settingsError && settingsError.code !== "PGRST116") throw settingsError;

    // Get connection count
    const { count: connectionCount, error: connectionError } = await supabase
      .from("user_connections")
      .select("*", { count: "exact", head: true })
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
      .eq("status", "accepted");

    if (connectionError) throw connectionError;

    const userProfile = {
      id: profile.id,
      username: profile.username || `user_${user.id.slice(0, 8)}`,
      displayName: profile.fullname || profile.username || `user_${user.id.slice(0, 8)}`,
      headline: profile.headline || "",
      bio: profile.bio || "",
      avatarUrl: profile.avatar_url,
      isVerified: profile.is_verified || false,
      domain: profile.domain || "",
      connections: connectionCount || 0,
      profileViews: profile.profile_views || 0,
      networkVisibilityEnabled: settings?.show_network_connections ?? true,
      connectionDegree: 0, // Self profile is 0 degree
      contact: {
        email: user.email,
        phone: profile.phone || "",
        location: profile.location || ""
      },
      experience: (experience || []).map(exp => ({
        id: exp.id,
        title: exp.title,
        company: exp.company,
        isCurrentRole: exp.is_current_role,
        startDate: exp.start_date,
        endDate: exp.end_date,
        location: exp.location,
        description: exp.description,
        isVerified: exp.verification_status === "verified"
      })),
      education: (education || []).map(edu => ({
        id: edu.id,
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        startYear: edu.start_year,
        endYear: edu.end_year,
        isVerified: edu.verification_status === "verified"
      })),
      skills: (skills || []).map(skill => ({
        id: skill.id,
        name: skill.name,
        endorsements: skill.endorsements || 0
      }))
    };

    console.log('✅ User profile assembled:', {
      id: userProfile.id,
      username: userProfile.username,
      displayName: userProfile.displayName,
      hasEmail: !!userProfile.contact?.email
    });

    return userProfile;
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    toast.error("Failed to load profile data");
    return null;
  }
};

export const getUserProfileByUsername = async (username: string): Promise<UserProfile | null> => {
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (profileError) throw profileError;

    // Get current authenticated user for comparison
    const { data: { user } } = await supabase.auth.getUser();
    const isOwnProfile = user?.id === profile.id;

    // Get experience
    const { data: experience, error: experienceError } = await supabase
      .from("experiences")
      .select("*")
      .eq("user_id", profile.id);

    if (experienceError) throw experienceError;

    // Get education
    const { data: education, error: educationError } = await supabase
      .from("education")
      .select("*")
      .eq("user_id", profile.id);

    if (educationError) throw educationError;

    // Get skills
    const { data: skills, error: skillsError } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", profile.id);

    if (skillsError) throw skillsError;

    // Get user settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("show_network_connections")
      .eq("user_id", profile.id)
      .single();

    // Don't throw for no settings
    const networkVisibilityEnabled = settingsError ? true : (settings?.show_network_connections ?? true);

    // Get connection count
    const { count: connectionCount, error: connectionError } = await supabase
      .from("user_connections")
      .select("*", { count: "exact", head: true })
      .or(`user_id.eq.${profile.id},connected_user_id.eq.${profile.id}`)
      .eq("status", "accepted");

    if (connectionError) throw connectionError;

    // If we have a current user, get connection degree with viewed profile
    let connectionDegree = null;
    if (user && !isOwnProfile) {
      const { data: degreeData } = await supabase.rpc("get_connection_degree", {
        source_user_id: user.id,
        target_user_id: profile.id
      });
      connectionDegree = degreeData;
    }

    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.fullname || profile.username,
      headline: profile.headline || "",
      bio: profile.bio || "",
      avatarUrl: profile.avatar_url,
      isVerified: profile.is_verified || false,
      domain: profile.domain || "",
      connections: connectionCount || 0,
      profileViews: profile.profile_views || 0,
      networkVisibilityEnabled,
      connectionDegree,
      contact: {
        email: isOwnProfile ? user?.email : null,
        phone: profile.phone || "",
        location: profile.location || ""
      },
      experience: (experience || []).map(exp => ({
        id: exp.id,
        title: exp.title,
        company: exp.company,
        isCurrentRole: exp.is_current_role,
        startDate: exp.start_date,
        endDate: exp.end_date,
        location: exp.location,
        description: exp.description,
        isVerified: exp.verification_status === "verified"
      })),
      education: (education || []).map(edu => ({
        id: edu.id,
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        startYear: edu.start_year,
        endYear: edu.end_year,
        isVerified: edu.verification_status === "verified"
      })),
      skills: (skills || []).map(skill => ({
        id: skill.id,
        name: skill.name,
        endorsements: skill.endorsements || 0
      }))
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    toast.error("Failed to load profile data");
    return null;
  }
};
