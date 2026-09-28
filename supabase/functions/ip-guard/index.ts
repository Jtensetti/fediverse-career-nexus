import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { createIpGuardHandler } from "./handler.ts";

// Called only by the Cloudflare gateway with GATEWAY_GUARD_SECRET.
Deno.serve(createIpGuardHandler({
  secret: () => Deno.env.get("GATEWAY_GUARD_SECRET"),
  db: () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
}));
