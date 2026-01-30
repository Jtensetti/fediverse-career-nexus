import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FlaggedContent {
  id: string;
  reporter_id: string;
  content_type: "post" | "article" | "job" | "user" | "event";
  content_id: string;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reporter?: {
    username: string;
    fullname: string | null;
    avatar_url: string | null;
  };
  content_preview?: string;
}

export interface UserBan {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  user?: {
    username: string;
    fullname: string | null;
    avatar_url: string | null;
  };
  banned_by_user?: {
    username: string;
    fullname: string | null;
  };
}

export interface Moderator {
  id: string;
  user_id: string;
  role: "admin" | "moderator" | "user";
  created_at: string;
  user?: {
    username: string;
    fullname: string | null;
    avatar_url: string | null;
    email?: string;
  };
}

export interface ModerationStats {
  pendingReports: number;
  activeBans: number;
  totalActionsToday: number;
  totalModerators: number;
}

// Get flagged content with details
export async function getFlaggedContent(
  status: "pending" | "reviewed" | "resolved" | "dismissed" | "all" = "pending"
): Promise<FlaggedContent[]> {
  try {
    let query = supabase
      .from("content_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch reporter details and content previews
    const reportsWithDetails = await Promise.all(
      (data || []).map(async (report) => {
        let content_preview = "";
        let reporter = null;
        
        // Get reporter info
        try {
          const { data: reporterData } = await supabase
            .from("public_profiles")
            .select("username, fullname, avatar_url")
            .eq("id", report.reporter_id)
            .single();
          reporter = reporterData;
        } catch (e) {
          // Ignore
        }
        
        try {
          if (report.content_type === "post") {
            const { data: post } = await supabase
              .from("ap_objects")
              .select("content")
              .eq("id", report.content_id)
              .single();
            const postContent = post?.content as Record<string, any> | null;
            content_preview = postContent?.content?.slice(0, 200) || "Post not found";
          } else if (report.content_type === "article") {
            const { data: article } = await supabase
              .from("articles")
              .select("title, content")
              .eq("id", report.content_id)
              .single();
            content_preview = article?.title || "Article not found";
          } else if (report.content_type === "user") {
            const { data: profile } = await supabase
              .from("public_profiles")
              .select("username, fullname")
              .eq("id", report.content_id)
              .single();
            content_preview = profile ? `@${profile.username} (${profile.fullname || "No name"})` : "User not found";
          } else if (report.content_type === "job") {
            const { data: job } = await supabase
              .from("job_posts")
              .select("title, company")
              .eq("id", report.content_id)
              .single();
            content_preview = job ? `${job.title} at ${job.company}` : "Job not found";
          } else if (report.content_type === "event") {
            const { data: event } = await supabase
              .from("events")
              .select("title")
              .eq("id", report.content_id)
              .single();
            content_preview = event?.title || "Event not found";
          }
        } catch (e) {
          content_preview = "Content not available";
        }

        return {
          ...report,
          reporter,
          content_preview,
        } as FlaggedContent;
      })
    );

    return reportsWithDetails;
  } catch (error) {
    console.error("Error fetching flagged content:", error);
    return [];
  }
}

// Update report status
export async function updateReportStatus(
  reportId: string,
  status: "pending" | "reviewed" | "resolved" | "dismissed",
  action?: string
): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error("You must be logged in");
      return false;
    }

    const { error } = await supabase
      .from("content_reports")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.session.user.id,
      })
      .eq("id", reportId);

    if (error) throw error;

    // Log the moderation action
    if (action) {
      await supabase.from("moderation_actions").insert({
        type: action as "warn" | "silence" | "block",
        moderator_id: session.session.user.id,
        reason: `Report ${reportId} marked as ${status}`,
        is_public: false,
      });
    }

    toast.success(`Report marked as ${status}`);
    return true;
  } catch (error) {
    console.error("Error updating report status:", error);
    toast.error("Failed to update report");
    return false;
  }
}

// Ban a user
export async function banUser(
  userId: string,
  reason: string,
  durationDays?: number
): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error("You must be logged in");
      return false;
    }

    const expiresAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await supabase.from("user_bans").insert({
      user_id: userId,
      banned_by: session.session.user.id,
      reason,
      expires_at: expiresAt,
    });

    if (error) throw error;

    // Log the moderation action
    await supabase.from("moderation_actions").insert({
      type: "block",
      target_user_id: userId,
      moderator_id: session.session.user.id,
      reason,
      is_public: true,
      expires_at: expiresAt,
    });

    const duration = durationDays ? `for ${durationDays} days` : "permanently";
    toast.success(`User banned ${duration}`);
    return true;
  } catch (error) {
    console.error("Error banning user:", error);
    toast.error("Failed to ban user");
    return false;
  }
}

// Revoke a ban
export async function revokeBan(banId: string): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error("You must be logged in");
      return false;
    }

    const { error } = await supabase
      .from("user_bans")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: session.session.user.id,
      })
      .eq("id", banId);

    if (error) throw error;

    toast.success("Ban revoked successfully");
    return true;
  } catch (error) {
    console.error("Error revoking ban:", error);
    toast.error("Failed to revoke ban");
    return false;
  }
}

export async function getActiveBans(): Promise<UserBan[]> {
  try {
    const { data, error } = await supabase
      .from("user_bans")
      .select("*")
      .is("revoked_at", null)
      .or("expires_at.is.null,expires_at.gt.now()")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Fetch user profiles from public_profiles view
    const userIds = [...new Set(data.map(b => b.user_id))];
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, username, fullname, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return data.map(ban => ({
      ...ban,
      user: profileMap.get(ban.user_id) || null
    })) as unknown as UserBan[];
  } catch (error) {
    console.error("Error fetching active bans:", error);
    return [];
  }
}

export async function getAllBans(): Promise<UserBan[]> {
  try {
    const { data, error } = await supabase
      .from("user_bans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Fetch user profiles from public_profiles view
    const userIds = [...new Set(data.map(b => b.user_id))];
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, username, fullname, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return data.map(ban => ({
      ...ban,
      user: profileMap.get(ban.user_id) || null
    })) as unknown as UserBan[];
  } catch (error) {
    console.error("Error fetching all bans:", error);
    return [];
  }
}

// Add moderator role
export async function addModerator(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "moderator",
    });

    if (error) throw error;

    toast.success("Moderator role added");
    return true;
  } catch (error: any) {
    console.error("Error adding moderator:", error);
    if (error.code === "23505") {
      toast.error("User already has this role");
    } else {
      toast.error("Failed to add moderator");
    }
    return false;
  }
}

// Remove moderator role
export async function removeModerator(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "moderator");

    if (error) throw error;

    toast.success("Moderator role removed");
    return true;
  } catch (error) {
    console.error("Error removing moderator:", error);
    toast.error("Failed to remove moderator");
    return false;
  }
}

// Get moderators list
export async function getModerators(): Promise<Moderator[]> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .in("role", ["admin", "moderator"])
      .order("role", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Fetch user profiles from public_profiles view
    const userIds = [...new Set(data.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, username, fullname, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return data.map(role => ({
      ...role,
      user: profileMap.get(role.user_id) || null
    })) as unknown as Moderator[];
  } catch (error) {
    console.error("Error fetching moderators:", error);
    return [];
  }
}

// Delete flagged content
export async function deleteFlaggedContent(
  contentType: string,
  contentId: string
): Promise<boolean> {
  try {
    let error;

    if (contentType === "post") {
      ({ error } = await supabase.from("ap_objects").delete().eq("id", contentId));
    } else if (contentType === "article") {
      ({ error } = await supabase.from("articles").delete().eq("id", contentId));
    } else if (contentType === "job") {
      ({ error } = await supabase.from("job_posts").delete().eq("id", contentId));
    } else if (contentType === "event") {
      ({ error } = await supabase.from("events").delete().eq("id", contentId));
    }

    if (error) throw error;

    toast.success("Content deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting content:", error);
    toast.error("Failed to delete content");
    return false;
  }
}

// Get moderation statistics
export async function getModerationStats(): Promise<ModerationStats> {
  try {
    // Get pending reports count
    const { count: pendingReports } = await supabase
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    // Get active bans count
    const { count: activeBans } = await supabase
      .from("user_bans")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null)
      .or("expires_at.is.null,expires_at.gt.now()");

    // Get today's actions count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { count: totalActionsToday } = await supabase
      .from("moderation_actions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    // Get moderators count
    const { count: totalModerators } = await supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .in("role", ["admin", "moderator"]);

    return {
      pendingReports: pendingReports || 0,
      activeBans: activeBans || 0,
      totalActionsToday: totalActionsToday || 0,
      totalModerators: totalModerators || 0,
    };
  } catch (error) {
    console.error("Error fetching moderation stats:", error);
    return {
      pendingReports: 0,
      activeBans: 0,
      totalActionsToday: 0,
      totalModerators: 0,
    };
  }
}

// Search users for moderation actions
export async function searchUsers(query: string): Promise<{
  id: string;
  username: string;
  fullname: string | null;
  avatar_url: string | null;
  is_banned: boolean;
}[]> {
  try {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
      .from("public_profiles")
      .select("id, username, fullname, avatar_url")
      .or(`username.ilike.%${query}%,fullname.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;

    // Check ban status for each user
    const usersWithBanStatus = await Promise.all(
      (data || []).map(async (user) => {
        const { data: banData } = await supabase
          .rpc("is_user_banned", { check_user_id: user.id });
        
        return {
          ...user,
          is_banned: banData || false,
        };
      })
    );

    return usersWithBanStatus;
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

// Warn a user
export async function warnUser(userId: string, reason: string): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error("You must be logged in");
      return false;
    }

    const { error } = await supabase.from("moderation_actions").insert({
      type: "warn",
      target_user_id: userId,
      moderator_id: session.session.user.id,
      reason,
      is_public: false,
    });

    if (error) throw error;

    // Create a notification for the user
    await supabase.from("notifications").insert({
      type: "moderation_warning",
      recipient_id: userId,
      actor_id: session.session.user.id,
      content: reason,
      object_type: "warning",
    });

    toast.success("Warning sent to user");
    return true;
  } catch (error) {
    console.error("Error warning user:", error);
    toast.error("Failed to send warning");
    return false;
  }
}
