import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CompanyCreateRequest {
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  founded_year?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with user's token for auth check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to verify authentication
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: CompanyCreateRequest = await req.json();

    if (!body.slug || !body.name) {
      return new Response(
        JSON.stringify({ error: "Slug and name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for bypassing RLS
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if slug is reserved
    const { data: isReserved } = await serviceClient.rpc('is_slug_reserved', { _slug: body.slug });
    if (isReserved) {
      return new Response(
        JSON.stringify({ error: "This company URL is reserved" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if slug already exists
    const { data: existingCompany } = await serviceClient
      .from('companies')
      .select('id')
      .eq('slug', body.slug)
      .single();

    if (existingCompany) {
      return new Response(
        JSON.stringify({ error: "A company with this URL already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create company using service role
    const { data: company, error: companyError } = await serviceClient
      .from('companies')
      .insert({
        slug: body.slug.toLowerCase(),
        name: body.name,
        tagline: body.tagline || null,
        description: body.description || null,
        logo_url: body.logo_url || null,
        banner_url: body.banner_url || null,
        website: body.website || null,
        industry: body.industry || null,
        size: body.size || null,
        location: body.location || null,
        founded_year: body.founded_year || null,
        claim_status: 'claimed', // Auto-claimed by creator
        is_active: true,
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      return new Response(
        JSON.stringify({ error: companyError.message || "Failed to create company" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign creator as owner (using service role to bypass RLS chicken-and-egg)
    const { error: roleError } = await serviceClient
      .from('company_roles')
      .insert({
        company_id: company.id,
        user_id: user.id,
        role: 'owner',
      });

    if (roleError) {
      console.error('Error assigning owner role:', roleError);
      // Rollback company creation
      await serviceClient.from('companies').delete().eq('id', company.id);
      return new Response(
        JSON.stringify({ error: "Failed to assign company ownership" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log audit entry
    await serviceClient
      .from('company_audit_log')
      .insert({
        company_id: company.id,
        actor_user_id: user.id,
        action: 'company_created',
        metadata: { name: body.name, slug: body.slug },
      });

    return new Response(
      JSON.stringify({ company }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
