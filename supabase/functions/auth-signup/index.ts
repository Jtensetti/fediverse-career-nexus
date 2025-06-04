import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../middleware/validate.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

async function isRateLimited(ip: string) {
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from('auth_request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('endpoint', 'signup')
    .gte('timestamp', windowStart);
  return (count ?? 0) >= 5;
}

async function logRequest(ip: string) {
  await supabase.from('auth_request_logs').insert({ ip, endpoint: 'signup' });
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
  const result = signupSchema.safeParse(body);
  if (!result.success) {
    return new Response(JSON.stringify({ error: 'Validation error' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { email, password } = result.data;
  const { data: user, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: false });
  if (error || !user) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Unable to create user' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await supabase.from('email_verification_tokens').insert({ user_id: user.id, token, expires_at: expires });
  await logRequest(ip);

  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    const confirmUrl = `${siteUrl}/confirm-email?token=${token}`;
    await resend.emails.send({
      from: 'noreply@bondy.local',
      to: email,
      subject: 'Confirm your Bondy account',
      html: `<p>Please confirm your account by clicking <a href="${confirmUrl}">here</a>.</p>`
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
