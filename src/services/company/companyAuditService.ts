import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CompanyAuditLog = Database["public"]["Tables"]["company_audit_log"]["Row"];

export type { CompanyAuditLog };

export interface AuditLogWithActor extends CompanyAuditLog {
  actor_profile?: {
    fullname: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

/**
 * Get audit log entries for a company (admin only, RLS enforced).
 */
export async function getCompanyAuditLog(
  companyId: string,
  limit = 50,
  offset = 0
): Promise<AuditLogWithActor[]> {
  const { data, error } = await supabase
    .from("company_audit_log")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching audit log:", error);
    return [];
  }

  // Enrich with actor profiles
  if (data && data.length > 0) {
    const actorIds = [...new Set(data.map((e) => e.actor_user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, fullname, avatar_url, username")
      .in("id", actorIds);

    const profileMap = new Map(
      profiles?.map((p) => [p.id, p]) || []
    );
    return data.map((log) => ({
      ...log,
      actor_profile: profileMap.get(log.actor_user_id) || null,
    }));
  }

  return data || [];
}

/**
 * Log an admin action to the company audit log.
 */
export async function logAuditAction(
  companyId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("company_audit_log").insert({
    company_id: companyId,
    actor_user_id: user.id,
    action,
    metadata: metadata as any,
  });

  if (error) {
    console.error("Error logging audit action:", error);
  }
}
