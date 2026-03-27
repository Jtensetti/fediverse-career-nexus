import { supabase } from "@/integrations/supabase/client";

export interface AdvancedSearchFilters {
  query?: string;
  location?: string;
  company?: string;
  institution?: string;
  homeInstance?: string;
}

export interface AdvancedProfileResult {
  id: string;
  username: string | null;
  fullname: string | null;
  headline: string | null;
  avatar_url: string | null;
  location: string | null;
  home_instance: string | null;
}

export const advancedSearchService = {
  async searchPeople(filters: AdvancedSearchFilters, limit = 50): Promise<AdvancedProfileResult[]> {
    let query = supabase
      .from('public_profiles')
      .select('id, username, fullname, headline, avatar_url, location, home_instance')
      .limit(limit);
    
    if (filters.query && filters.query.trim()) {
      const pattern = `%${filters.query.trim()}%`;
      query = query.or(`username.ilike.${pattern},fullname.ilike.${pattern},headline.ilike.${pattern}`);
    }
    
    if (filters.location && filters.location.trim()) {
      query = query.ilike('location', `%${filters.location.trim()}%`);
    }
    
    if (filters.homeInstance && filters.homeInstance.trim()) {
      const instance = filters.homeInstance.trim().replace('@', '');
      if (instance.toLowerCase() === 'local') {
        query = query.is('home_instance', null);
      } else {
        query = query.ilike('home_instance', `%${instance}%`);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Advanced search error:', error);
      return [];
    }
    
    return data || [];
  },

  async getFilterOptions() {
    // Get unique locations
    const { data: locations } = await supabase
      .from('public_profiles')
      .select('location')
      .not('location', 'is', null)
      .limit(100);
    
    // Get unique instances
    const { data: instances } = await supabase
      .from('public_profiles')
      .select('home_instance')
      .not('home_instance', 'is', null)
      .limit(50);
    
    const uniqueLocations = [...new Set(locations?.map(l => l.location).filter(Boolean) || [])];
    const uniqueInstances = [...new Set(instances?.map(i => i.home_instance).filter(Boolean) || [])];
    
    return {
      locations: uniqueLocations as string[],
      instances: ['local', ...uniqueInstances] as string[],
    };
  },

  async searchByCompany(company: string, limit = 20): Promise<AdvancedProfileResult[]> {
    if (!company || company.trim().length < 1) return [];
    
    // Search experiences table then join with profiles
    const { data: experiences } = await supabase
      .from('experiences')
      .select('user_id')
      .ilike('company', `%${company.trim()}%`)
      .limit(limit);
    
    if (!experiences || experiences.length === 0) return [];
    
    const userIds = [...new Set(experiences.map(e => e.user_id))];
    
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, username, fullname, headline, avatar_url, location, home_instance')
      .in('id', userIds);
    
    return profiles || [];
  },

  async searchByInstitution(institution: string, limit = 20): Promise<AdvancedProfileResult[]> {
    if (!institution || institution.trim().length < 1) return [];
    
    // Search education table then join with profiles
    const { data: education } = await supabase
      .from('education')
      .select('user_id')
      .ilike('institution', `%${institution.trim()}%`)
      .limit(limit);
    
    if (!education || education.length === 0) return [];
    
    const userIds = [...new Set(education.map(e => e.user_id))];
    
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, username, fullname, headline, avatar_url, location, home_instance')
      .in('id', userIds);
    
    return profiles || [];
  },
};
