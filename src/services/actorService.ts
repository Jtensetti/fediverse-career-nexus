
import { supabase } from "@/integrations/supabase/client";

export interface LocalActor {
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
}

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

// Create actor entries for a new user
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

    // Create actor record
    const { data: actorData, error: actorError } = await supabase
      .from('actors')
      .insert({
        user_id: userId,
        preferred_username: profile.username,
        type: 'Person',
        status: 'active'
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
    
    // Create the ActivityPub actor object
    const actorObject = createLocalActorObject(profile, domain);

    // Store in ap_objects
    const { error: apObjectError } = await supabase
      .from('ap_objects')
      .insert({
        type: 'Person',
        attributed_to: actorData.id,
        content: actorObject
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
        actor_data: actorObject
      });

    if (cacheError) {
      console.error('Error caching actor:', cacheError);
      // Non-fatal error, continue
    }

    console.log(`Successfully created actor for user ${profile.username}`);
    return true;
  } catch (error) {
    console.error('Error in createUserActor:', error);
    return false;
  }
};
