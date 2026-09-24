import { hasRecordId } from "@/lib/records";
import { supabase } from "@/lib/supabase";
import { profileSearchFilter } from "@/lib/searchQuery";

export interface SearchResult {
  type: 'profile' | 'job' | 'article' | 'event';
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  url: string;
}

export type SearchSource = 'profiles' | 'jobs' | 'articles' | 'events';

export interface SearchResults {
  profiles: SearchResult[];
  jobs: SearchResult[];
  articles: SearchResult[];
  events: SearchResult[];
  total: number;
  failedSources: SearchSource[];
}

function rows<T>(result: PromiseSettledResult<{ data: T[] | null; error: unknown }>, source: SearchSource, failedSources: SearchSource[]): T[] {
  if (result.status === 'rejected' || result.value.error) {
    failedSources.push(source);
    return [];
  }
  return result.value.data || [];
}

export const searchService = {
  async search(query: string, limit = 5): Promise<SearchResults> {
    const profileFilter = profileSearchFilter(query);
    if (!profileFilter || query.trim().length < 2) {
      return { profiles: [], jobs: [], articles: [], events: [], total: 0, failedSources: [] };
    }

    const searchQuery = query.trim();
    
    const [profilesRes, jobsRes, articlesRes, eventsRes] = await Promise.allSettled([
      supabase
        .from('public_profiles')
        .select('id, fullname, username, headline, avatar_url, home_instance')
        .or(profileFilter)
        .limit(limit),
      
      supabase
        .from('job_posts')
        .select('id, title, company, location, employment_type')
        .eq('is_active', true)
        .textSearch('search_vector', searchQuery, { type: 'plain', config: 'english' })
        .limit(limit),
      
      supabase
        .from('articles')
        .select('id, title, excerpt, slug, cover_image_url')
        .eq('published', true)
        .textSearch('search_vector', searchQuery, { type: 'plain', config: 'english' })
        .limit(limit),
      
      supabase
        .from('events')
        .select('id, title, location, start_date, cover_image_url')
        .gte('start_date', new Date().toISOString())
        .textSearch('search_vector', searchQuery, { type: 'plain', config: 'english' })
        .limit(limit),
    ]);

    const failedSources: SearchSource[] = [];
    const profiles: SearchResult[] = rows(profilesRes, 'profiles', failedSources).filter(hasRecordId).map(p => ({
      type: 'profile' as const,
      id: p.id,
      title: p.fullname || p.username || 'Unknown User',
      subtitle: p.headline || undefined,
      imageUrl: p.avatar_url || undefined,
      url: `/profile/${p.username || p.id}`,
    }));

    const jobs: SearchResult[] = rows(jobsRes, 'jobs', failedSources).map(j => ({
      type: 'job' as const,
      id: j.id,
      title: j.title,
      subtitle: `${j.company}${j.location ? ` • ${j.location}` : ''}`,
      url: `/jobs/${j.id}`,
    }));

    const articles: SearchResult[] = rows(articlesRes, 'articles', failedSources).map(a => ({
      type: 'article' as const,
      id: a.id,
      title: a.title,
      subtitle: a.excerpt?.substring(0, 100),
      imageUrl: a.cover_image_url || undefined,
      url: `/articles/${a.slug || a.id}`,
    }));

    const events: SearchResult[] = rows(eventsRes, 'events', failedSources).map(e => ({
      type: 'event' as const,
      id: e.id,
      title: e.title,
      subtitle: e.location || new Date(e.start_date).toLocaleDateString(),
      imageUrl: e.cover_image_url || undefined,
      url: `/events/${e.id}`,
    }));

    return {
      profiles,
      jobs,
      articles,
      events,
      total: profiles.length + jobs.length + articles.length + events.length,
      failedSources,
    };
  },

  async searchProfiles(query: string, limit = 20) {
    const profileFilter = profileSearchFilter(query);
    if (!profileFilter) return [];
    
    const { data, error } = await supabase
      .from('public_profiles')
      .select('id, fullname, username, headline, avatar_url, location, home_instance')
      .or(profileFilter)
      .limit(limit);
    
    if (error) throw new Error('Profile search failed');
    return data || [];
  },

  async searchJobs(query: string, limit = 20) {
    if (!profileSearchFilter(query) || query.trim().length < 2) return [];
    
    const searchQuery = query.trim();
    
    const { data, error } = await supabase
      .from('job_posts')
      .select('*')
      .eq('is_active', true)
      .textSearch('search_vector', searchQuery, { type: 'plain', config: 'english' })
      .limit(limit);
    
    if (error) throw new Error('Job search failed');
    return data || [];
  },
};
