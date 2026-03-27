import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CompanyRole = Database['public']['Tables']['company_roles']['Row'];
type CompanyRoleEnum = Database['public']['Enums']['company_role'];

export type { CompanyRole, CompanyRoleEnum };

// Get current user's role at a company
export async function getUserCompanyRole(companyId: string): Promise<CompanyRoleEnum | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('company_roles')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching user company role:', error);
    return null;
  }

  return data?.role || null;
}

// Check if current user can manage company (owner or admin) - async version
export async function canManageCompany(companyId: string): Promise<boolean> {
  const role = await getUserCompanyRole(companyId);
  return role === 'owner' || role === 'admin';
}

// Check if a role can manage company (owner or admin) - sync version for use with already-fetched role
export function canManageWithRole(role: CompanyRoleEnum | null): boolean {
  return role === 'owner' || role === 'admin';
}

// Check if a role can edit content (owner, admin, or editor) - sync version
export function canEditWithRole(role: CompanyRoleEnum | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

// Check if current user can edit company content (owner, admin, or editor)
export async function canEditCompanyContent(companyId: string): Promise<boolean> {
  const role = await getUserCompanyRole(companyId);
  return role === 'owner' || role === 'admin' || role === 'editor';
}

// Get all roles for a company with profile data (admins only)
export interface CompanyRoleWithProfile extends CompanyRole {
  profile?: {
    id: string;
    fullname: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

export async function getCompanyRoles(companyId: string): Promise<CompanyRoleWithProfile[]> {
  const { data, error } = await supabase
    .from('company_roles')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching company roles:', error);
    return [];
  }

  if (data && data.length > 0) {
    const userIds = [...new Set(data.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, fullname, avatar_url, username')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    return data.map((role) => ({
      ...role,
      profile: profileMap.get(role.user_id) || null,
    }));
  }

  return data || [];
}

// Add a new role (owners only)
export async function addCompanyRole(
  companyId: string,
  userId: string,
  role: CompanyRoleEnum
): Promise<CompanyRole | null> {
  const { data, error } = await supabase
    .from('company_roles')
    .insert({
      company_id: companyId,
      user_id: userId,
      role,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding company role:', error);
    throw new Error(error.message || 'Failed to add role');
  }

  return data;
}

// Update a role (owners only)
export async function updateCompanyRole(
  companyId: string,
  userId: string,
  newRole: CompanyRoleEnum
): Promise<boolean> {
  const { error } = await supabase
    .from('company_roles')
    .update({ role: newRole })
    .eq('company_id', companyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating company role:', error);
    throw new Error(error.message || 'Failed to update role');
  }

  return true;
}

// Remove a role (owners only)
export async function removeCompanyRole(companyId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('company_roles')
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing company role:', error);
    throw new Error(error.message || 'Failed to remove role');
  }

  return true;
}

// Get companies where user has a role
export async function getUserCompanies(): Promise<{ company_id: string; role: CompanyRoleEnum }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('company_roles')
    .select('company_id, role')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching user companies:', error);
    return [];
  }

  return data || [];
}
