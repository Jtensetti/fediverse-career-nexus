import { supabase } from "@/integrations/supabase/client";

export interface FreelancerProfile {
  id: string;
  username: string | null;
  fullname: string | null;
  headline: string | null;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  website: string | null;
  freelancer_skills: string[];
  freelancer_rate: string | null;
  freelancer_availability: string | null;
}

export interface FreelancerSearchFilters {
  query?: string;
  skills?: string[];
  location?: string;
  availability?: string;
}

/**
 * Search for freelancers based on filters
 */
export const searchFreelancers = async (
  filters: FreelancerSearchFilters,
  limit = 50
): Promise<FreelancerProfile[]> => {
  try {
    let query = supabase
      .from("public_profiles")
      .select(`
        id,
        username,
        fullname,
        headline,
        avatar_url,
        location,
        bio,
        website,
        freelancer_skills,
        freelancer_rate,
        freelancer_availability
      `)
      .eq("is_freelancer", true)
      .limit(limit);

    // Search by keyword in fullname, headline, or skills
    if (filters.query && filters.query.trim()) {
      const searchTerm = `%${filters.query.trim()}%`;
      query = query.or(`fullname.ilike.${searchTerm},headline.ilike.${searchTerm}`);
    }

    // Filter by location
    if (filters.location && filters.location.trim()) {
      query = query.ilike("location", `%${filters.location.trim()}%`);
    }

    // Filter by availability
    if (filters.availability) {
      query = query.eq("freelancer_availability", filters.availability);
    }

    const { data, error } = await query.order("fullname", { ascending: true });

    if (error) {
      console.error("Error searching freelancers:", error);
      return [];
    }

    // Filter by skills if provided (post-query since array contains is complex)
    let results = (data || []) as FreelancerProfile[];
    
    if (filters.skills && filters.skills.length > 0) {
      const searchSkills = filters.skills.map(s => s.toLowerCase());
      results = results.filter(profile => {
        if (!profile.freelancer_skills || profile.freelancer_skills.length === 0) {
          return false;
        }
        const profileSkills = profile.freelancer_skills.map(s => s.toLowerCase());
        return searchSkills.some(skill => 
          profileSkills.some(ps => ps.includes(skill) || skill.includes(ps))
        );
      });
    }

    return results;
  } catch (error) {
    console.error("Error searching freelancers:", error);
    return [];
  }
};

/**
 * Get unique skills from all freelancers for autocomplete
 */
export const getFreelancerSkills = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("public_profiles")
      .select("freelancer_skills")
      .eq("is_freelancer", true)
      .not("freelancer_skills", "is", null);

    if (error) {
      console.error("Error fetching freelancer skills:", error);
      return [];
    }

    // Flatten and dedupe skills
    const allSkills = (data || []).flatMap(p => p.freelancer_skills || []);
    const uniqueSkills = [...new Set(allSkills)].sort();
    
    return uniqueSkills;
  } catch (error) {
    console.error("Error fetching freelancer skills:", error);
    return [];
  }
};

/**
 * Get available locations from freelancers
 */
export const getFreelancerLocations = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("public_profiles")
      .select("location")
      .eq("is_freelancer", true)
      .not("location", "is", null);

    if (error) {
      console.error("Error fetching freelancer locations:", error);
      return [];
    }

    const uniqueLocations = [...new Set((data || []).map(p => p.location).filter(Boolean))] as string[];
    return uniqueLocations.sort();
  } catch (error) {
    console.error("Error fetching freelancer locations:", error);
    return [];
  }
};

/**
 * Update current user's freelancer status
 */
export const updateFreelancerStatus = async (data: {
  is_freelancer: boolean;
  freelancer_skills?: string[];
  freelancer_rate?: string;
  freelancer_availability?: string;
}): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user logged in");
      return false;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        is_freelancer: data.is_freelancer,
        freelancer_skills: data.freelancer_skills || [],
        freelancer_rate: data.freelancer_rate || null,
        freelancer_availability: data.freelancer_availability || null,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating freelancer status:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating freelancer status:", error);
    return false;
  }
};
