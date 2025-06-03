
import { supabase } from "@/integrations/supabase/client";

export interface LocalActor {
  "@context": string[];
  id: string;
  type: string;
  preferredUsername: string;
  name?: string;
  summary?: string;
  inbox: string;
  outbox: string;
  followers: string;
  following: string;
  publicKey: {
    id: string;
    owner: string;
    publicKeyPem: string;
  };
  [key: string]: any; // Add index signature for JSON compatibility
}

// Generate RSA key pair function (moved from outbox)
export const generateRsaKeyPair = async (): Promise<{
  publicKey: string;
  privateKey: string;
}> => {
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

  // Convert to base64
  const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyExport)));
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyExport)));
  
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
  
  return { publicKey: publicKeyPem, privateKey: privateKeyPem };
};

// Create a local actor object for ActivityPub
export const createLocalActorObject = (profile: any, domain: string): LocalActor => {
  const actorUrl = `https://${domain}/actor/${profile.username}`;
  
  return {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1"
    ],
    id: actorUrl,
    type: "Person",
    preferredUsername: profile.username,
    name: profile.fullname || profile.username,
    summary: profile.bio || "",
    inbox: `${actorUrl}/inbox`,
    outbox: `${actorUrl}/outbox`,
    followers: `${actorUrl}/followers`,
    following: `${actorUrl}/following`,
    publicKey: {
      id: `${actorUrl}#main-key`,
      owner: actorUrl,
      publicKeyPem: "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----" // Placeholder
    }
  };
};

// Create actor entries for a new user with RSA keys
export const createUserActor = async (userId: string): Promise<boolean> => {
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, fullname, bio')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.username) {
      console.error('Error fetching profile for actor creation:', profileError);
      return false;
    }

    // Generate RSA key pair for the actor
    const { publicKey, privateKey } = await generateRsaKeyPair();

    // Create actor record with keys
    const { data: actorData, error: actorError } = await supabase
      .from('actors')
      .insert({
        user_id: userId,
        preferred_username: profile.username,
        type: 'Person',
        status: 'active',
        private_key: privateKey,
        public_key: publicKey
      })
      .select()
      .single();

    if (actorError) {
      console.error('Error creating actor record:', actorError);
      return false;
    }

    // Get domain from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tvvrdoklywxllcpzxdls.supabase.co';
    const domain = new URL(supabaseUrl).hostname;
    
    // Create the ActivityPub actor object with the actual public key
    const actorObject = createLocalActorObject(profile, domain);
    actorObject.publicKey.publicKeyPem = publicKey;

    // Store in ap_objects
    const { error: apObjectError } = await supabase
      .from('ap_objects')
      .insert({
        type: 'Person',
        attributed_to: actorData.id,
        content: actorObject as any // Cast to any for JSON compatibility
      });

    if (apObjectError) {
      console.error('Error creating ap_object:', apObjectError);
      return false;
    }

    // Cache in remote_actors_cache for WebFinger
    const { error: cacheError } = await supabase
      .from('remote_actors_cache')
      .insert({
        actor_url: actorObject.id,
        actor_data: actorObject as any // Cast to any for JSON compatibility
      });

    if (cacheError) {
      console.error('Error caching actor:', cacheError);
      // Non-fatal error, continue
    }

    console.log(`Successfully created actor with keys for user ${profile.username}`);
    return true;
  } catch (error) {
    console.error('Error in createUserActor:', error);
    return false;
  }
};

// Ensure actor has RSA keys (for existing actors)
export const ensureActorKeys = async (actorId: string): Promise<boolean> => {
  try {
    // Check if actor already has keys
    const { data: actor, error: actorError } = await supabase
      .from('actors')
      .select('id, private_key, public_key, preferred_username')
      .eq('id', actorId)
      .single();

    if (actorError || !actor) {
      console.error('Error fetching actor:', actorError);
      return false;
    }

    // If keys already exist, return true
    if (actor.private_key && actor.public_key) {
      return true;
    }

    console.log(`Generating RSA keys for actor ${actor.preferred_username}`);
    
    // Generate new RSA key pair
    const { publicKey, privateKey } = await generateRsaKeyPair();

    // Update actor with new keys
    const { error: updateError } = await supabase
      .from('actors')
      .update({
        private_key: privateKey,
        public_key: publicKey
      })
      .eq('id', actorId);

    if (updateError) {
      console.error('Error updating actor with keys:', updateError);
      return false;
    }

    console.log(`Successfully generated keys for actor ${actor.preferred_username}`);
    return true;
  } catch (error) {
    console.error('Error in ensureActorKeys:', error);
    return false;
  }
};
