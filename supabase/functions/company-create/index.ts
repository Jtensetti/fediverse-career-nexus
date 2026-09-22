import { jsonResponse } from "../_shared/local-actor.ts";
import { HttpError, postHandler, requestBody, requireUser } from "../_shared/user-auth.ts";

Deno.serve(postHandler(async req => {
  const { client } = await requireUser(req);
  const payload = await requestBody(req, 20000);
  const { data: company, error } = await client.rpc("create_owned_company", { payload }).single();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "A company with this URL already exists");
    if (["22023", "22P02", "23514"].includes(error.code)) throw new HttpError(400, "Check the company name, URL and other fields");
    throw error;
  }
  return jsonResponse({ company }, 201);
}));
