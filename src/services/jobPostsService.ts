import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { federateJobPost } from "./activityPubService";

export interface JobPost {
  id: string;
  user_id: string;
  company: string; // renamed from company_name
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string; // renamed from job_type
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  remote_policy: string | null; // renamed from remote_allowed
  experience_level: string | null;
  skills: string[] | null;
  is_active: boolean; // renamed from published
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Legacy field mappings for compatibility
  company_name?: string;
  company_verified?: boolean;
  job_type?: string;
  remote_allowed?: boolean;
  application_url?: string | null;
  contact_email?: string | null;
  published?: boolean;
  published_at?: string | null;
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
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (filters) {
      if (filters.job_type) {
        query = query.eq('employment_type', filters.job_type);
      }
      
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      
      if (filters.remote_allowed !== undefined) {
        query = query.eq('remote_policy', filters.remote_allowed ? 'remote' : 'on-site');
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
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
      .select('*')
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
    
    // If the job post is active, federate it
    if (data.is_active) {
      console.log('Job post is active, federating...');
      const federationSuccess = await federateJobPost(data);
      if (federationSuccess) {
        toast.success('Job post federated to the network');
      } else {
        toast.error('Job post created but federation failed');
      }
    }
    
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
    
    const { data, error } = await supabase
      .from('job_posts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.session.user.id)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating job post:', error);
      toast.error('Failed to update job post');
      return false;
    }
    
    toast.success('Job post updated successfully');
    
    // If the job post was just published (published changed from false to true), federate it
    if (updateData.published === true) {
      console.log('Job post was published, federating...');
      const federationSuccess = await federateJobPost(data);
      if (federationSuccess) {
        toast.success('Job post federated to the network');
      } else {
        toast.error('Job post updated but federation failed');
      }
    }
    
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
    
    const { data, error } = await supabase
      .from('job_posts')
      .update({ is_active: published })
      .eq('id', id)
      .eq('user_id', session.session.user.id)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating job post published status:', error);
      toast.error('Failed to update job post');
      return false;
    }
    
    toast.success(published ? 'Job post published' : 'Job post unpublished');
    
    // If the job post was just published, federate it
    if (published) {
      console.log('Job post was published, federating...');
      const federationSuccess = await federateJobPost(data);
      if (federationSuccess) {
        toast.success('Job post federated to the network');
      } else {
        toast.error('Job post published but federation failed');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in toggleJobPostPublished:', error);
    toast.error('An unexpected error occurred');
    return false;
  }
};
