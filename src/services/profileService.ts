import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Lightweight profile data for hover cards - single query, no joins
export interface ProfilePreview {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  headline?: string;
  isVerified?: boolean;
  contact?: {
    location?: string;
  };
  connections?: number;
  experience?: Array<{
    title: string;
    company: string;
  }>;
}

/**
 * Lightweight profile fetch for hover cards - single query only
 * Reduces 7 queries to 1 query per hover card
 */
export const getProfilePreview = async (usernameOrId: string): Promise<ProfilePreview | null> => {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameOrId);

    const { data: profile, error } = await supabase
      .from("public_profiles")
      .select("id, username, fullname, headline, avatar_url, is_verified, location")
      .eq(isUUID ? "id" : "username", usernameOrId)
      .maybeSingle();

    if (error || !profile) return null;

    return {
      id: profile.id,
      username: profile.username || undefined,
      displayName: profile.fullname || profile.username || undefined,
      avatarUrl: profile.avatar_url || undefined,
      headline: profile.headline || undefined,
      isVerified: profile.is_verified || false,
      contact: {
        location: profile.location || undefined,
      },
    };
  } catch (error) {
    console.error("Error fetching profile preview:", error);
    return null;
  }
};

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  headline?: string;
  bio?: string;
  avatarUrl?: string;
  headerUrl?: string;
  isVerified?: boolean;
  connections?: number;
  networkVisibilityEnabled?: boolean;
  connectionDegree?: number;
  // Federated auth fields
  authType?: "local" | "federated";
  homeInstance?: string;
  remoteActorUrl?: string;
  // Freelancer fields
  isFreelancer?: boolean;
  freelancerSkills?: string[];
  freelancerRate?: string;
  freelancerAvailability?: string;
  // Contact fields
  website?: string;
  contactEmail?: string;
  contact?: {
    email?: string | null;
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
    console.log("🔍 ensureUserProfile: Checking profile for user:", userId);

    let { data: profile, error } = await supabase
      .from("public_profiles")
      .select("id, username, fullname")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("ensureUserProfile: error fetching profile:", error);
      return null;
    }

    if (!profile) {
      console.log("ensureUserProfile: Creating new profile for user:", userId);

      // Try to get user metadata for name
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const metadata = user?.user_metadata || {};
      const firstName = metadata.first_name || "";
      const lastName = metadata.last_name || "";
      const email = user?.email || "";
      const fullname = metadata.fullname || `${firstName} ${lastName}`.trim() || null;

      // Check for preferred_username from signup
      const preferredUsername = metadata.preferred_username;

      // Generate username with improved algorithm
      let username: string;

      if (preferredUsername && /^[a-z0-9_]{3,20}$/.test(preferredUsername)) {
        // Use the preferred username if valid
        username = preferredUsername;
      } else if (firstName && lastName) {
        // e.g., "jonatan_tensetti" from "Jonatan Tensetti"
        const baseUsername = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
        // Clean up non-alphanumeric characters and limit length
        username = baseUsername.replace(/[^a-z0-9_]/g, "").substring(0, 20);

        // If username is too short after cleanup, add first name only
        if (username.length < 3) {
          username = firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
        }
      } else if (email) {
        // Use email prefix: "john.doe@gmail.com" → "john_doe"
        const emailPrefix = email
          .split("@")[0]
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        username = emailPrefix.substring(0, 20);

        // If still too short, add random suffix
        if (username.length < 3) {
          username = `user_${Math.random().toString(36).substring(2, 8)}`;
        }
      } else {
        // Last resort: short random suffix
        username = `user_${Math.random().toString(36).substring(2, 8)}`;
      }

      // Check for uniqueness and add suffix if needed
      const { data: existingUser } = await supabase
        .from("public_profiles")
        .select("username")
        .eq("username", username)
        .maybeSingle();

      if (existingUser) {
        // Add random suffix to make unique
        username = `${username.substring(0, 15)}_${Math.random().toString(36).substring(2, 6)}`;
      }

      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          username,
          fullname,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id, username, fullname")
        .single();

      if (insertError || !newProfile) {
        console.error("ensureUserProfile: failed to create profile:", insertError);
        return null;
      }

      profile = newProfile;
      console.log("✅ ensureUserProfile: Created new profile:", profile);
    } else {
      console.log("✅ ensureUserProfile: Found existing profile:", profile);
    }

    return profile;
  } catch (err) {
    console.error("ensureUserProfile: unexpected error:", err);
    return null;
  }
};

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    // Check session first
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log("👤 getCurrentUserProfile - Session check:", {
      has_session: !!session,
      user_id: session?.user?.id,
      email: session?.user?.email,
    });

    if (!session?.user) {
      console.error("❌ No session found in getCurrentUserProfile");
      return null;
    }

    const user = session.user;

    // First ensure the profile exists
    const ensuredProfile = await ensureUserProfile(user.id);
    if (!ensuredProfile) {
      console.error("❌ Failed to ensure profile exists");
      return null;
    }

    // Get user profile - for own profile, fetch from base profiles table to include phone
    console.log("🔍 Fetching complete profile for user:", user.id);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("❌ Profile fetch error:", profileError);
      throw profileError;
    }

    if (!profile) {
      console.error("❌ No profile found after ensuring it exists");
      return null;
    }

    console.log("📋 Profile data:", profile);

    // Get experience - ordered by current role first, then by start date descending
    const { data: experience, error: experienceError } = await supabase
      .from("experiences")
      .select("*")
      .eq("user_id", user.id)
      .order("is_current_role", { ascending: false })
      .order("start_date", { ascending: false, nullsFirst: false });

    if (experienceError) throw experienceError;

    // Get education
    const { data: education, error: educationError } = await supabase
      .from("education")
      .select("*")
      .eq("user_id", user.id);

    if (educationError) throw educationError;

    // Get skills
    const { data: skills, error: skillsError } = await supabase.from("skills").select("*").eq("user_id", user.id);

    if (skillsError) throw skillsError;

    // Get user settings - use maybeSingle to avoid 406 errors when no settings exist
    const { data: settings } = await supabase
      .from("user_settings")
      .select("show_network_connections")
      .eq("user_id", user.id)
      .maybeSingle();

    // Don't throw for missing settings, use default value

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
      headerUrl: profile.header_url,
      isVerified: profile.is_verified || false,
      domain: profile.domain || "",
      connections: connectionCount || 0,
      profileViews: profile.profile_views || 0,
      networkVisibilityEnabled: settings?.show_network_connections ?? true,
      connectionDegree: 0, // Self profile is 0 degree
      // Federated auth fields
      authType: (profile.auth_type as "local" | "federated") || "local",
      homeInstance: profile.home_instance || undefined,
      remoteActorUrl: profile.remote_actor_url || undefined,
      // Freelancer fields
      isFreelancer: profile.is_freelancer || false,
      freelancerSkills: profile.freelancer_skills || [],
      freelancerRate: profile.freelancer_rate || undefined,
      freelancerAvailability: profile.freelancer_availability || undefined,
      website: profile.website || undefined,
      contactEmail: profile.contact_email || undefined,
      contact: {
        email: user.email,
        phone: profile.phone || "",
        location: profile.location || "",
      },
      experience: (experience || []).map((exp) => ({
        id: exp.id,
        title: exp.title,
        company: exp.company,
        isCurrentRole: exp.is_current_role,
        startDate: exp.start_date,
        endDate: exp.end_date,
        location: exp.location,
        description: exp.description,
        isVerified: exp.verification_status === "verified",
      })),
      education: (education || []).map((edu) => ({
        id: edu.id,
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        startYear: edu.start_year,
        endYear: edu.end_year,
        isVerified: edu.verification_status === "verified",
      })),
      skills: (skills || []).map((skill) => ({
        id: skill.id,
        name: skill.name,
        endorsements: skill.endorsements || 0,
      })),
    };

    console.log("✅ User profile assembled:", {
      id: userProfile.id,
      username: userProfile.username,
      displayName: userProfile.displayName,
      hasEmail: !!userProfile.contact?.email,
    });

    return userProfile;
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    toast.error("Failed to load profile data");
    return null;
  }
};

export const getUserProfileByUsername = async (usernameOrId: string): Promise<UserProfile | null> => {
  try {
    // Check if the input looks like a UUID (handles both UUID and username lookups)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameOrId);

    // Get current authenticated user for comparison
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Always query public_profiles view first (safe, excludes phone)
    const { data: profile, error: profileError } = await supabase
      .from("public_profiles")
      .select("*")
      .eq(isUUID ? "id" : "username", usernameOrId)
      .single();

    if (profileError) throw profileError;

    const isOwnProfile = user?.id === profile.id;

    // For own profile, fetch phone from base profiles table (RLS allows this)
    let phoneNumber = "";
    if (isOwnProfile) {
      const { data: ownProfile } = await supabase.from("profiles").select("phone").eq("id", profile.id).single();
      phoneNumber = ownProfile?.phone || "";
    }

    // Get experience - ordered by current role first, then by start date descending
    const { data: experience, error: experienceError } = await supabase
      .from("experiences")
      .select("*")
      .eq("user_id", profile.id)
      .order("is_current_role", { ascending: false })
      .order("start_date", { ascending: false, nullsFirst: false });

    if (experienceError) throw experienceError;

    // Get education
    const { data: education, error: educationError } = await supabase
      .from("education")
      .select("*")
      .eq("user_id", profile.id);

    if (educationError) throw educationError;

    // Get skills
    const { data: skills, error: skillsError } = await supabase.from("skills").select("*").eq("user_id", profile.id);

    if (skillsError) throw skillsError;

    // Get user settings - use maybeSingle to avoid 406 errors when no settings exist
    const { data: settings } = await supabase
      .from("user_settings")
      .select("show_network_connections")
      .eq("user_id", profile.id)
      .maybeSingle();

    const networkVisibilityEnabled = settings?.show_network_connections ?? true;

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
        target_user_id: profile.id,
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
      headerUrl: profile.header_url,
      isVerified: profile.is_verified || false,
      connections: connectionCount || 0,
      networkVisibilityEnabled,
      connectionDegree,
      // Federated auth fields
      authType: (profile.auth_type as "local" | "federated") || "local",
      homeInstance: profile.home_instance || undefined,
      remoteActorUrl: profile.remote_actor_url || undefined,
      // Freelancer fields
      isFreelancer: (profile as any).is_freelancer || false,
      freelancerSkills: (profile as any).freelancer_skills || [],
      freelancerRate: (profile as any).freelancer_rate || undefined,
      freelancerAvailability: (profile as any).freelancer_availability || undefined,
      // Contact fields
      website: (profile as any).website || undefined,
      contactEmail: (profile as any).contact_email || undefined,
      contact: {
        email: isOwnProfile ? user?.email : null,
        phone: phoneNumber,
        location: profile.location || "",
      },
      experience: (experience || []).map((exp) => ({
        id: exp.id,
        title: exp.title,
        company: exp.company,
        isCurrentRole: exp.is_current_role,
        startDate: exp.start_date,
        endDate: exp.end_date,
        location: exp.location,
        description: exp.description,
        isVerified: exp.verification_status === "verified",
      })),
      education: (education || []).map((edu) => ({
        id: edu.id,
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        startYear: edu.start_year,
        endYear: edu.end_year,
        isVerified: edu.verification_status === "verified",
      })),
      skills: (skills || []).map((skill) => ({
        id: skill.id,
        name: skill.name,
        endorsements: skill.endorsements || 0,
      })),
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    toast.error("Failed to load profile data");
    return null;
  }
};
