import { buildOutboxUrl, functionPath } from "../_shared/federation-urls.ts";
import { serviceClient, loadLocalActor, jsonResponse, federationHeaders } from "../_shared/local-actor.ts";
import { localCreate, CONTEXT } from "../_shared/local-content.ts";
import { resolveReplyAddress } from '../_shared/federated-interactions.ts';
export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: federationHeaders });
  if (!["GET", "HEAD"].includes(req.method)) return jsonResponse({ error: "This outbox supports server federation discovery. Publish using Nolto." }, 405);
  try {
    const url = new URL(req.url);
    const [username, extra] = functionPath(url, "outbox") || [];
    if (!username || extra) return jsonResponse({ error: "Not found" }, 404);
    const db = serviceClient();
    const loaded = await loadLocalActor(username);
    if ("error" in loaded) return jsonResponse({ error: loaded.error }, loaded.status);
    const pageValue = url.searchParams.get("page");
    const page = pageValue === null ? 0 : Number(pageValue);
    if (!Number.isSafeInteger(page) || page < 0 || (pageValue !== null && page < 1) || page > 10000) return jsonResponse({ error: "Invalid page" }, 400);
    const base = buildOutboxUrl(username);
    const query = db.from("federation_public_objects").select("*", { count: "exact" }).eq("attributed_to", loaded.actor.id);
    const { data, count, error } = await query.order("published_at", { ascending: false }).order("id").range(page ? (page - 1) * 20 : 0, page ? page * 20 - 1 : 0);
    if (error) throw error;
    const body = page ? {
      "@context": CONTEXT, id: `${base}?page=${page}`, type: "OrderedCollectionPage", partOf: base,
      orderedItems: await Promise.all((data || []).map(async row => localCreate(await resolveReplyAddress(db, row), username))),
      ...(page > 1 ? { prev: `${base}?page=${page - 1}` } : {}),
      ...(page * 20 < (count || 0) ? { next: `${base}?page=${page + 1}` } : {}),
    } : { "@context": CONTEXT, id: base, type: "OrderedCollection", totalItems: count, first: `${base}?page=1` };
    return new Response(req.method === "HEAD" ? null : JSON.stringify(body), { headers: { ...federationHeaders, "Content-Type": "application/activity+json" } });
  } catch (error) {
    console.error("Outbox lookup failed", error);
    return jsonResponse({ error: "Outbox temporarily unavailable" }, 503);
  }
}
if (import.meta.main) Deno.serve(handler);
