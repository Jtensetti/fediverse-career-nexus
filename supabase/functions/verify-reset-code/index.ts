import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Zod schema for input validation
const resetVerifySchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email too long"),
  code: z.string().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters").max(128, "Password too long")
});

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
    const validationResult = resetVerifySchema.safeParse(body);
    
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

    const { email, code, newPassword } = validationResult.data;

    // Find the reset code
    const { data: resetCode, error: codeError } = await supabase
      .from("password_reset_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (codeError || !resetCode) {
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark code as used
    await supabase
      .from("password_reset_codes")
      .update({ used: true })
      .eq("id", resetCode.id);

    // Find the user using pagination (listUsers returns max 50 by default)
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
      
      // Safety limit
      if (page > 100) {
        console.error("Too many pages when searching for user");
        break;
      }
    }
    
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update password" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up old codes for this email
    await supabase
      .from("password_reset_codes")
      .delete()
      .eq("email", email.toLowerCase());

    console.log(`Password reset successful for ${email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Verify reset code error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
