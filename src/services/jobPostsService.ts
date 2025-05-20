
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface JobPost {
  id: string;
  user_id: string;
  company_name: string;
  company_verified: boolean;
  title: string;
  description: string;
  location: string;
  job_type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'temporary';
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  remote_allowed: boolean;
  application_url: string | null;
  contact_email: string | null;
  skills: string[];
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobPostFilter {
  job_type?: 'full_time' | 'part_time' | 'contract' | 'internship' | 'temporary';
  location?: string;
  remote_allowed?: boolean;
  search?: string;
  skills?: string[];
}

// Get all published job posts
export const getPublishedJobPosts = async (filters?: JobPostFilter): Promise<JobPost[]> => {
  try {
    let query = supabase
      .from('job_posts')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false });
    
    // Apply filters
    if (filters) {
      if (filters.job_type) {
        query = query.eq('job_type', filters.job_type);
      }
      
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      
      if (filters.remote_allowed !== undefined) {
        query = query.eq('remote_allowed', filters.remote_allowed);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
      }
      
      if (filters.skills && filters.skills.length > 0) {
        // Filter by skills using array overlap
        query = query.contains('skills', filters.skills);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching job posts:', error);
      return [];
    }
    
    return data as JobPost[];
  } catch (error) {
    console.error('Error in getPublishedJobPosts:', error);
    return [];
  }
};

// Get a single job post by ID
export const getJobPostById = async (id: string): Promise<JobPost | null> => {
  try {
    const { data, error } = await supabase
      .from('job_posts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching job post:', error);
      return null;
    }
    
    return data as JobPost;
  } catch (error) {
    console.error('Error in getJobPostById:', error);
    return null;
  }
};

// Get job posts for the current user (both published and unpublished)
export const getUserJobPosts = async (): Promise<JobPost[]> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      toast.error('You must be logged in to view your job posts');
      return [];
    }
    
    const { data, error } = await supabase
      .from('job_posts')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user job posts:', error);
      return [];
    }
    
    return data as JobPost[];
  } catch (error) {
    console.error('Error in getUserJobPosts:', error);
    return [];
  }
};

// Create a new job post
export const createJobPost = async (jobPost: Omit<JobPost, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'published_at'>): Promise<string | null> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      toast.error('You must be logged in to create a job post');
      return null;
    }
    
    const { data, error } = await supabase
      .from('job_posts')
      .insert({
        ...jobPost,
        user_id: session.session.user.id
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating job post:', error);
      if (error.message.includes('violates row-level security')) {
        toast.error('Only verified companies can post jobs');
      } else {
        toast.error('Failed to create job post');
      }
      return null;
    }
    
    toast.success('Job post created successfully');
    return data.id;
  } catch (error) {
    console.error('Error in createJobPost:', error);
    toast.error('An unexpected error occurred');
    return null;
  }
};

// Update an existing job post
export const updateJobPost = async (id: string, jobPost: Partial<JobPost>): Promise<boolean> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      toast.error('You must be logged in to update a job post');
      return false;
    }
    
    // Remove fields that should not be updated
    const { id: _, user_id: __, created_at: ___, ...updateData } = jobPost as any;
    
    const { error } = await supabase
      .from('job_posts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.session.user.id);
    
    if (error) {
      console.error('Error updating job post:', error);
      toast.error('Failed to update job post');
      return false;
    }
    
    toast.success('Job post updated successfully');
    return true;
  } catch (error) {
    console.error('Error in updateJobPost:', error);
    toast.error('An unexpected error occurred');
    return false;
  }
};

// Delete a job post
export const deleteJobPost = async (id: string): Promise<boolean> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      toast.error('You must be logged in to delete a job post');
      return false;
    }
    
    const { error } = await supabase
      .from('job_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', session.session.user.id);
    
    if (error) {
      console.error('Error deleting job post:', error);
      toast.error('Failed to delete job post');
      return false;
    }
    
    toast.success('Job post deleted successfully');
    return true;
  } catch (error) {
    console.error('Error in deleteJobPost:', error);
    toast.error('An unexpected error occurred');
    return false;
  }
};

// Toggle the published status of a job post
export const toggleJobPostPublished = async (id: string, published: boolean): Promise<boolean> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      toast.error('You must be logged in to update a job post');
      return false;
    }
    
    const { error } = await supabase
      .from('job_posts')
      .update({ published })
      .eq('id', id)
      .eq('user_id', session.session.user.id);
    
    if (error) {
      console.error('Error updating job post published status:', error);
      toast.error('Failed to update job post');
      return false;
    }
    
    toast.success(published ? 'Job post published' : 'Job post unpublished');
    return true;
  } catch (error) {
    console.error('Error in toggleJobPostPublished:', error);
    toast.error('An unexpected error occurred');
    return false;
  }
};
