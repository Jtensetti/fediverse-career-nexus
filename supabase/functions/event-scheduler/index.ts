import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Configuration
const PAST_EVENT_RETENTION_DAYS = 90; // Archive events older than 90 days
const NOTIFY_HOSTS_OF_NEW_RSVPS = true;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results = {
      expiredEvents: 0,
      rsvpNotifications: 0,
      errors: [] as string[],
    };

    console.log("Starting event scheduler tasks...");

    // 1. Mark very old past events as archived (soft delete by adding visibility = 'archived')
    const archiveCutoff = new Date();
    archiveCutoff.setDate(archiveCutoff.getDate() - PAST_EVENT_RETENTION_DAYS);

    const { data: expiredEvents, error: expireError } = await supabaseClient
      .from("events")
      .update({ visibility: 'archived' })
      .lt("end_date", archiveCutoff.toISOString())
      .neq("visibility", "archived")
      .select("id");

    if (expireError) {
      console.error("Error archiving expired events:", expireError);
      results.errors.push(`Archive error: ${expireError.message}`);
    } else {
      results.expiredEvents = expiredEvents?.length || 0;
      console.log(`Archived ${results.expiredEvents} expired events`);
    }

    // 2. Notify hosts about RSVPs from the last 24 hours
    if (NOTIFY_HOSTS_OF_NEW_RSVPS) {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      // Get events with new RSVPs in the last 24 hours
      const { data: recentRsvps, error: rsvpError } = await supabaseClient
        .from("event_rsvps")
        .select(`
          event_id,
          status,
          user_id,
          events!inner (
            id,
            title,
            user_id,
            start_date
          )
        `)
        .gte("created_at", yesterday.toISOString())
        .eq("status", "attending");

      if (rsvpError) {
        console.error("Error fetching recent RSVPs:", rsvpError);
        results.errors.push(`RSVP fetch error: ${rsvpError.message}`);
      } else if (recentRsvps && recentRsvps.length > 0) {
        // Group RSVPs by event host
        const hostRsvps = new Map<string, { eventTitle: string; eventId: string; count: number }[]>();

        for (const rsvp of recentRsvps) {
          const event = rsvp.events as any;
          if (!event) continue;

          const hostId = event.user_id;
          if (!hostRsvps.has(hostId)) {
            hostRsvps.set(hostId, []);
          }

          const existing = hostRsvps.get(hostId)!.find(e => e.eventId === event.id);
          if (existing) {
            existing.count++;
          } else {
            hostRsvps.get(hostId)!.push({
              eventTitle: event.title,
              eventId: event.id,
              count: 1
            });
          }
        }

        // Create notifications for each host
        for (const [hostId, events] of hostRsvps) {
          const totalRsvps = events.reduce((sum, e) => sum + e.count, 0);
          const eventList = events.map(e => `${e.eventTitle} (${e.count} new)`).join(', ');

          const { error: notifyError } = await supabaseClient
            .from("notifications")
            .insert({
              type: "event_rsvp_summary",
              recipient_id: hostId,
              content: `You have ${totalRsvps} new RSVP${totalRsvps > 1 ? 's' : ''} for: ${eventList}`,
              object_type: "event",
              read: false
            });

          if (notifyError) {
            console.error(`Error creating notification for host ${hostId}:`, notifyError);
          } else {
            results.rsvpNotifications++;
          }
        }

        console.log(`Sent ${results.rsvpNotifications} RSVP summary notifications`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in event-scheduler:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
