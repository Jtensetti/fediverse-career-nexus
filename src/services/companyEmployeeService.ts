import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CompanyEmployee = Database["public"]["Tables"]["company_employees"]["Row"];
type EmploymentType = Database["public"]["Enums"]["employment_type"];

export type { CompanyEmployee, EmploymentType };

export interface EmployeeWithProfile extends CompanyEmployee {
  profile?: {
    id: string;
    fullname: string | null;
    avatar_url: string | null;
    headline: string | null;
    username: string | null;
  } | null;
}

/**
 * Get verified current employees for public display on the People tab.
 */
export async function getVerifiedEmployees(
  companyId: string
): Promise<EmployeeWithProfile[]> {
  const { data, error } = await supabase
    .from("company_employees")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_verified", true)
    .is("end_date", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching verified employees:", error);
    return [];
  }

  // Fetch profiles for these employees
  if (data && data.length > 0) {
    const userIds = data.map((e) => e.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, fullname, avatar_url, headline, username")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    return data.map((emp) => ({
      ...emp,
      profile: profileMap.get(emp.user_id) || null,
    }));
  }

  return data || [];
}

/**
 * Get all employees (including unverified) for admin dashboard.
 */
export async function getAllEmployees(
  companyId: string
): Promise<EmployeeWithProfile[]> {
  const { data, error } = await supabase
    .from("company_employees")
    .select("*")
    .eq("company_id", companyId)
    .is("end_date", null)
    .order("is_verified", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all employees:", error);
    return [];
  }

  if (data && data.length > 0) {
    const userIds = data.map((e) => e.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, fullname, avatar_url, headline, username")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    return data.map((emp) => ({
      ...emp,
      profile: profileMap.get(emp.user_id) || null,
    }));
  }

  return data || [];
}

/**
 * Get pending (unverified) employees for admin verification queue.
 */
export async function getPendingEmployees(
  companyId: string
): Promise<EmployeeWithProfile[]> {
  const { data, error } = await supabase
    .from("company_employees")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_verified", false)
    .is("end_date", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending employees:", error);
    return [];
  }

  if (data && data.length > 0) {
    const userIds = data.map((e) => e.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, fullname, avatar_url, headline, username")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    return data.map((emp) => ({
      ...emp,
      profile: profileMap.get(emp.user_id) || null,
    }));
  }

  return data || [];
}

/**
 * Check if the current user already has an active employment record at a company.
 */
export async function getUserEmployment(
  companyId: string
): Promise<CompanyEmployee | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("company_employees")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .is("end_date", null)
    .maybeSingle();

  if (error) {
    console.error("Error checking user employment:", error);
    return null;
  }

  return data;
}

/**
 * Add yourself as an employee ("I work here").
 */
export async function claimEmployment(
  companyId: string,
  title: string,
  employmentType: EmploymentType,
  startDate: string
): Promise<CompanyEmployee | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("company_employees")
    .insert({
      company_id: companyId,
      user_id: user.id,
      title,
      employment_type: employmentType,
      start_date: startDate,
    })
    .select()
    .single();

  if (error) {
    console.error("Error claiming employment:", error);
    throw new Error(error.message || "Failed to add employment");
  }

  return data;
}

/**
 * Admin: verify an employee claim.
 */
export async function verifyEmployee(employeeId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("company_employees")
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    })
    .eq("id", employeeId);

  if (error) {
    console.error("Error verifying employee:", error);
    throw new Error(error.message || "Failed to verify employee");
  }

  return true;
}

/**
 * Admin: reject/remove an employee claim.
 */
export async function removeEmployee(employeeId: string): Promise<boolean> {
  const { error } = await supabase
    .from("company_employees")
    .delete()
    .eq("id", employeeId);

  if (error) {
    console.error("Error removing employee:", error);
    throw new Error(error.message || "Failed to remove employee");
  }

  return true;
}

/**
 * End own employment (set end_date).
 */
export async function endEmployment(employeeId: string): Promise<boolean> {
  const { error } = await supabase
    .from("company_employees")
    .update({ end_date: new Date().toISOString().split("T")[0] })
    .eq("id", employeeId);

  if (error) {
    console.error("Error ending employment:", error);
    throw new Error(error.message || "Failed to end employment");
  }

  return true;
}
