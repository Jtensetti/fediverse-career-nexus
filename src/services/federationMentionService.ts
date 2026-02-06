/**
 * Federation Mention Service
 * Handles WebFinger lookups and ActivityPub mention tagging for remote users
 */

import { extractMentionsWithInstances, type ParsedMention } from "@/lib/linkify";

export interface ActivityPubMentionTag {
  type: "Mention";
  href: string;
  name: string;
}

/**
 * Performs a WebFinger lookup to resolve a remote user's ActivityPub actor URL
 */
export async function lookupRemoteActor(
  username: string,
  domain: string
): Promise<string | null> {
  try {
    const resource = `acct:${username}@${domain}`;
    const webfingerUrl = `https://${domain}/.well-known/webfinger?resource=${encodeURIComponent(resource)}`;
    
    console.log(`WebFinger lookup: ${webfingerUrl}`);
    
    const response = await fetch(webfingerUrl, {
      headers: {
        Accept: "application/jrd+json, application/json",
      },
    });
    
    if (!response.ok) {
      console.warn(`WebFinger lookup failed for ${username}@${domain}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Find the ActivityPub actor link
    const actorLink = data.links?.find(
      (link: any) =>
        link.rel === "self" &&
        (link.type === "application/activity+json" ||
          link.type === 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"')
    );
    
    if (actorLink?.href) {
      console.log(`Resolved ${username}@${domain} to ${actorLink.href}`);
      return actorLink.href;
    }
    
    console.warn(`No ActivityPub actor found for ${username}@${domain}`);
    return null;
  } catch (error) {
    console.error(`Error looking up remote actor ${username}@${domain}:`, error);
    return null;
  }
}

/**
 * Process federated mentions in post content
 * - Resolves remote users via WebFinger
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
  
  for (const result of results) {
    if (!result) continue;
    
    const { mention, actorUrl } = result;
    
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
  
  // Merge tags with existing tags
  const existingTags = (noteObject.tag as any[]) || [];
  
  return {
    ...noteObject,
    tag: [...existingTags, ...tags],
    cc: ccAddresses,
  };
}

/**
 * Get the inbox URL for a remote actor
 * Fetches the actor document and extracts the inbox endpoint
 */
export async function getRemoteActorInbox(actorUrl: string): Promise<string | null> {
  try {
    const response = await fetch(actorUrl, {
      headers: {
        Accept: 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
      },
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch actor document: ${actorUrl}`);
      return null;
    }
    
    const actor = await response.json();
    return actor.inbox || null;
  } catch (error) {
    console.error(`Error fetching remote actor inbox:`, error);
    return null;
  }
}
