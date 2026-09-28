import { createClient } from "npm:@supabase/supabase-js@2.117.2";

export const serviceClient = (timeoutMs?: number) => createClient(
  Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false },
    ...(timeoutMs ? { global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, {
      ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
    }) } } : {}),
  },
);

export const federationHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "accept, content-type, signature, digest, date, authorization, apikey, x-client-info",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function jsonResponse(data: unknown, status = 200, type = "application/json", head = false) {
  return new Response(head ? null : JSON.stringify(data), {
    status, headers: { ...federationHeaders, "Content-Type": type },
  });
}

export async function loadLocalActor(username: string) {
  const db = serviceClient();
  const { data: profile, error } = await db.from("public_profiles")
    .select("id, username, fullname, bio, avatar_url, header_url")
    .eq("username", username).maybeSingle();
  if (error) throw error;
  if (!profile) return { status: 404, error: "Account not found" } as const;
  const { data: actor, error: actorError } = await db.from("actors")
    .select("id, public_key, status, is_remote, created_at, also_known_as, moved_to, manually_approves_followers")
    .eq("user_id", profile.id).eq("is_remote", false).maybeSingle();
  if (actorError) throw actorError;
  if (!actor) return { status: 404, error: "Federation has not been enabled for this account" } as const;
  if (actor.status !== "active") return { status: 410, error: "Federation is unavailable for this account" } as const;
  if (!actor.public_key?.startsWith("-----BEGIN PUBLIC KEY-----")) {
    return { status: 503, error: "Federation identity is not ready" } as const;
  }
  return { profile, actor };
}
