
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

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

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
  } catch (error) {
    console.error("Error fetching user profile:", error);
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
