import { supabase } from "@/integrations/supabase/client";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: string;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export async function getAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .order("points", { ascending: true });

  if (error) return [];
  return data || [];
}

export async function getUserAchievements(userId?: string): Promise<UserAchievement[]> {
  const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!targetUserId) return [];

  const { data, error } = await supabase
    .from("user_achievements")
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq("user_id", targetUserId)
    .order("unlocked_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getUserAchievementCount(userId?: string): Promise<number> {
  const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!targetUserId) return 0;

  const { count, error } = await supabase
    .from("user_achievements")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId);

  if (error) return 0;
  return count || 0;
}

export async function getUserTotalPoints(userId?: string): Promise<number> {
  const achievements = await getUserAchievements(userId);
  return achievements.reduce((total, ua) => {
    const points = (ua.achievement as unknown as Achievement)?.points || 0;
    return total + points;
  }, 0);
}

export async function grantAchievement(
  userId: string,
  achievementName: string
): Promise<boolean> {
  // First, find the achievement by name
  const { data: achievement, error: findError } = await supabase
    .from("achievements")
    .select("id")
    .eq("name", achievementName)
    .single();

  if (findError || !achievement) return false;

  // Check if already granted
  const { data: existing } = await supabase
    .from("user_achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_id", achievement.id)
    .maybeSingle();

  if (existing) {
    // Already granted, return true but don't insert again
    return true;
  }

  // Grant the achievement
  const { error } = await supabase
    .from("user_achievements")
    .insert({
      user_id: userId,
      achievement_id: achievement.id,
    });

  // Return true if successful or if it already exists
  return !error || error.code === "23505";
}

export async function checkAndGrantAchievements(userId: string): Promise<string[]> {
  const granted: string[] = [];

  // Check profile completeness
  const { data: profile } = await supabase
    .from("profiles")
    .select("fullname, headline, bio, avatar_url, location")
    .eq("id", userId)
    .single();

  if (profile) {
    const fields = [profile.fullname, profile.headline, profile.bio, profile.avatar_url, profile.location];
    if (fields.every((f) => f && f.trim())) {
      if (await grantAchievement(userId, "Profile Complete")) {
        granted.push("Profile Complete");
      }
    }
  }

  // Check post count
  const { data: actor } = await supabase
    .from("actors")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (actor) {
    const { count: postCount } = await supabase
      .from("ap_objects")
      .select("id", { count: "exact", head: true })
      .eq("attributed_to", actor.id);

    if (postCount && postCount >= 1) {
      if (await grantAchievement(userId, "First Post")) {
        granted.push("First Post");
      }
    }

    if (postCount && postCount >= 10) {
      if (await grantAchievement(userId, "Thought Leader")) {
        granted.push("Thought Leader");
      }
    }
  }

  // Check connections
  const { count: connectionCount } = await supabase
    .from("user_connections")
    .select("id", { count: "exact", head: true })
    .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
    .eq("status", "accepted");

  if (connectionCount && connectionCount >= 1) {
    if (await grantAchievement(userId, "First Connection")) {
      granted.push("First Connection");
    }
  }

  if (connectionCount && connectionCount >= 10) {
    if (await grantAchievement(userId, "Networker")) {
      granted.push("Networker");
    }
  }

  // Check articles
  const { count: articleCount } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("published", true);

  if (articleCount && articleCount >= 1) {
    if (await grantAchievement(userId, "Article Author")) {
      granted.push("Article Author");
    }
  }

  // Check events
  const { count: eventCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (eventCount && eventCount >= 1) {
    if (await grantAchievement(userId, "Event Organizer")) {
      granted.push("Event Organizer");
    }
  }

  // Check job posts
  const { count: jobCount } = await supabase
    .from("job_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (jobCount && jobCount >= 1) {
    if (await grantAchievement(userId, "Job Poster")) {
      granted.push("Job Poster");
    }
  }

  // Check endorsements received
  const { data: skills } = await supabase
    .from("skills")
    .select("endorsements")
    .eq("user_id", userId);

  if (skills) {
    const totalEndorsements = skills.reduce((sum, s) => sum + (s.endorsements || 0), 0);
    if (totalEndorsements >= 5) {
      if (await grantAchievement(userId, "Helpful Hand")) {
        granted.push("Helpful Hand");
      }
    }
  }

  // Check referrals
  const { count: referralCount } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", userId)
    .eq("status", "completed");

  if (referralCount && referralCount >= 3) {
    if (await grantAchievement(userId, "Referral Champion")) {
      granted.push("Referral Champion");
    }
  }

  return granted;
}
