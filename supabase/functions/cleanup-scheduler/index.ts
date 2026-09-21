import { adminHandler } from "../_shared/user-auth.ts";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Default retention periods (in days)
const RETENTION = {
  AP_OBJECTS: 90,
  FEDERATION_LOGS: 30,
  PROCESSED_QUEUE: 7,
  EXPIRED_CACHE: 0, // Immediate cleanup
  OLD_ALERTS: 30
};

Deno.serve(adminHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dryRun = false } = await req.json().catch(() => ({}));

    console.log(`Starting cleanup scheduler (dryRun: ${dryRun})`);

    const results = {
      apObjects: 0,
      federationLogs: 0,
      processedQueue: 0,
      expiredCache: 0,
      oldAlerts: 0,
      instanceHealthReset: 0
    };

    // Published user content is retained until its author deletes it.
    // 2. Clean up old federation request logs (older than 30 days)
    const logsCutoff = new Date(Date.now() - RETENTION.FEDERATION_LOGS * 24 * 60 * 60 * 1000).toISOString();

    if (dryRun) {
      const { count } = await supabaseClient
        .from("federation_request_logs")
        .select("id", { count: "exact", head: true })
        .lt("timestamp", logsCutoff);
      results.federationLogs = count || 0;
    } else {
      const { data } = await supabaseClient
        .from("federation_request_logs")
        .delete()
        .lt("timestamp", logsCutoff)
        .select("id");
      results.federationLogs = data?.length || 0;
    }

    console.log(`Federation logs to clean: ${results.federationLogs}`);

    // 3. Clean up processed federation queue items (older than 7 days)
    const queueCutoff = new Date(Date.now() - RETENTION.PROCESSED_QUEUE * 24 * 60 * 60 * 1000).toISOString();

    if (dryRun) {
      const { count } = await supabaseClient
        .from("federation_queue_partitioned")
        .select("id", { count: "exact", head: true })
        .eq("status", "processed")
        .lt("processed_at", queueCutoff);
      results.processedQueue = count || 0;
    } else {
      const { data } = await supabaseClient
        .from("federation_queue_partitioned")
        .delete()
        .eq("status", "processed")
        .lt("processed_at", queueCutoff)
        .select("id");
      results.processedQueue = data?.length || 0;
    }

    console.log(`Processed queue items to clean: ${results.processedQueue}`);

    // 4. Clean up expired cache entries
    if (dryRun) {
      const { count } = await supabaseClient
        .from("remote_actors_cache")
        .select("id", { count: "exact", head: true })
        .lt("expires_at", new Date().toISOString());
      results.expiredCache = count || 0;
    } else {
      const { data } = await supabaseClient
        .from("remote_actors_cache")
        .delete()
        .lt("expires_at", new Date().toISOString())
        .select("id");
      results.expiredCache = data?.length || 0;
    }

    console.log(`Expired cache entries to clean: ${results.expiredCache}`);

    // 5. Clean up old acknowledged alerts (older than 30 days)
    const alertsCutoff = new Date(Date.now() - RETENTION.OLD_ALERTS * 24 * 60 * 60 * 1000).toISOString();

    if (dryRun) {
      const { count } = await supabaseClient
        .from("federation_alerts")
        .select("id", { count: "exact", head: true })
        .not("acknowledged_at", "is", null)
        .lt("acknowledged_at", alertsCutoff);
      results.oldAlerts = count || 0;
    } else {
      const { data } = await supabaseClient
        .from("federation_alerts")
        .delete()
        .not("acknowledged_at", "is", null)
        .lt("acknowledged_at", alertsCutoff)
        .select("id");
      results.oldAlerts = data?.length || 0;
    }

    console.log(`Old alerts to clean: ${results.oldAlerts}`);

    // 6. Reset 24-hour counters on remote instances (runs daily)
    if (!dryRun) {
      const { data } = await supabaseClient
        .from("remote_instances")
        .update({
          request_count_24h: 0,
          error_count_24h: 0
        })
        .gt("request_count_24h", 0)
        .select("id");
      results.instanceHealthReset = data?.length || 0;
    }

    console.log(`Instance health counters reset: ${results.instanceHealthReset}`);

    const totalCleaned = Object.values(results).reduce((a, b) => a + b, 0);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        results,
        totalCleaned,
        message: dryRun
          ? `Would clean ${totalCleaned} items`
          : `Cleaned ${totalCleaned} items`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleanup scheduler error:", error);

    return new Response(
      JSON.stringify({ error: "Internal server error", details: (error instanceof Error ? error.message : "Request failed") }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
