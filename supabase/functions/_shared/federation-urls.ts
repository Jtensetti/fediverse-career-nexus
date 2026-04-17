/**
 * Centralized federation URL builders.
 * 
 * CRITICAL: All ActivityPub identifiers (actor IDs, activity IDs, object IDs, keyIds)
 * MUST be built with these helpers. Never use SUPABASE_URL directly in federation
 * payloads — remote servers cache keys by URL and a domain mismatch breaks signature
 * verification across the Fediverse.
 */

const FALLBACK_DOMAIN = "samverkan.se";

/** The canonical federation base URL, e.g. "https://samverkan.se" */
export function getFederationBaseUrl(): string {
  const raw = Deno.env.get("SITE_URL") || Deno.env.get("FEDERATION_DOMAIN");
  if (raw) {
    const cleaned = raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${normalizeDomain(cleaned)}`;
  }
  return `https://${FALLBACK_DOMAIN}`;
}

/** The canonical federation hostname, e.g. "samverkan.se" (no www, no protocol). */
export function getFederationDomain(): string {
  return getFederationBaseUrl().replace(/^https?:\/\//, "");
}

/** Strip "www." prefix if present so "www.samverkan.se" matches "samverkan.se". */
export function normalizeDomain(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** True if the hostname matches our canonical federation domain (www-tolerant). */
export function isLocalDomain(host: string | null | undefined): boolean {
  if (!host) return false;
  return normalizeDomain(host) === getFederationDomain();
}

/** True if a full URL points to one of our local actors/activities/objects. */
export function isLocalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return isLocalDomain(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Build a canonical actor URL: https://samverkan.se/functions/v1/actor/<username> */
export function buildActorUrl(username: string): string {
  return `${getFederationBaseUrl()}/functions/v1/actor/${username}`;
}

/** Build the inbox URL for a specific local actor. */
export function buildInboxUrl(username: string): string {
  return `${getFederationBaseUrl()}/functions/v1/inbox/${username}`;
}

/** The instance-wide shared inbox. */
export function buildSharedInboxUrl(): string {
  return `${getFederationBaseUrl()}/functions/v1/inbox`;
}

export function buildOutboxUrl(username: string): string {
  return `${getFederationBaseUrl()}/functions/v1/outbox/${username}`;
}

export function buildFollowersUrl(username: string): string {
  return `${getFederationBaseUrl()}/functions/v1/followers/${username}`;
}

export function buildFollowingUrl(username: string): string {
  return `${getFederationBaseUrl()}/functions/v1/following/${username}`;
}

export function buildKeyId(username: string): string {
  return `${buildActorUrl(username)}#main-key`;
}

export function buildActivityId(): string {
  return `${getFederationBaseUrl()}/functions/v1/activities/${crypto.randomUUID()}`;
}

export function buildObjectId(): string {
  return `${getFederationBaseUrl()}/functions/v1/objects/${crypto.randomUUID()}`;
}

/** Public-facing profile page URL (HTML). */
export function buildProfilePageUrl(username: string): string {
  return `${getFederationBaseUrl()}/profile/${username}`;
}
