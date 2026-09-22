import { serviceClient, jsonResponse } from "../_shared/local-actor.ts";
import { HttpError, postHandler, requestBody, requireUser } from "../_shared/user-auth.ts";

Deno.serve(postHandler(async req => {
  const { user, token: accessToken } = await requireUser(req, { allowMfaRecovery: true });
  const { token } = await requestBody(req, 2048);
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(400, "Invalid recovery token");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, "0")).join("");
  const admin = serviceClient();
  // Claim once before modifying factors. A replay or a simultaneous request cannot pass.
  const { data: claimed, error } = await admin.from("mfa_recovery_tokens")
    .update({ used_at: new Date().toISOString() }).eq("token_hash", tokenHash)
    .eq("user_id", user.id).is("used_at", null).gt("expires_at", new Date().toISOString())
    .select("id,request_id,created_by_admin_id").maybeSingle();
  if (error) throw error;
  if (!claimed) throw new HttpError(410, "Recovery token is invalid, expired or already used");
  // If a downstream operation fails the token remains consumed; an admin must issue a new one.
  const { data, error: factorsError } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  if (factorsError) throw factorsError;
  for (const factor of data.factors) {
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id });
    if (deleteError) throw deleteError;
  }
  const { error: signOutError } = await admin.auth.admin.signOut(accessToken, "others");
  if (signOutError) throw signOutError;
  if (claimed.request_id) {
    const { error: resolveError } = await admin.from("mfa_recovery_requests")
      .update({ status: "resolved", handled_at: new Date().toISOString() }).eq("id", claimed.request_id);
    if (resolveError) throw resolveError;
  }
  const { error: auditError } = await admin.from("moderation_actions").insert({
    type: "mfa_factors_reset", target_user_id: user.id, moderator_id: claimed.created_by_admin_id,
    reason: "Account holder used an administrator-issued single-use recovery token",
  });
  if (auditError) throw auditError;
  return jsonResponse({ success: true });
}));
