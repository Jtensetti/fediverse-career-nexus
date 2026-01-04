import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  type: 'profile' | 'job' | 'article' | 'event';
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  url: string;
}

export interface SearchResults {
  profiles: SearchResult[];
  jobs: SearchResult[];
  articles: SearchResult[];
  events: SearchResult[];
  total: number;
}

export const searchService = {
  async search(query: string, limit = 5): Promise<SearchResults> {
    if (!query || query.trim().length < 2) {
      return { profiles: [], jobs: [], articles: [], events: [], total: 0 };
    }

    const searchQuery = query.trim().split(' ').join(' & ');

    const [profilesRes, jobsRes, articlesRes, eventsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, fullname, username, headline, avatar_url')
        .textSearch('search_vector', searchQuery)
        .limit(limit),
      
      supabase
        .from('job_posts')
        .select('id, title, company, location, employment_type')
        .eq('is_active', true)
        .textSearch('search_vector', searchQuery)
        .limit(limit),
      
      supabase
        .from('articles')
        .select('id, title, excerpt, slug, cover_image_url')
        .eq('published', true)
        .textSearch('search_vector', searchQuery)
        .limit(limit),
      
      supabase
        .from('events')
        .select('id, title, location, start_date, cover_image_url')
        .gte('start_date', new Date().toISOString())
        .textSearch('search_vector', searchQuery)
        .limit(limit),
    ]);

    const profiles: SearchResult[] = (profilesRes.data || []).map(p => ({
      type: 'profile' as const,
      id: p.id,
      title: p.fullname || p.username || 'Unknown User',
      subtitle: p.headline,
      imageUrl: p.avatar_url,
      url: `/profile/${p.id}`,
    }));

    const jobs: SearchResult[] = (jobsRes.data || []).map(j => ({
      type: 'job' as const,
      id: j.id,
      title: j.title,
      subtitle: `${j.company}${j.location ? ` • ${j.location}` : ''}`,
      url: `/jobs/${j.id}`,
    }));

    const articles: SearchResult[] = (articlesRes.data || []).map(a => ({
      type: 'article' as const,
      id: a.id,
      title: a.title,
      subtitle: a.excerpt?.substring(0, 100),
      imageUrl: a.cover_image_url,
      url: `/articles/${a.slug || a.id}`,
    }));

    const events: SearchResult[] = (eventsRes.data || []).map(e => ({
      type: 'event' as const,
      id: e.id,
      title: e.title,
      subtitle: e.location || new Date(e.start_date).toLocaleDateString(),
      imageUrl: e.cover_image_url,
      url: `/events/${e.id}`,
    }));

    return {
      profiles,
      jobs,
      articles,
      events,
      total: profiles.length + jobs.length + articles.length + events.length,
    };
  },

  async searchProfiles(query: string, limit = 20) {
    if (!query || query.trim().length < 2) return [];
    
    const searchQuery = query.trim().split(' ').join(' & ');
    
    const { data } = await supabase
      .from('profiles')
      .select('id, fullname, username, headline, avatar_url, location')
      .textSearch('search_vector', searchQuery)
      .limit(limit);
    
    return data || [];
  },

  async searchJobs(query: string, limit = 20) {
    if (!query || query.trim().length < 2) return [];
    
    const searchQuery = query.trim().split(' ').join(' & ');
    
    const { data } = await supabase
      .from('job_posts')
      .select('*')
      .eq('is_active', true)
      .textSearch('search_vector', searchQuery)
      .limit(limit);
    
    return data || [];
  },
};
