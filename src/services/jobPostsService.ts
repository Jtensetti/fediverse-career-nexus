import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface JobPost {
  id: string;
  title: string;
  company: string;
  // Alias for backward compatibility
  company_name?: string;
  location: string | null;
  description: string | null;
  employment_type: string | null;
  // Alias for backward compatibility
  job_type?: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  remote_policy: string | null;
  // Alias for backward compatibility  
  remote_allowed?: boolean;
  experience_level: string | null;
  skills: string[] | null;
  is_active: boolean | null;
  // Alias for backward compatibility
  published_at?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  interview_process: string | null;
  response_time: string | null;
  team_size: string | null;
  growth_path: string | null;
  visa_sponsorship: boolean | null;
  transparency_score: number | null;
  application_url?: string | null;
  contact_email?: string | null;
}

export interface JobPostFilter {
  search?: string;
  job_type?: "full_time" | "part_time" | "contract" | "internship" | "temporary";
  location?: string;
  remote_allowed?: boolean;
}

export type JobPostCreateResult = 
  | { ok: true; id: string }
  | { ok: false; message: string; code?: string; details?: string };

// Normalize data before insert (convert empty strings to null)
function normalizeJobPostData(data: Record<string, unknown>): Record<string, unknown> {
  const nullableStringFields = [
    'description', 'location', 'remote_policy', 'experience_level',
    'salary_currency', 'interview_process', 'response_time', 
    'team_size', 'growth_path', 'application_url', 'contact_email'
  ];
  
  const normalized: Record<string, unknown> = { ...data };
  
  for (const field of nullableStringFields) {
    if (normalized[field] === '' || normalized[field] === undefined) {
      normalized[field] = null;
    }
  }
  
  // Normalize skills: empty array becomes null
  if (Array.isArray(normalized.skills) && normalized.skills.length === 0) {
    normalized.skills = null;
  }
  
  // Ensure salary_min and salary_max are numbers or null
  if (normalized.salary_min === '' || normalized.salary_min === undefined) {
    normalized.salary_min = null;
  }
  if (normalized.salary_max === '' || normalized.salary_max === undefined) {
    normalized.salary_max = null;
  }
  
  return normalized;
}

// Add computed fields for backward compatibility
function enrichJobPost(job: any): JobPost {
  return {
    ...job,
    company_name: job.company,
    job_type: job.employment_type,
    remote_allowed: job.remote_policy === 'remote' || job.remote_policy === 'hybrid',
    published_at: job.is_active ? job.created_at : null,
    skills: job.skills || [],
  };
}

// Simple createJobPost - mirrors eventService pattern
export const createJobPost = async (
  jobPost: Omit<JobPost, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<JobPostCreateResult> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      toast.error('You must be logged in to create a job post');
      return { ok: false, message: 'You must be logged in to create a job post', code: 'AUTH_REQUIRED' };
    }
    
    const normalizedData = normalizeJobPostData(jobPost as Record<string, unknown>);
    
    const insertData = {
      ...normalizedData,
      user_id: session.session.user.id
    };
    
    const { data, error } = await supabase
      .from('job_posts')
      .insert(insertData as any)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating job post:', error);
      toast.error('Failed to create job post');
      return { ok: false, message: 'Failed to create job post', details: error.message };
    }
    
    return { ok: true, id: data.id };
  } catch (error) {
    console.error('Error creating job post:', error);
    toast.error('Failed to create job post');
    return { ok: false, message: 'An unexpected error occurred' };
  }
};

export const getJobPosts = async (options?: {
  limit?: number;
  page?: number;
  activeOnly?: boolean;
  userId?: string | null;
}): Promise<JobPost[]> => {
  const { limit = 20, page = 1, activeOnly = true, userId } = options || {};
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from('job_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(enrichJobPost);
  } catch (error) {
    console.error('Error fetching job posts:', error);
    return [];
  }
};

// Alias for backward compatibility
export const getPublishedJobPosts = async (filters?: JobPostFilter): Promise<JobPost[]> => {
  try {
    let query = supabase
      .from('job_posts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,company.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters?.job_type) {
      // Map filter job_type to employment_type format
      const employmentTypeMap: Record<string, string> = {
        'full_time': 'full-time',
        'part_time': 'part-time',
        'contract': 'contract',
        'internship': 'internship',
        'temporary': 'temporary'
      };
      query = query.eq('employment_type', employmentTypeMap[filters.job_type] || filters.job_type);
    }

    if (filters?.remote_allowed === true) {
      query = query.in('remote_policy', ['remote', 'hybrid']);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(enrichJobPost);
  } catch (error) {
    console.error('Error fetching published job posts:', error);
    return [];
  }
};

// Alias for backward compatibility
export const getUserJobPosts = async (): Promise<JobPost[]> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return [];

    const { data, error } = await supabase
      .from('job_posts')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(enrichJobPost);
  } catch (error) {
    console.error('Error fetching user job posts:', error);
    return [];
  }
};

export const getJobPost = async (id: string): Promise<JobPost | null> => {
  try {
    const { data, error } = await supabase
      .from('job_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return enrichJobPost(data);
  } catch (error) {
    console.error('Error fetching job post:', error);
    return null;
  }
};

// Alias for backward compatibility
export const getJobPostById = getJobPost;

export const updateJobPost = async (
  id: string,
  updates: Partial<Omit<JobPost, 'id' | 'user_id' | 'created_at'>>
): Promise<JobPost | null> => {
  try {
    const normalizedData = normalizeJobPostData(updates as Record<string, unknown>);
    
    const { data, error } = await supabase
      .from('job_posts')
      .update(normalizedData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    toast.success('Job post updated successfully');
    return enrichJobPost(data);
  } catch (error) {
    console.error('Error updating job post:', error);
    toast.error('Failed to update job post');
    return null;
  }
};

export const toggleJobPostPublished = async (id: string, isActive: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('job_posts')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
    toast.success(isActive ? 'Job post published' : 'Job post unpublished');
    return true;
  } catch (error) {
    console.error('Error toggling job post published:', error);
    toast.error('Failed to update job post');
    return false;
  }
};

export const deleteJobPost = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('job_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    toast.success('Job post deleted');
    return true;
  } catch (error) {
    console.error('Error deleting job post:', error);
    toast.error('Failed to delete job post');
    return false;
  }
};

// Get jobs by company ID
export const getJobsByCompanyId = async (companyId: string): Promise<JobPost[]> => {
  try {
    const { data, error } = await supabase
      .from('job_posts')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(enrichJobPost);
  } catch (error) {
    console.error('Error fetching company jobs:', error);
    return [];
  }
};

export const searchJobPosts = async (query: string): Promise<JobPost[]> => {
  try {
    const { data, error } = await supabase
      .from('job_posts')
      .select('*')
      .eq('is_active', true)
      .or(`title.ilike.%${query}%,company.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data || []).map(enrichJobPost);
  } catch (error) {
    console.error('Error searching job posts:', error);
    return [];
  }
};
