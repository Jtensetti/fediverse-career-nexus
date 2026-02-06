/**
 * Federation Mention Service
 * Handles WebFinger lookups via Edge Function proxy and ActivityPub mention tagging
 */

import { extractMentionsWithInstances, type ParsedMention } from "@/lib/linkify";

export interface ActivityPubMentionTag {
  type: "Mention";
  href: string;
  name: string;
}

interface LookupRemoteActorResponse {
  success: boolean;
  actorUrl?: string;
  inbox?: string | null;
  cached?: boolean;
  error?: string;
}

/**
 * Performs a WebFinger lookup via the Edge Function proxy.
 * This avoids CORS issues by making the request server-side.
 */
export async function lookupRemoteActor(
  username: string,
  domain: string
): Promise<string | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error("VITE_SUPABASE_URL not configured");
      return null;
    }

    const resource = `${username}@${domain}`;
    console.log(`Looking up remote actor via proxy: ${resource}`);

    const response = await fetch(
      `${supabaseUrl}/functions/v1/lookup-remote-actor`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resource }),
      }
    );

    if (!response.ok) {
      console.warn(`Remote actor lookup failed for ${resource}: HTTP ${response.status}`);
      return null;
    }

    const data: LookupRemoteActorResponse = await response.json();

    if (!data.success || !data.actorUrl) {
      console.warn(`Remote actor lookup failed for ${resource}: ${data.error || "No actor URL"}`);
      return null;
    }

    console.log(`Resolved ${resource} -> ${data.actorUrl}${data.cached ? " (cached)" : ""}`);
    return data.actorUrl;
  } catch (error) {
    console.warn(`Error looking up remote actor ${username}@${domain}:`, error);
    return null;
  }
}

/**
 * Process federated mentions in post content
 * - Resolves remote users via Edge Function proxy (WebFinger)
 * - Adds Mention tags to the ActivityPub object
 * - Adds actor URLs to cc field for direct delivery
 * 
 * @param content - The post content text
 * @param noteObject - The ActivityPub Note object to augment
 * @returns The augmented noteObject with tags and cc addresses
 */
export async function processFederatedMentions(
  content: string,
  noteObject: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const mentions = extractMentionsWithInstances(content);
  
  if (mentions.length === 0) {
    return noteObject;
  }
  
  console.log(`Processing ${mentions.length} mentions for federation:`, mentions);
  
  const tags: ActivityPubMentionTag[] = [];
  const ccAddresses: string[] = [...((noteObject.cc as string[]) || [])];
  
  // Process remote mentions in parallel for speed
  const remoteMentions = mentions.filter(m => m.isRemote);
  
  if (remoteMentions.length === 0) {
    console.log("No remote mentions to process");
    return noteObject;
  }

  console.log(`Resolving ${remoteMentions.length} remote mentions...`);
  
  const lookupPromises = remoteMentions.map(async (mention) => {
    if (!mention.instance) return null;
    
    const actorUrl = await lookupRemoteActor(mention.username, mention.instance);
    
    if (actorUrl) {
      return {
        mention,
        actorUrl,
      };
    }
    return null;
  });
  
  const results = await Promise.all(lookupPromises);
  
  let resolvedCount = 0;
  for (const result of results) {
    if (!result) continue;
    
    const { mention, actorUrl } = result;
    resolvedCount++;
    
    // Add Mention tag
    tags.push({
      type: "Mention",
      href: actorUrl,
      name: `@${mention.full}`,
    });
    
    // Add to cc for direct delivery (avoid duplicates)
    if (!ccAddresses.includes(actorUrl)) {
      ccAddresses.push(actorUrl);
    }
    
    console.log(`Added federated mention: @${mention.full} -> ${actorUrl}`);
  }

  console.log(`Resolved ${resolvedCount}/${remoteMentions.length} remote mentions`);
  
  // Merge tags with existing tags
  const existingTags = (noteObject.tag as unknown[]) || [];
  
  return {
    ...noteObject,
    tag: [...existingTags, ...tags],
    cc: ccAddresses,
  };
}
