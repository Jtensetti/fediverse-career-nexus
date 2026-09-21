import { federationHeaders, jsonResponse } from "../_shared/local-actor.ts";
import { remoteFetch, remoteUrl } from "../_shared/remote-fetch.ts";

const MAX_BYTES = 5 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: federationHeaders });
  if (req.method !== "GET" && req.method !== "HEAD") return jsonResponse({ error: "Method not allowed" }, 405);
  try {
    const input = new URL(req.url).searchParams.get("url");
    if (!input || input.length > 2048) return jsonResponse({ error: "Invalid URL" }, 400);
    const url = remoteUrl(input);
    const response = await remoteFetch(url.href, { headers: { Accept: [...imageTypes].join(",") } });
    const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (!response.ok || !type || !imageTypes.has(type)) {
      await response.body?.cancel();
      return jsonResponse({ error: "Image unavailable" }, 422);
    }
    if (Number(response.headers.get("content-length")) > MAX_BYTES) {
      await response.body?.cancel();
      return jsonResponse({ error: "Image too large" }, 413);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No image body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) return jsonResponse({ error: "Image too large" }, 413);
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(req.method === "HEAD" ? null : bytes, { headers: {
      ...federationHeaders, "Content-Type": type, "Cache-Control": "public, max-age=3600",
      "Content-Security-Policy": "default-src 'none'; sandbox", "Referrer-Policy": "no-referrer",
    } });
  } catch { return jsonResponse({ error: "Image unavailable" }, 422); }
});
