import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { federationHeaders, jsonResponse } from "./local-actor.ts";
import { readBody } from "./remote-fetch.ts";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function uuid(value: unknown, field = "id"): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, `Invalid ${field}`);
  }
  return value;
}

export async function requireUser(req: Request, options: { allowMfaRecovery?: boolean } = {}) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new HttpError(401, "Authentication required");
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // getUser verifies the token with Auth. The RPC also rejects signed but revoked sessions.
  const { data: { user }, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !user) throw new HttpError(401, "Invalid session");
  const { data: active, error: sessionError } = await client.rpc("current_session_is_active");
  if (sessionError) throw new HttpError(503, "Session verification unavailable");
  if (active !== true) throw new HttpError(401, "Session is no longer active");
  if (!options.allowMfaRecovery) {
    const { data: verified, error: assuranceError } = await client.rpc("current_session_is_verified");
    if (assuranceError) throw new HttpError(503, "Session verification unavailable");
    if (verified !== true) throw new HttpError(403, "MFA verification required");
  }
  return { user, client, token: authorization.slice(7) };
}

export function postHandler(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { headers: federationHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
    try { return await handler(req); }
    catch (error) {
      if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status);
      console.error("Request failed", error instanceof Error ? error.name : "Unknown error");
      return jsonResponse({ error: "The request could not be completed" }, 500);
    }
  };
}

export async function requestBody(req: Request, maxBytes = 32768): Promise<Record<string, unknown>> {
  try {
    const body = JSON.parse(await readBody(req, maxBytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
    return body;
  } catch { throw new HttpError(400, "Invalid or oversized JSON request"); }
}

export function requireWorker(req: Request) {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) throw new HttpError(401, "Worker credentials required");
}

export async function requireAdmin(req: Request, allowWorker = false) {
  if (allowWorker) {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return;
  }
  const { user, client } = await requireUser(req);
  const { data, error } = await client.rpc("is_admin", { _user_id: user.id });
  if (error) throw error;
  if (data !== true) throw new HttpError(403, "Administrator access required");
}

export const adminHandler = (handler: (req: Request) => Promise<Response>) => postHandler(async req => {
  await requireAdmin(req, true);
  return handler(req);
});
export const workerHandler = (handler: (req: Request) => Promise<Response>) => postHandler(async req => {
  requireWorker(req);
  return handler(req);
});

export const userHandler = (handler: (req: Request) => Promise<Response>) => postHandler(async req => {
  await requireUser(req);
  return handler(req);
});
