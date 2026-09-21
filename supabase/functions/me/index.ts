import { postHandler, requireUser } from "../_shared/user-auth.ts";
import { jsonResponse } from "../_shared/local-actor.ts";
Deno.serve(postHandler(async req => {
  const { user, client } = await requireUser(req);
  const { data: profile, error } = await client.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return jsonResponse({ id: user.id, email: user.email, profile });
}));
