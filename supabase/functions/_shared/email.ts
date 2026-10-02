/** Resend's HTTPS API, without a second SDK/runtime dependency. */
export async function sendEmail(apiKey: string, message: { from: string; to: string | string[]; subject: string; text?: string; html: string; reply_to?: string }, options: { idempotencyKey?: string } = {}) {
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers,
    body: JSON.stringify(message), signal: AbortSignal.timeout(10000), redirect: "error",
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}
