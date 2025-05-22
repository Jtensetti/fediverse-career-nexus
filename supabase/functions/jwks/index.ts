
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Function to convert PEM to JWK
async function pemToJwk(pemKey: string): Promise<JsonWebKey> {
  // Extract the base64-encoded DER
  const base64Der = pemKey
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");
  
  // Convert base64 to binary
  const binaryDer = Uint8Array.from(atob(base64Der), c => c.charCodeAt(0));
  
  // Import the key
  const publicKey = await crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    true,
    ["verify"]
  );
  
  // Export as JWK
  return await crypto.subtle.exportKey("jwk", publicKey);
}

// Handler for the JWKS endpoint
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API keys from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error" 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create Supabase client with anon key (public endpoint)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get all active server keys
    const { data: keys, error } = await supabase
      .from("server_keys")
      .select("key_id, public_key, algorithm")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error || !keys?.length) {
      console.error("Error fetching server keys:", error);
      return new Response(
        JSON.stringify({ 
          keys: [] 
        }),
        { 
          status: error ? 500 : 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Convert PEM keys to JWK format
    const jwkKeys = await Promise.all(keys.map(async (key) => {
      try {
        const jwk = await pemToJwk(key.public_key);
        return {
          ...jwk,
          kid: key.key_id,
          alg: key.algorithm,
          use: "sig",
        };
      } catch (err) {
        console.error("Error converting key:", err);
        return null;
      }
    }));

    // Filter out any failed conversions
    const validJwkKeys = jwkKeys.filter(Boolean);

    // Return the JWKS
    return new Response(
      JSON.stringify({ keys: validJwkKeys }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600" // Cache for 1 hour
        }
      }
    );
  } catch (error) {
    console.error("Error serving JWKS:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
