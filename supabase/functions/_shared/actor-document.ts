import {
  buildActorUrl, buildFollowersUrl, buildFollowingUrl, buildInboxUrl,
  buildKeyId, buildOutboxUrl, buildProfilePageUrl, buildSharedInboxUrl,
  getFederationDomain, isLocalUrl,
} from "./federation-urls.ts";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
export const RESERVED_USERNAMES = new Set(["admin", "administrator", "support", "security", "nolto", "root", "system", "moderator"]);
export const ACTIVITY_CONTENT_TYPE = "application/activity+json";

export interface ActorProfile {
  id?: string;
  username: string;
  fullname?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  header_url?: string | null;
}
export interface ActorRecord {
  id?: string;
  public_key: string;
  created_at: string;
  status?: string | null;
  is_remote?: boolean | null;
  also_known_as?: string[] | null;
  moved_to?: string | null;
  manually_approves_followers?: boolean;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function image(url?: string | null) {
  if (!url || !/^https:\/\//i.test(url)) return undefined;
  return { type: "Image", url };
}

function isHttpsUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.hash; }
  catch { return false; }
}

export function createActorDocument(profile: ActorProfile, actor: ActorRecord) {
  if (!actor.public_key?.startsWith("-----BEGIN PUBLIC KEY-----")) throw new Error("Actor has no signing key");
  const username = profile.username;
  const id = buildActorUrl(username);
  return {
    "@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1", {
      toot: "http://joinmastodon.org/ns#",
      discoverable: "toot:discoverable",
      manuallyApprovesFollowers: "as:manuallyApprovesFollowers",
      alsoKnownAs: { "@id": "as:alsoKnownAs", "@type": "@id" },
      movedTo: { "@id": "as:movedTo", "@type": "@id" },
    }],
    id, type: "Person", preferredUsername: username,
    name: profile.fullname || username,
    summary: escapeHtml(profile.bio || "").replace(/\n/g, "<br>"),
    url: buildProfilePageUrl(username),
    inbox: buildInboxUrl(username), outbox: buildOutboxUrl(username),
    followers: buildFollowersUrl(username), following: buildFollowingUrl(username),
    endpoints: { sharedInbox: buildSharedInboxUrl() },
    publicKey: { id: buildKeyId(username), owner: id, publicKeyPem: actor.public_key },
    manuallyApprovesFollowers: actor.manually_approves_followers === true,
    discoverable: true, published: actor.created_at,
    icon: image(profile.avatar_url), image: image(profile.header_url),
    alsoKnownAs: (actor.also_known_as || []).filter(isHttpsUrl),
    ...(actor.moved_to && isHttpsUrl(actor.moved_to) ? { movedTo: actor.moved_to } : {}),
  };
}

/** Resolve only identities owned by this instance, never an arbitrary URL. */
export function parseLocalResource(resource: string): string | null {
  const acct = /^acct:([a-z0-9_]{3,30})@([^\s/@?#:]+)$/i.exec(resource);
  if (acct) {
    const domain = acct[2].toLowerCase().replace(/^www\./, "");
    return domain === getFederationDomain() ? acct[1].toLowerCase() : null;
  }
  if (!isLocalUrl(resource)) return null;
  const url = new URL(resource);
  if (url.search || url.hash) return null;
  const match = /^\/(?:functions\/v1\/actor\/|profile\/|@)([a-z0-9_]{3,30})\/?$/i.exec(url.pathname);
  return match?.[1].toLowerCase() ?? null;
}

export function createWebFingerDocument(username: string, rels: string[] = []) {
  const actorUrl = buildActorUrl(username);
  const profileUrl = buildProfilePageUrl(username);
  const links = [
    { rel: "http://webfinger.net/rel/profile-page", type: "text/html", href: profileUrl },
    { rel: "self", type: ACTIVITY_CONTENT_TYPE, href: actorUrl },
  ];
  return {
    subject: `acct:${username}@${getFederationDomain()}`,
    aliases: [actorUrl, profileUrl],
    links: rels.length ? links.filter(link => rels.includes(link.rel)) : links,
  };
}
