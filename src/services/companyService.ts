import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

export type { Company };

export interface CompanyFilters {
  search?: string;
  industry?: string;
  size?: Database['public']['Enums']['company_size'];
  location?: string;
}

// Create company via edge function (handles service role + owner assignment)
export async function createCompany(data: Omit<CompanyInsert, 'id' | 'created_at' | 'updated_at' | 'follower_count' | 'employee_count'>): Promise<Company | null> {
  const { data: result, error } = await supabase.functions.invoke('company-create', {
    body: data,
  });

  if (error) {
    console.error('Error creating company:', error);
    throw new Error(error.message || 'Failed to create company');
  }

  return result?.company || null;
}

// Get company by slug (public)
export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching company by slug:', error);
    return null;
  }

  return data;
}

// Get company by ID
export async function getCompanyById(id: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching company by ID:', error);
    return null;
  }

  return data;
}

// Update company (RLS will check if user has admin/owner role)
export async function updateCompany(id: string, data: CompanyUpdate): Promise<Company | null> {
  const { data: updated, error } = await supabase
    .from('companies')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating company:', error);
    throw new Error(error.message || 'Failed to update company');
  }

  return updated;
}

// Search companies with filters
export async function searchCompanies(filters: CompanyFilters = {}, limit = 20, offset = 0): Promise<Company[]> {
  let query = supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('follower_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.search) {
    // Use full-text search on search_vector
    query = query.textSearch('search_vector', filters.search, {
      type: 'websearch',
      config: 'simple',
    });
  }

  if (filters.industry) {
    query = query.eq('industry', filters.industry);
  }

  if (filters.size) {
    query = query.eq('size', filters.size);
  }

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error searching companies:', error);
    return [];
  }

  return data || [];
}

// Get all companies (paginated)
export async function getCompanies(limit = 20, offset = 0): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching companies:', error);
    return [];
  }

  return data || [];
}

// Get distinct industries for filter dropdown
export async function getCompanyIndustries(): Promise<string[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('industry')
    .eq('is_active', true)
    .not('industry', 'is', null);

  if (error) {
    console.error('Error fetching industries:', error);
    return [];
  }

  const industries = [...new Set(data?.map(c => c.industry).filter(Boolean) as string[])];
  return industries.sort();
}

// Deactivate company (soft delete)
export async function deactivateCompany(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('companies')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error deactivating company:', error);
    return false;
  }

  return true;
}

// Generate a URL-safe slug from company name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .substring(0, 50); // Limit length
}

// Check if slug is available
export async function isSlugAvailable(slug: string): Promise<boolean> {
  // Check reserved slugs first
  const { data: reserved } = await supabase.rpc('is_slug_reserved', { _slug: slug });
  if (reserved) return false;

  // Check existing companies
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .limit(1);

  return !data || data.length === 0;
}
