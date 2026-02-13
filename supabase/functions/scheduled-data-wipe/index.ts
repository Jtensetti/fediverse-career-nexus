import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify this is called with service role (cron or admin)
  const authHeader = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Only allow service role or anon key (from cron)
  const token = authHeader?.replace("Bearer ", "");
  if (token !== serviceRoleKey && token !== anonKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const log: string[] = [];

  try {
    // Check if we're past the wipe date
    const wipeDate = new Date("2026-03-15T00:00:00Z");
    if (new Date() < wipeDate) {
      return new Response(JSON.stringify({ message: "Wipe date not reached yet", wipeDate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log.push("Starting full data wipe...");

    // 1. Delete all storage bucket contents
    const buckets = ["posts", "avatars", "article-covers", "article-images", "articles", "company-assets"];
    for (const bucket of buckets) {
      try {
        const { data: files } = await supabase.storage.from(bucket).list("", { limit: 1000 });
        if (files && files.length > 0) {
          const paths = files.map((f) => f.name);
          await supabase.storage.from(bucket).remove(paths);
          log.push(`Cleared storage bucket: ${bucket} (${paths.length} files)`);
        } else {
          log.push(`Bucket ${bucket}: empty`);
        }
      } catch (e) {
        log.push(`Error clearing bucket ${bucket}: ${e.message}`);
      }
    }

    // 2. Delete all data from tables in dependency order
    // Disable triggers temporarily to avoid cascade issues
    const tables = [
      // Dependent/junction tables first
      "federation_queue_partitioned",
      "federation_request_logs",
      "federation_alerts",
      "follower_batches",
      "inbox_items",
      "activities",
      "actor_followers",
      "outgoing_follows",
      "federated_sessions",
      "remote_actors_cache",
      "notification_preferences",
      "notifications",
      "poll_votes",
      "polls",
      "post_replies",
      "post_reactions",
      "article_reactions",
      "article_authors",
      "comment_reactions",
      "saved_items",
      "content_reports",
      "user_blocks",
      "user_achievements",
      "skill_endorsements",
      "skills",
      "cv_sections",
      "education",
      "experiences",
      "referral_uses",
      "referral_codes",
      "profile_views",
      "author_follows",
      "user_connections",
      "messages",
      "message_requests",
      "job_conversations",
      "job_posts",
      "event_attendees",
      "event_invitations",
      "event_rsvps",
      "events",
      "company_audit_log",
      "company_claim_requests",
      "company_employees",
      "company_followers",
      "company_roles",
      "company_posts",
      "starter_pack_members",
      "starter_pack_followers",
      "starter_packs",
      "custom_feeds",
      "cross_post_settings",
      "email_verification_tokens",
      "password_reset_codes",
      "auth_request_logs",
      "user_bans",
      "moderation_log",
      "section_visibility",
      "newsletter_subscribers",
      "onboarding_progress",
      // Content tables
      "ap_objects",
      "articles",
      "companies",
      // Actor/profile tables
      "actors",
      "user_settings",
      "user_roles",
      "profiles",
      // Server keys
      "server_keys",
      "remote_instances",
      "blocked_actors",
      "blocked_domains",
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase.rpc("exec_sql", { sql: `TRUNCATE public."${table}" CASCADE` });
        if (error) {
          // Fallback: try DELETE
          const { error: delError } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
          if (delError) {
            log.push(`Could not clear ${table}: ${delError.message}`);
          } else {
            log.push(`Cleared table (DELETE): ${table}`);
          }
        } else {
          log.push(`Cleared table (TRUNCATE): ${table}`);
        }
      } catch (e) {
        log.push(`Error on ${table}: ${e.message}`);
      }
    }

    // 3. Delete all auth users
    try {
      const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (users?.users) {
        for (const user of users.users) {
          await supabase.auth.admin.deleteUser(user.id);
        }
        log.push(`Deleted ${users.users.length} auth users`);
      }
    } catch (e) {
      log.push(`Error deleting auth users: ${e.message}`);
    }

    // 4. Unschedule the cron job itself
    try {
      await supabase.rpc("exec_sql", { sql: `SELECT cron.unschedule('scheduled-data-wipe');` });
      log.push("Unscheduled cron job");
    } catch (e) {
      log.push(`Could not unschedule cron: ${e.message}`);
    }

    log.push("Data wipe complete.");

    return new Response(JSON.stringify({ success: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log.push(`Fatal error: ${e.message}`);
    return new Response(JSON.stringify({ success: false, log, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
