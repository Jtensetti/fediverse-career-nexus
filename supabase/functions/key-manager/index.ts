
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { encode as encodeBase64 } from "https://deno.land/std@0.177.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Function to generate a 2048-bit RSA key pair
async function generateRsaKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
  jwk: JsonWebKey;
}> {
  // Generate RSA key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export keys to PKCS8 and SPKI formats
  const privateKeyExport = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const publicKeyExport = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  
  // Export as JWK for JWKS endpoint
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  // Convert to base64 PEM format
  const privateKeyBase64 = encodeBase64(new Uint8Array(privateKeyExport));
  const publicKeyBase64 = encodeBase64(new Uint8Array(publicKeyExport));
  
  const privateKeyPem = [
    "-----BEGIN PRIVATE KEY-----",
    ...privateKeyBase64.match(/.{1,64}/g) || [],
    "-----END PRIVATE KEY-----"
  ].join("\n");
  
  const publicKeyPem = [
    "-----BEGIN PUBLIC KEY-----",
    ...publicKeyBase64.match(/.{1,64}/g) || [],
    "-----END PUBLIC KEY-----"
  ].join("\n");
  
  return { publicKey: publicKeyPem, privateKey: privateKeyPem, jwk };
}

// Store key pair in the database
async function storeKeyPair(
  supabase: any,
  keyId: string,
  publicKey: string,
  privateKey: string
): Promise<string | null> {
  // First, mark all existing keys as not current
  await supabase
    .from("server_keys")
    .update({ is_current: false })
    .eq("is_current", true);

  // Then insert the new key
  const { data, error } = await supabase
    .from("server_keys")
    .insert({
      key_id: keyId,
      public_key: publicKey,
      private_key: privateKey,
      is_current: true
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error storing key pair:", error);
    return null;
  }

  return data.id;
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API keys from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          error: "Missing environment variables" 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if we already have a current key
    const { data: existingKey } = await supabase
      .rpc("get_current_server_key")
      .maybeSingle();

    if (existingKey) {
      return new Response(
        JSON.stringify({
          message: "Server already has a current key",
          keyId: existingKey.key_id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Generate new key pair
    const { publicKey, privateKey } = await generateRsaKeyPair();
    
    // Create a key ID (using a UUID)
    const keyId = crypto.randomUUID();
    
    // Store the key pair
    const keyPairId = await storeKeyPair(supabase, keyId, publicKey, privateKey);
    
    if (!keyPairId) {
      return new Response(
        JSON.stringify({ error: "Failed to store key pair" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Return success
    return new Response(
      JSON.stringify({
        message: "Generated and stored new server key pair",
        keyId: keyId
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error generating key pair:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
