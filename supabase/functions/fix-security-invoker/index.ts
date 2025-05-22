
// supabase/functions/fix-security-invoker/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

serve(async (req: Request) => {
  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default in Deno Edge Functions
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API ANON KEY - env var exposed by default in Deno Edge Functions
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      // Create client with Auth context of the user that called the function
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Only allow authenticated users with admin privileges
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if user is an admin
    const { data: isAdmin, error: adminCheckError } = await supabaseClient.rpc(
      'is_admin', 
      { user_id: user.id }
    );

    if (adminCheckError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Recreate all 5 views with explicit SECURITY INVOKER
    // This is a more direct approach than the linter-refresh script
    const sqlQueries = [
      // 1. Get the current view definitions
      `SELECT viewname, definition FROM pg_views WHERE schemaname = 'public' AND viewname IN ('federated_feed', 'federation_metrics_by_host', 'federation_queue_stats', 'federated_posts_with_moderation', 'follower_batch_stats')`,
      
      // 2. Force a linter refresh as a backup approach
      `COMMENT ON DATABASE postgres IS 'refresh_' || to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS')`,
      
      // 3. Update supabase_metamodel if it exists
      `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relname = 'supabase_metamodel') THEN
          UPDATE supabase_metamodel SET updated_at = NOW();
        END IF;
      END $$;
      `
    ];
    
    // Execute the SQL queries
    for (const sql of sqlQueries) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
      if (error) throw error;
    }
    
    // Get the view definitions
    const { data: views, error: viewError } = await supabaseAdmin.rpc('exec_sql', { 
      sql: sqlQueries[0] 
    });
    
    if (viewError) throw viewError;
    
    // Recreate each view with SECURITY INVOKER explicitly stated
    for (const view of views) {
      // Extract just the SELECT part of the view definition
      const selectPart = view.definition.trim();
      const viewName = view.viewname;
      
      // Drop and recreate the view with SECURITY INVOKER
      const recreateSql = `
        DROP VIEW IF EXISTS public.${viewName};
        CREATE VIEW public.${viewName} 
        WITH (security_barrier=false, security_invoker=true) 
        AS ${selectPart}
      `;
      
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: recreateSql });
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        message: "Successfully updated all views to SECURITY INVOKER",
        views: views.map(v => v.viewname)
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
