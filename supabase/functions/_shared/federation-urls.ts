/**
 * Centralized federation URL builders.
 * 
 * CRITICAL: All ActivityPub identifiers (actor IDs, activity IDs, object IDs, keyIds)
 * MUST be built with these helpers. Never use SUPABASE_URL directly in federation
 * payloads — remote servers cache keys by URL and a domain mismatch breaks signature
 * verification across the Fediverse.
 */

const FALLBACK_DOMAIN = "nolto.social";

/** The canonical federation base URL, e.g. "https://nolto.social" */
export function getFederationBaseUrl(): string {
  // UI deployments may move; published ActivityPub identities must not.
  const raw = Deno.env.get("FEDERATION_DOMAIN") || FALLBACK_DOMAIN;
  const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("FEDERATION_DOMAIN must be an HTTPS origin without a path or port");
  }
  return `https://${normalizeDomain(url.hostname)}`;
}

/** The canonical federation hostname, e.g. "nolto.social" (no www, no protocol). */
export function getFederationDomain(): string {
  return getFederationBaseUrl().replace(/^https?:\/\//, "");
}

/** Strip "www." prefix if present so "www.nolto.social" matches "nolto.social". */
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
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password &&
      !parsed.port && isLocalDomain(parsed.hostname);
  } catch {
    return false;
  }
}

/** Build a canonical actor URL: https://nolto.social/functions/v1/actor/<username> */
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

/** OAuth and email links use the UI origin, independently of federation. */
export function getSiteUrl(): string {
  const raw = (Deno.env.get("SITE_URL") || getFederationBaseUrl()).trim();
  const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SITE_URL must be an HTTPS origin");
  }
  return url.origin;
}

/** Supabase includes the function name in Request.url, including behind a proxy. */
export function functionPath(url: URL, name: string): string[] | null {
  const parts = url.pathname.split("/").filter(Boolean);
  const index = parts.indexOf(name);
  if (index < 0) return null;
  try { return parts.slice(index + 1).map(decodeURIComponent); } catch { return null; }
}
