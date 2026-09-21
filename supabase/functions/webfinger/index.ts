import { createWebFingerDocument, parseLocalResource } from "../_shared/actor-document.ts";
import { federationHeaders, jsonResponse, loadLocalActor } from "../_shared/local-actor.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: federationHeaders });
  if (!["GET", "HEAD"].includes(req.method)) return jsonResponse({ error: "Method not allowed" }, 405);
  const head = req.method === "HEAD";
  const url = new URL(req.url);
  const resource = url.searchParams.get("resource");
  if (!resource) return jsonResponse({ error: "The resource parameter is required" }, 400, undefined, head);
  try {
    const username = parseLocalResource(resource);
    if (!username) return jsonResponse({ error: "Account not found" }, 404, undefined, head);
    const result = await loadLocalActor(username);
    if ("error" in result) return jsonResponse({ error: result.error }, result.status, undefined, head);
    return jsonResponse(createWebFingerDocument(result.profile.username, url.searchParams.getAll("rel")), 200, "application/jrd+json", head);
  } catch (error) {
    console.error("WebFinger lookup failed", error);
    return jsonResponse({ error: "Account lookup is temporarily unavailable" }, 503, undefined, head);
  }
}
if (import.meta.main) Deno.serve(handler);
