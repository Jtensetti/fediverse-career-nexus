import { jsonResponse } from "../_shared/local-actor.ts";

Deno.serve(() => jsonResponse({ error: "Legacy server keys are retired. Local actors provision their own signing keys through create-user-actor." }, 410));
