import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature, digest, date, host',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const siteUrl = Deno.env.get("SITE_URL") ?? "https://fediverse-career.lovable.app";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  username: z.string().optional(),
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

  try {
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '';
    if (await isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'Validation error', details: result.error.issues }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { email, password, firstName, lastName, username } = result.data;
    const fullname = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null;

    // Create user with metadata
    const { data: userData, error } = await supabase.auth.admin.createUser({ 
      email, 
      password, 
      email_confirm: false,
      user_metadata: {
        first_name: firstName || null,
        last_name: lastName || null,
        fullname,
        preferred_username: username || null,
      }
    });

    if (error || !userData.user) {
      console.error("Create user error:", error);
      return new Response(JSON.stringify({ error: error?.message ?? 'Unable to create user' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    await supabase.from('email_verification_tokens').insert({ 
      user_id: userData.user.id, 
      token, 
      expires_at: expires 
    });
    await logRequest(ip);

    // Send confirmation email via Resend
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const confirmUrl = `${siteUrl}/confirm-email?token=${token}`;
      const fromEmail = "Nolto <noreply@nolto.social>";
      
      try {
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: 'Confirm your Nolto account',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a1a1a; margin-bottom: 10px;">Welcome to Nolto!</h1>
              </div>
              
              <p>Hi${firstName ? ` ${firstName}` : ''},</p>
              
              <p>Thanks for signing up for Nolto, the federated professional network. Please confirm your email address to get started.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmUrl}" style="background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Confirm Email Address</a>
              </div>
              
              <p style="font-size: 14px; color: #666;">This link will expire in 24 hours. If you didn't create an account on Nolto, you can safely ignore this email.</p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center;">
                Nolto - The federated professional network<br>
                <a href="${siteUrl}" style="color: #0066cc;">nolto.social</a>
              </p>
            </body>
            </html>
          `
        });
        console.log("Confirmation email sent to:", email);
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // Don't fail signup if email fails - user can request resend
      }
    } else {
      console.warn("RESEND_API_KEY not configured - confirmation email not sent");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      userId: userData.user.id,
      message: 'Please check your email to confirm your account'
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error("Signup error:", err);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
