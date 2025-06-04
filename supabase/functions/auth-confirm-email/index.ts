import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../middleware/validate.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const schema = z.object({ token: z.string().uuid() });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return new Response(JSON.stringify({ error: 'Validation error' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { token } = result.data;
  const { data, error } = await supabase
    .from('email_verification_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token', token)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (data.used_at || new Date(data.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: 'Token expired' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  await supabase.auth.admin.updateUserById(data.user_id, { email_confirm: true });
  await supabase
    .from('email_verification_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id);

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
