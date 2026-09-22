import { serviceClient, jsonResponse } from "../_shared/local-actor.ts";
import { postHandler, requestBody, requireUser, HttpError } from "../_shared/user-auth.ts";
import { encryptedDeletionSnapshot } from "../_shared/deletion.ts";

Deno.serve(postHandler(async req => {
  const { user, client, token } = await requireUser(req);
  const { confirmation } = await requestBody(req, 1024);
  if (confirmation !== "RADERA") throw new HttpError(400, "Explicit account deletion confirmation required");
  // Claims are read only after requireUser verifies the signature and live session.
  const claims = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  const recent = Array.isArray(claims.amr) && claims.amr.some((entry: { method?: string; timestamp?: number }) =>
    ["password", "oauth", "otp", "totp", "webauthn"].includes(entry.method || "") &&
    typeof entry.timestamp === "number" && entry.timestamp > Date.now() / 1000 - 900 && entry.timestamp <= Date.now() / 1000 + 30);
  if (!recent) throw new HttpError(403, "recent_login_required");
  const { error: preflight } = await client.rpc("check_account_deletion");
  if (preflight) throw new HttpError(409, "Överlåt organisationer och deras filer innan du begär kontoradering.");
  const db = serviceClient(10000);
  const { data: profile, error: readError } = await client.from("profiles").select("*").eq("id", user.id).single();
  if (readError) throw readError;
  const encrypted = await encryptedDeletionSnapshot("account", user.id, profile);
  const { data: result, error } = await db.rpc("schedule_account_deletion", {
    p_user_id: user.id, p_updated_at: profile.updated_at, p_encrypted_payload: encrypted,
  });
  if (error?.code === "40001") throw new HttpError(409, "Profilen ändrades. Försök igen.");
  if (error) throw error;
  // The database already rejects all sessions. Auth's ban is an additional boundary.
  const { error: banError } = await db.auth.admin.updateUserById(user.id, { ban_duration: "876000h" });
  if (banError) console.error("Account deletion accepted; Auth ban needs retry");
  else {
    const { error: marked } = await db.from("deletion_requests").update({ auth_banned: true }).eq("id", result.id);
    if (marked) console.error("Account ban state needs retry");
  }
  return jsonResponse({ success: true, requested_at: result.requested_at, purge_after: result.purge_after }, 202);
}));
