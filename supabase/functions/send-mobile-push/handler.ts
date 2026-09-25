import { serviceClient, jsonResponse } from '../_shared/local-actor.ts';
import { workerHandler } from '../_shared/user-auth.ts';
import { decryptValue, encryptionSecret } from '../_shared/encryption.ts';
import { PUSH_SEND_URL, PUSH_RECEIPTS_URL, validExpoToken, pushMessage, providerOutcome, retryDelay, retryableStatus } from '../_shared/mobile-push.ts';

type Job = { id: string; device_id: string; notification_id: string; lease_id: string; ticket_id: string | null; attempts: number; receipt_attempts: number };
type Ticket = { status?: string; id?: string; details?: { error?: string } };
export const handler = workerHandler(async () => {
  // An explicit operational switch keeps a code deployment from sending pushes.
  if (Deno.env.get('MOBILE_PUSH_ENABLED') !== 'true') return jsonResponse({ enabled: false });
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (!accessToken) return jsonResponse({ error: 'Push provider is not configured' }, 503);
  const secret = encryptionSecret();
  const db = serviceClient(5000);
  const started = Date.now();
  const stats = { accepted: 0, delivered: 0, retried: 0, cancelled: 0, failed: 0 };
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
  async function finish(job: Job, patch: Record<string, unknown>) {
    const { error } = await db.from('mobile_push_deliveries').update({ ...patch, lease_id: null, lease_until: null }).eq('id', job.id).eq('lease_id', job.lease_id);
    if (error) throw error;
  }
  async function retry(job: Job, receipt: boolean, reason: string) {
    const attempts = receipt ? job.receipt_attempts : job.attempts;
    const exhausted = attempts >= (receipt ? 8 : 5);
    await finish(job, { state: exhausted ? 'failed' : receipt ? 'receipt' : 'pending', last_error: reason,
      next_attempt_at: new Date(Date.now() + Math.max(receipt ? 900 : 0, retryDelay(attempts)) * 1000).toISOString() });
    stats[exhausted ? 'failed' : 'retried']++;
  }
  for (const receipts of [true, false]) {
    if (Date.now() - started > 35000) break;
    const { data, error } = await db.rpc('claim_mobile_push', { p_receipts: receipts, p_limit: 10 });
    if (error) throw error;
    for (const job of (data ?? []) as Job[]) {
      if (Date.now() - started > 35000) break; // abandoned leases are reclaimed
      try {
        const { data: device, error: deviceError } = await db.from('mobile_push_devices').select('token_ciphertext,token_hash').eq('id', job.device_id).maybeSingle();
        if (deviceError) throw deviceError;
        if (!device) { stats.cancelled++; continue; }
        // Check again immediately before contacting the provider. Read/deleted,
        // blocked, banned and logged-out recipients no longer receive alerts.
        if (!receipts) {
          const { data: eligible, error } = await db.rpc('mobile_push_eligible', { p_delivery_id: job.id });
          if (error) throw error;
          if (!eligible) { await finish(job, { state: 'cancelled' }); stats.cancelled++; continue; }
        }
        let payload;
        if (receipts) {
          if (!job.ticket_id) { await finish(job, { state: 'failed', last_error: 'missing_ticket' }); stats.failed++; continue; }
          payload = { ids: [job.ticket_id] };
        } else {
          const token = await decryptValue(device.token_ciphertext, secret, 'push-token');
          if (!validExpoToken(token)) { await finish(job, { state: 'failed', last_error: 'invalid_token' }); stats.failed++; continue; }
          payload = pushMessage(token, job.notification_id);
        }
        const response = await fetch(receipts ? PUSH_RECEIPTS_URL : PUSH_SEND_URL, {
          method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(5000), redirect: 'error',
        });
        if (!response.ok) {
          await response.body?.cancel();
          if (retryableStatus(response.status)) await retry(job, receipts, 'provider_unavailable');
          else { await finish(job, { state: 'failed', last_error: 'provider_rejected' }); stats.failed++; }
          continue;
        }
        const result = await response.json();
        const ticket: Ticket | undefined = receipts ? result.data?.[job.ticket_id!] : Array.isArray(result.data) ? result.data[0] : result.data;
        const outcome = providerOutcome(ticket, receipts);
        if (outcome === 'unregistered') {
          const { error } = await db.from('mobile_push_devices').delete().eq('id', job.device_id).eq('token_hash', device.token_hash);
          if (error) throw error;
          stats.cancelled++;
        } else if (outcome === 'ok') {
          await finish(job, { state: receipts ? 'delivered' : 'receipt', ticket_id: receipts ? job.ticket_id : ticket!.id,
            last_error: null, next_attempt_at: new Date(Date.now() + 900000).toISOString() });
          stats[receipts ? 'delivered' : 'accepted']++;
        } else if (outcome === 'failed') {
          await finish(job, { state: 'failed', last_error: 'provider_rejected' }); stats.failed++;
        } else await retry(job, receipts, 'provider_pending');
      } catch { await retry(job, receipts, 'delivery_unavailable'); }
    }
  }
  return jsonResponse(stats);
});
