import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../middleware/validate.ts";

const anonClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

async function isRateLimited(ip: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from('auth_request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('endpoint', 'login')
    .gte('timestamp', windowStart);
  return (count ?? 0) >= 5;
}

async function logRequest(ip: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  await supabase.from('auth_request_logs').insert({ ip, endpoint: 'login' });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '';
  if (await isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return new Response(JSON.stringify({ error: 'Validation error' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { email, password } = result.data;
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  await logRequest(ip);

  if (error || !data.session) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Invalid credentials' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(
    JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.session.user
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
