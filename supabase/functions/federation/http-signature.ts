
// Re-export from the shared module for backwards compatibility
export { 
  signRequest, 
  getServerKey,
  generateRsaKeyPair,
  verifySignature,
  ensureActorHasKeys,
  signedFetch,
  fetchPublicKey,
  pemToPrivateKeyBuffer,
  pemToPublicKeyBuffer
} from "../_shared/http-signature.ts";

// Legacy function - get server key from database
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

export async function getServerKey(): Promise<{
  keyId: string;
  privateKey: string;
  publicKey: string;
} | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      return null;
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .rpc("get_current_server_key")
      .maybeSingle();
    
    if (error || !data) {
      console.error("Error fetching server key:", error);
      return null;
    }
    
    return {
      keyId: `${supabaseUrl}#main-key`,
      privateKey: data.private_key,
      publicKey: data.public_key
    };
  } catch (error) {
    console.error("Error in getServerKey:", error);
    return null;
  }
}
