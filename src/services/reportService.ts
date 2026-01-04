import { supabase } from "@/integrations/supabase/client";

export type ContentType = "post" | "article" | "job" | "user" | "event";
export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: ContentType;
  content_id: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export async function submitReport(
  contentType: ContentType,
  contentId: string,
  reason: string,
  details?: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("content_reports")
    .insert({
      reporter_id: user.id,
      content_type: contentType,
      content_id: contentId,
      reason,
      details,
    });

  return !error;
}

export async function getUserReports(): Promise<ContentReport[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("content_reports")
    .select("*")
    .eq("reporter_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data as ContentReport[]) || [];
}

export async function getPendingReportsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("content_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) return 0;
  return count || 0;
}
