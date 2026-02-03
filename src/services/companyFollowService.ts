import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CompanyFollower = Database['public']['Tables']['company_followers']['Row'];

export type { CompanyFollower };

// Follow a company
export async function followCompany(companyId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('company_followers')
    .insert({
      company_id: companyId,
      user_id: user.id,
    });

  if (error) {
    if (error.code === '23505') {
      // Already following (duplicate key)
      return true;
    }
    console.error('Error following company:', error);
    throw new Error(error.message || 'Failed to follow company');
  }

  return true;
}

// Unfollow a company
export async function unfollowCompany(companyId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('company_followers')
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error unfollowing company:', error);
    throw new Error(error.message || 'Failed to unfollow company');
  }

  return true;
}

// Check if current user is following a company
export async function isFollowingCompany(companyId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('company_followers')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return false; // Not found
    console.error('Error checking follow status:', error);
    return false;
  }

  return !!data;
}

// Get follower count (fallback if denormalized count fails)
export async function getCompanyFollowerCount(companyId: string): Promise<number> {
  const { count, error } = await supabase
    .from('company_followers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (error) {
    console.error('Error getting follower count:', error);
    return 0;
  }

  return count || 0;
}

// Get followers of a company (with profiles)
export async function getCompanyFollowers(companyId: string, limit = 20, offset = 0): Promise<{
  id: string;
  user_id: string;
  created_at: string;
}[]> {
  const { data, error } = await supabase
    .from('company_followers')
    .select('id, user_id, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching company followers:', error);
    return [];
  }

  return data || [];
}

// Get companies the current user follows
export async function getFollowedCompanies(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('company_followers')
    .select('company_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching followed companies:', error);
    return [];
  }

  return data?.map(f => f.company_id) || [];
}
