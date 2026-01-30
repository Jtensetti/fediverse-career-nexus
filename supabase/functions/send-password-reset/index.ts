import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Zod schema for input validation
const resetRequestSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email too long")
});

// Generate a 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse and validate input with Zod
    const body = await req.json();
    const validationResult = resetRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: "Validation error", 
        details: validationResult.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = validationResult.data;

    // Check if user exists in auth.users (only local users can reset password)
    // Use pagination to search through all users - listUsers returns max 50 by default
    let user = null;
    let page = 1;
    const perPage = 100;
    
    while (!user) {
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (userError) {
        console.error("Error listing users:", userError);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Search for user in this page
      user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      // If we found the user or there are no more users, stop
      if (user || userData.users.length < perPage) {
        break;
      }
      
      page++;
      
      // Safety limit - don't loop forever
      if (page > 100) {
        console.error("Too many pages when searching for user");
        break;
      }
    }
    
    if (!user) {
      // Don't reveal if user exists - always return success
      console.log(`No user found for email: ${email}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is a federated user (they should reset on their home instance)
    const { data: profile } = await supabase
      .from("profiles")
      .select("auth_type, home_instance")
      .eq("id", user.id)
      .single();

    if (profile?.auth_type === "federated") {
      return new Response(JSON.stringify({ 
        error: `This account uses Fediverse login. Please reset your password on ${profile.home_instance || 'your home instance'}.`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 3 codes per email in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("password_reset_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", email.toLowerCase())
      .gte("created_at", oneHourAgo);

    if (count && count >= 3) {
      return new Response(JSON.stringify({ 
        error: "Too many reset attempts. Please try again later."
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate code and store it
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const { error: insertError } = await supabase
      .from("password_reset_codes")
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing reset code:", insertError);
      return new Response(JSON.stringify({ error: "Failed to generate reset code" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email via Resend
    // Use nolto.social domain for production emails
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Nolto <noreply@nolto.social>";
    
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Your Nolto Password Reset Code",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 24px;">Reset Your Password</h1>
          
          <p style="font-size: 16px; color: #4a4a4a; line-height: 1.5; margin-bottom: 24px;">
            Use this code to reset your Nolto password:
          </p>
          
          <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
          </div>
          
          <p style="font-size: 14px; color: #6a6a6a; line-height: 1.5; margin-bottom: 8px;">
            This code expires in <strong>15 minutes</strong>.
          </p>
          
          <p style="font-size: 14px; color: #6a6a6a; line-height: 1.5;">
            If you didn't request this, you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          
          <p style="font-size: 12px; color: #9a9a9a;">
            — The Nolto Team
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(JSON.stringify({ error: "Failed to send reset email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Password reset code sent to ${email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Password reset error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
