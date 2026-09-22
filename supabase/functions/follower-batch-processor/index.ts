import { jsonResponse } from "../_shared/local-actor.ts";

Deno.serve(() => jsonResponse({ error: "The legacy batch processor is retired. Schedule the service-only federation worker." }, 410));
