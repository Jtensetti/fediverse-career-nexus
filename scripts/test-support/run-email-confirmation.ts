// Explicitly local integration acceptance, not a production probe.
// Auth, PostgREST, schema, roles, issuance RPC and token writes are REAL.
// Only outbound email delivery is replaced with an in-memory sink.
import { strict as assert } from 'node:assert';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { createSignupHandler } from '../../supabase/functions/auth-signup/handler.ts';
import { createConfirmHandler } from '../../supabase/functions/auth-confirm-email/handler.ts';
import type { sendEmail } from '../../supabase/functions/_shared/email.ts';

type Mail = Parameters<typeof sendEmail>[1];
if (Deno.env.get('NOLTO_FRESH_INSTALL_TEST') !== '1') throw new Error('Explicit disposable-stack opt-in is required');
if (Deno.args.length !== 1) throw new Error('Pass the local CLI status JSON file');
const config = JSON.parse(await Deno.readTextFile(Deno.args[0]));
const api = config.API_URL;
assert.ok(['http://127.0.0.1:54321', 'http://localhost:54321'].includes(api), 'Refusing a nonlocal backend');
assert.ok(config.ANON_KEY && config.SERVICE_ROLE_KEY, 'Missing disposable local keys');
const db = createClient(api, config.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const users: string[] = [];
const sent: Mail[] = [];
const signup = createSignupHandler({ db: () => db, apiKey: () => 'in-memory-email-sink', sendEmail: async (_key, mail) => { sent.push(mail); } });
const confirm = createConfirmHandler({ db: () => db });
const post = (body: unknown, origin = 'https://www.nolto.social') => new Request(api + '/functions/v1/auth-signup', {
  method: 'POST', headers: { 'content-type': 'application/json', origin, 'x-real-ip': '127.0.0.1' }, body: JSON.stringify(body),
});
const previousSite = Deno.env.get('SITE_URL');
const previousOrigins = Deno.env.get('EMAIL_LINK_ORIGINS');
Deno.env.set('SITE_URL', 'https://nolto.social');
Deno.env.delete('EMAIL_LINK_ORIGINS');
try {
  for (const explicitlyAllowed of [false, true]) {
    if (explicitlyAllowed) Deno.env.set('EMAIL_LINK_ORIGINS', 'https://www.nolto.social');
    const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    const email = `confirmation-${suffix}@example.invalid`;
    const username = `ci_${suffix}`;
    const password = crypto.randomUUID() + crypto.randomUUID();
    const priorMailCount = sent.length;
    const response = await signup(post({ email, password, username, firstName: 'CI', lastName: 'Fixture' }));
    assert.equal(response.status, 200, 'Real signup handler rejected the local fixture');
    const result = await response.json();
    assert.equal(result.success, true); assert.equal(result.emailSent, true);
    assert.match(result.userId, /^[0-9a-f-]{36}$/i); users.push(result.userId);
    assert.equal(sent.length, priorMailCount + 1);
    const mail = sent.at(-1)!;
    const matched = mail.text?.match(/https?:\/\/\S+/);
    assert.ok(matched, 'The real signup handler must generate an email link');
    const link = new URL(matched[0]);
    assert.equal(link.origin, explicitlyAllowed ? 'https://www.nolto.social' : 'https://nolto.social');
    assert.equal(link.pathname, '/confirm-email');
    const token = link.searchParams.get('token');
    assert.match(token!, /^[0-9a-f-]{36}$/i);
    const before = await db.auth.admin.getUserById(result.userId);
    assert.equal(before.error, null); assert.ok(!before.data.user.email_confirmed_at);
    const pending = await db.from('email_verification_tokens').select('user_id,used_at').eq('token', token!).single();
    assert.equal(pending.error, null); assert.equal(pending.data?.user_id, result.userId); assert.equal(pending.data?.used_at, null);

    const confirmed = await confirm(post({ token }));
    assert.equal(confirmed.status, 200);
    assert.deepEqual(await confirmed.json(), { success: true }, 'Confirmation must not return a session');
    const after = await db.auth.admin.getUserById(result.userId);
    assert.equal(after.error, null); assert.ok(after.data.user.email_confirmed_at);
    const consumed = await db.from('email_verification_tokens').select('used_at').eq('token', token!).single();
    assert.equal(consumed.error, null); assert.ok(consumed.data?.used_at);
    const replay = await confirm(post({ token }));
    assert.equal(replay.status, 200);
    assert.deepEqual(await replay.json(), { success: true });
    const unchanged = await db.from('email_verification_tokens').select('used_at').eq('token', token!).single();
    assert.equal(unchanged.error, null); assert.equal(unchanged.data?.used_at, consumed.data?.used_at);

    const client = createClient(api, config.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const session = await client.auth.signInWithPassword({ email, password });
    assert.equal(session.error, null, 'The confirmed user must be able to sign in using real Auth');
    assert.equal(session.data.user?.id, result.userId);
    const signout = await client.auth.signOut(); assert.equal(signout.error, null);
    console.log(`PASS: real signup → generated ${explicitlyAllowed ? 'explicitly allowed www' : 'canonical apex'} link → real token confirmation → idempotent replay → password login.`);
  }
  // Unknown-account resend keeps its generic response and sends no message.
  const count = sent.length;
  const unknown = await signup(post({ action: 'resend', email: 'not-created-in-this-fixture@example.invalid' }));
  assert.equal(unknown.status, 200); assert.deepEqual(await unknown.json(), { success: true });
  assert.equal(sent.length, count);
  console.log('PASS: unknown-account resend does not disclose existence or send an email. No email provider was contacted.');
} finally {
  for (const id of users) {
    const result = await db.auth.admin.deleteUser(id);
    if (result.error) throw new Error('Disposable confirmation fixture cleanup failed');
  }
  if (previousSite === undefined) Deno.env.delete('SITE_URL'); else Deno.env.set('SITE_URL', previousSite);
  if (previousOrigins === undefined) Deno.env.delete('EMAIL_LINK_ORIGINS'); else Deno.env.set('EMAIL_LINK_ORIGINS', previousOrigins);
}
