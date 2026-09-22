import { buildActorUrl, buildFollowersUrl, getFederationBaseUrl } from "./federation-urls.ts";
import { escapeHtml } from "./actor-document.ts";
export const PUBLIC = "https://www.w3.org/ns/activitystreams#Public";
export const CONTEXT = "https://www.w3.org/ns/activitystreams";
export function unwrap(content: any): any {
  return content?.type === "Create" && typeof content.object === "object" ? content.object : content;
}
export function isPublic(content: any): boolean {
  const object = unwrap(content);
  return [object?.to, object?.cc].flat().includes(PUBLIC);
}
export function localObject(row: any, username: string) {
  const original = unwrap(row.content) || {};
  const id = `${getFederationBaseUrl()}/functions/v1/objects/${row.id}`;
  const object: Record<string, unknown> = {
    ...original, id, attributedTo: buildActorUrl(username),
    published: row.published_at || row.created_at,
    to: [PUBLIC], cc: [buildFollowersUrl(username), ...[original.cc].flat().filter((x: unknown) => typeof x === "string" && !x.startsWith(getFederationBaseUrl()) && x !== PUBLIC)],
    url: `${getFederationBaseUrl()}/post/${row.id}`,
  };
  delete object.actor;
  delete object.bto;
  delete object.bcc;
  // Nolto's note composer stores plain text. Escape before publishing ActivityStreams HTML.
  if (original.type === "Note" && typeof original.content === "string") object.content = `<p>${escapeHtml(original.content).replace(/\n/g, "<br>")}</p>`;
  return object;
}
export function localCreate(row: any, username: string) {
  const object = localObject(row, username);
  return { "@context": CONTEXT, id: `${getFederationBaseUrl()}/functions/v1/activities/${row.id}`,
    type: "Create", actor: buildActorUrl(username), published: object.published,
    to: object.to, cc: object.cc, object };
}
