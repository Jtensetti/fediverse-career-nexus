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

  // Check if user already has a referral code (their own invite link)
  const { data: existing } = await supabase
    .from("referrals")
    .select("referral_code")
    .eq("referrer_id", user.id)
    .is("referred_user_id", null) // Their invite template, not a completed referral
    .limit(1)
    .single();

  if (existing?.referral_code) {
    return existing.referral_code;
  }

  // Generate a new referral code using the database function
  const { data: codeResult } = await supabase.rpc("generate_referral_code");
  const code = codeResult as string;

  if (!code) return null;

  // Create a referral entry for tracking (this is their invite template)
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
    .select("status, referred_user_id")
    .eq("referrer_id", user.id);

  if (error || !data) return { total: 0, pending: 0, completed: 0, points: 0 };

  // Only count actual referrals (where someone was referred)
  const actualReferrals = data.filter((r) => r.referred_user_id !== null);
  
  const stats = {
    total: actualReferrals.length,
    // Pending = referred but not completed
    pending: actualReferrals.filter((r) => r.status === "signed_up").length,
    // Completed = fully converted
    completed: actualReferrals.filter((r) => r.status === "completed").length,
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
    .not("referred_user_id", "is", null) // Only show actual referrals
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

/**
 * Process a referral code after a new user signs up.
 * Finds the referral record and updates it with the new user's ID.
 */
export async function processReferralCode(code: string, newUserId: string): Promise<boolean> {
  try {
    // Find the referral template by code (where referred_user_id is null)
    const { data: referral, error: findError } = await supabase
      .from("referrals")
      .select("id, referrer_id")
      .eq("referral_code", code.toUpperCase())
      .is("referred_user_id", null)
      .single();

    if (findError || !referral) {
      console.log('Referral code not found or already used:', code);
      return false;
    }

    // Don't allow self-referral
    if (referral.referrer_id === newUserId) {
      console.log('Cannot self-refer');
      return false;
    }

    // Create a new referral record for this conversion
    const { error: insertError } = await supabase
      .from("referrals")
      .insert({
        referrer_id: referral.referrer_id,
        referral_code: code.toUpperCase(),
        referred_user_id: newUserId,
        status: "completed",
        converted_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to create referral record:', insertError);
      return false;
    }

    console.log('✅ Referral processed successfully for user:', newUserId);
    return true;
  } catch (error) {
    console.error('Error processing referral:', error);
    return false;
  }
}
