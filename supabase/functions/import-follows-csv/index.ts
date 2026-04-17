/**
 * Import a Mastodon-format follows CSV ("Account address,Show boosts,...")
 * and queue Follow activities for each entry. Used by the "Migrate TO
 * Samverkan" flow so users moving from another instance can rebuild
 * their following list automatically.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Row {
  acct: string;
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  // Skip header if it looks like one
  const start = /account/i.test(lines[0]) ? 1 : 0;
  const rows: Row[] = [];
  for (let i = start; i < lines.length; i++) {
    const first = lines[i].split(",")[0].trim().replace(/^"|"$/g, "");
    if (!first) continue;
    // Tolerate optional leading "@"
    const acct = first.replace(/^@/, "");
    if (acct.includes("@")) rows.push({ acct });
  }
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Authorization required" }, 401);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: "Invalid token" }, 401);

  let csv = "";
  try {
    const body = await req.json();
    csv = String(body.csv ?? "");
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!csv.trim()) return json({ error: "Empty CSV" }, 400);

  const rows = parseCsv(csv);
  if (rows.length === 0) return json({ error: "No valid rows found" }, 400);
  if (rows.length > 5000) {
    return json({ error: "Too many rows (max 5000)" }, 413);
  }

  // Find the user's local actor
  const { data: actor } = await supabase
    .from("actors")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_remote", false)
    .single();

  if (!actor) return json({ error: "Local actor not found" }, 404);

  let queued = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      // For each acct, kick off a webfinger lookup + follow via send-follow.
      // We reuse send-follow to keep one signing path.
      const { error } = await supabase.functions.invoke("send-follow", {
        body: { acct: row.acct, localActorId: actor.id },
        headers: { Authorization: authHeader },
      });
      if (error) {
        skipped++;
        if (errors.length < 10) errors.push(`${row.acct}: ${error.message}`);
      } else {
        queued++;
      }
    } catch (e) {
      skipped++;
      if (errors.length < 10) errors.push(`${row.acct}: ${(e as Error).message}`);
    }
  }

  return json({
    success: true,
    total: rows.length,
    queued,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
});
