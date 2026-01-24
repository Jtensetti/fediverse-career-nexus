import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Generate RSA key pair for an actor
async function generateRsaKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export keys
  const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  // Convert to PEM format
  const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer);
  const privateKeyBase64 = arrayBufferToBase64(privateKeyBuffer);

  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----`;
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g)?.join("\n")}\n-----END PRIVATE KEY-----`;

  return { publicKey: publicKeyPem, privateKey: privateKeyPem };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get optional limit from query params
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "50");
    const dryRun = url.searchParams.get("dry_run") === "true";

    console.log(`Starting key generation (limit: ${limit}, dry_run: ${dryRun})`);

    // Find actors without public keys
    const { data: actorsWithoutKeys, error: fetchError } = await supabase
      .from("actors")
      .select("id, preferred_username, user_id")
      .is("public_key", null)
      .eq("status", "active")
      .eq("is_remote", false)
      .limit(limit);

    if (fetchError) {
      console.error("Error fetching actors:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch actors", details: fetchError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!actorsWithoutKeys || actorsWithoutKeys.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No actors found without public keys",
          processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${actorsWithoutKeys.length} actors without keys`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          message: "Dry run - no changes made",
          actorsToProcess: actorsWithoutKeys.length,
          actors: actorsWithoutKeys.map(a => ({ id: a.id, username: a.preferred_username }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process actors in batches
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ actorId: string; error: string }>,
    };

    for (const actor of actorsWithoutKeys) {
      try {
        console.log(`Generating keys for actor: ${actor.preferred_username} (${actor.id})`);
        
        const { publicKey, privateKey } = await generateRsaKeyPair();
        
        // Update the actor with the new keys
        const { error: updateError } = await supabase
          .from("actors")
          .update({
            public_key: publicKey,
            private_key: privateKey,
            updated_at: new Date().toISOString(),
          })
          .eq("id", actor.id);

        if (updateError) {
          console.error(`Error updating actor ${actor.id}:`, updateError);
          results.failed++;
          results.errors.push({ actorId: actor.id, error: updateError.message });
        } else {
          console.log(`Successfully generated keys for actor: ${actor.preferred_username}`);
          results.success++;
        }
      } catch (keyError) {
        console.error(`Error generating keys for actor ${actor.id}:`, keyError);
        results.failed++;
        results.errors.push({ actorId: actor.id, error: String(keyError) });
      }
    }

    console.log(`Key generation complete. Success: ${results.success}, Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        message: "Key generation complete",
        totalActors: actorsWithoutKeys.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors.length > 0 ? results.errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
