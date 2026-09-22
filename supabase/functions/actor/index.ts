import { ACTIVITY_CONTENT_TYPE, createActorDocument, USERNAME_PATTERN } from "../_shared/actor-document.ts";
import { functionPath } from "../_shared/federation-urls.ts";
import { federationHeaders, jsonResponse, loadLocalActor } from "../_shared/local-actor.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: federationHeaders });
  if (!["GET", "HEAD"].includes(req.method)) return jsonResponse({ error: "Method not allowed" }, 405);
  const head = req.method === "HEAD";
  const path = functionPath(new URL(req.url), "actor");
  const username = path?.length === 1 ? path[0].toLowerCase() : "";
  if (!USERNAME_PATTERN.test(username)) return jsonResponse({ error: "Account not found" }, 404, undefined, head);
  try {
    const result = await loadLocalActor(username);
    if ("error" in result) return jsonResponse({ error: result.error }, result.status, undefined, head);
    return jsonResponse(createActorDocument(result.profile, result.actor), 200, ACTIVITY_CONTENT_TYPE, head);
  } catch (error) {
    console.error("Actor lookup failed", error);
    return jsonResponse({ error: "Account lookup is temporarily unavailable" }, 503, undefined, head);
  }
}
if (import.meta.main) Deno.serve(handler);
