import { functionPath, getFederationBaseUrl } from "./federation-urls.ts";
import { serviceClient, jsonResponse, federationHeaders } from "./local-actor.ts";
import { localObject, localCreate, CONTEXT } from "./local-content.ts";
import { resolveReplyAddress } from './federated-interactions.ts';
export function objectEndpoint(kind: "objects" | "activities") {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { headers: federationHeaders });
    if (!["GET", "HEAD"].includes(req.method)) return jsonResponse({ error: "Method not allowed" }, 405);
    const [id, extra] = functionPath(new URL(req.url), kind) || [];
    if (extra || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "")) return jsonResponse({ error: "Not found" }, 404);
    try {
      const db = serviceClient();
      const { data: row, error } = await db.from("federation_public_objects").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!row) {
        const { data: deleted, error: deletedError } = await db.from("federation_tombstones").select("id, deleted_at").eq("id", id).maybeSingle();
        if (deletedError) throw deletedError;
        if (deleted) return jsonResponse({ "@context": CONTEXT, type: "Tombstone", id: `${getFederationBaseUrl()}/functions/v1/objects/${id}`, deleted: deleted.deleted_at }, 410);
        return jsonResponse({ error: "Not found" }, 404);
      }
      const { data: actor, error: actorError } = await db.from("actors").select("preferred_username, status, is_remote").eq("id", row.attributed_to).single();
      if (actorError) throw actorError;
      if (actor.is_remote || actor.status !== "active") return jsonResponse({ error: "Not found" }, 404);
      const resolved = await resolveReplyAddress(db, row);
      const body = kind === "objects" ? { "@context": CONTEXT, ...localObject(resolved, actor.preferred_username) } : localCreate(resolved, actor.preferred_username);
      return new Response(req.method === "HEAD" ? null : JSON.stringify(body), { headers: { ...federationHeaders, "Content-Type": "application/activity+json" } });
    } catch (error) { console.error("Object lookup failed", error); return jsonResponse({ error: "Temporarily unavailable" }, 503); }
  };
}
