import { HttpError, requireAdmin } from "../_shared/user-auth.ts";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await requireAdmin(req);
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof HttpError ? error.message : "Authentication unavailable" }), {
      status: error instanceof HttpError ? error.status : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  if (!type) {
    return new Response(JSON.stringify({ error: 'type required' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (req.method === 'GET') {
    const table = type === 'domain' ? 'blocked_domains' : 'blocked_actors';
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const table = type === 'domain' ? 'blocked_domains' : 'blocked_actors';
    const payload = type === 'domain'
      ? { host: body.host, reason: body.reason }
      : { actor_url: body.actor_url, reason: body.reason };
    const { error } = await supabase.from(table).upsert(payload);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (req.method === 'DELETE') {
    const target = url.searchParams.get('target');
    if (!target) {
      return new Response(JSON.stringify({ error: 'target required' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const table = type === 'domain' ? 'blocked_domains' : 'blocked_actors';
    const column = type === 'domain' ? 'host' : 'actor_url';
    const { error } = await supabase.from(table).delete().eq(column, target);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
