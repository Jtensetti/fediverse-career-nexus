/** Resend's HTTPS API, without a second SDK/runtime dependency. */
export async function sendEmail(apiKey: string, message: { from: string; to: string | string[]; subject: string; text?: string; html: string; reply_to?: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(message), signal: AbortSignal.timeout(10000), redirect: "error",
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}
