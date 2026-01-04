import { supabase } from "@/integrations/supabase/client";

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_user_id: string;
  reason?: string;
  created_at: string;
}

export async function blockUser(blockedUserId: string, reason?: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("user_blocks")
    .insert({
      blocker_id: user.id,
      blocked_user_id: blockedUserId,
      reason,
    });

  return !error;
}

export async function unblockUser(blockedUserId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_user_id", blockedUserId);

  return !error;
}

export async function getBlockedUsers(): Promise<UserBlock[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_blocks")
    .select("*")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function isUserBlocked(targetUserId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_user_id", targetUserId)
    .single();

  return !error && !!data;
}
