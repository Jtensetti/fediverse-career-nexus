import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { encryptMessage } from "../_shared/message-encryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow service role or admin to run this migration
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Check if admin
      const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: user.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Find legacy messages with plain content but no encrypted content
    const { data: legacyMessages, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('id, content')
      .not('content', 'is', null)
      .neq('content', '')
      .or('encrypted_content.is.null,encrypted_content.eq.');

    if (fetchError) {
      throw fetchError;
    }

    if (!legacyMessages || legacyMessages.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No legacy messages to migrate",
        migrated: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Found ${legacyMessages.length} legacy messages to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const msg of legacyMessages) {
      try {
        // Encrypt the plain content
        const encryptedContent = await encryptMessage(msg.content);

        // Update the message with encrypted content and clear plain content
        const { error: updateError } = await supabaseAdmin
          .from('messages')
          .update({
            encrypted_content: encryptedContent,
            is_encrypted: true,
            content: '[encrypted]' // Keep a placeholder for backwards compatibility
          })
          .eq('id', msg.id);

        if (updateError) {
          console.error(`Failed to migrate message ${msg.id}:`, updateError);
          errors++;
        } else {
          migrated++;
        }
      } catch (err) {
        console.error(`Error encrypting message ${msg.id}:`, err);
        errors++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Migration complete`,
      total: legacyMessages.length,
      migrated,
      errors
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
