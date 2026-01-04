import { supabase } from "@/integrations/supabase/client";

export interface Referral {
  id: string;
  referrer_id: string;
  referred_email?: string;
  referred_user_id?: string;
  referral_code: string;
  status: "pending" | "signed_up" | "completed";
  reward_claimed: boolean;
  created_at: string;
  converted_at?: string;
}

export async function getUserReferralCode(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if user already has a referral code
  const { data: existing } = await supabase
    .from("referrals")
    .select("referral_code")
    .eq("referrer_id", user.id)
    .limit(1)
    .single();

  if (existing?.referral_code) {
    return existing.referral_code;
  }

  // Generate a new referral code using the database function
  const { data: codeResult } = await supabase.rpc("generate_referral_code");
  const code = codeResult as string;

  if (!code) return null;

  // Create a referral entry for tracking
  const { error } = await supabase
    .from("referrals")
    .insert({
      referrer_id: user.id,
      referral_code: code,
      status: "pending",
    });

  if (error) return null;
  return code;
}

export async function getReferralStats(): Promise<{
  total: number;
  pending: number;
  completed: number;
  points: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { total: 0, pending: 0, completed: 0, points: 0 };

  const { data, error } = await supabase
    .from("referrals")
    .select("status")
    .eq("referrer_id", user.id);

  if (error || !data) return { total: 0, pending: 0, completed: 0, points: 0 };

  const stats = {
    total: data.length,
    pending: data.filter((r) => r.status === "pending").length,
    completed: data.filter((r) => r.status === "completed").length,
    points: 0,
  };
  stats.points = stats.completed * 50; // 50 points per successful referral

  return stats;
}

export async function getUserReferrals(): Promise<Referral[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data as Referral[]) || [];
}

export async function validateReferralCode(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("referrals")
    .select("id")
    .eq("referral_code", code.toUpperCase())
    .single();

  return !error && !!data;
}
