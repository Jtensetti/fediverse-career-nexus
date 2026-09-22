// Temporary one-off provisioning endpoint. Moves the runtime's existing credentials into
// database Vault so scheduled jobs never embed them in SQL. Never returns secret values.
import { createClient } from "npm:@supabase/supabase-js@2.89.0";

Deno.serve(async (req) => {
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceRole || req.headers.get("authorization") !== `Bearer ${serviceRole}`) {
    return new Response(JSON.stringify({ error: "Worker credentials required" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }
  const backendUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const retention = Deno.env.get("RETENTION_ENCRYPTION_KEY") ?? "";
  const token = Deno.env.get("TOKEN_ENCRYPTION_KEY") ?? "";

  const db = createClient(backendUrl, serviceRole, { auth: { persistSession: false } });
  const stored: string[] = [];
  const errors: string[] = [];
  for (const [name, value] of [
    ["nolto_scheduler_service_role", serviceRole],
    ["nolto_backend_url", backendUrl],
  ] as const) {
    if (!value) { errors.push(`${name}: runtime value unavailable`); continue; }
    const { error } = await db.rpc("__provision_vault_secret", { p_name: name, p_value: value });
    if (error) errors.push(`${name}: ${error.message}`); else stored.push(name);
  }

  return new Response(JSON.stringify({
    stored,
    errors,
    validation: {
      RETENTION_ENCRYPTION_KEY: { present: retention.length > 0, meets_minimum_length: retention.length >= 32 },
      TOKEN_ENCRYPTION_KEY: { present: token.length > 0, meets_minimum_length: token.length >= 32 },
    },
  }), { status: errors.length ? 500 : 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
});
