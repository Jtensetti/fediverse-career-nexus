/** Read-only deployment check. Run with a real, enabled test handle after deployment. */
import assert from 'node:assert/strict';
const handle = process.argv[2]?.replace(/^@/, '');
if (!handle || !/^[a-z0-9_]{3,30}@[^/@\s]+$/.test(handle)) throw new Error('Usage: node scripts/check-federation.mjs username@nolto.social');
const [username, domain] = handle.split('@');
const base = `https://${domain}`;
async function get(url, type) {
  const response = await fetch(url, { redirect: 'manual', headers: { Accept: type }, signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, `${url}: expected 200, got ${response.status}; location=${response.headers.get('location')}`);
  assert.ok(response.headers.get('content-type')?.includes(type), `${url}: incorrect content-type; a SPA fallback may be swallowing federation`);
  return response.json();
}
const wf = await get(`${base}/.well-known/webfinger?resource=${encodeURIComponent(`acct:${handle}`)}`, 'application/jrd+json');
assert.equal(wf.subject, `acct:${handle}`);
const self = wf.links.find(link => link.rel === 'self' && link.type === 'application/activity+json');
assert.equal(self?.href, `${base}/functions/v1/actor/${username}`);
const actor = await get(self.href, 'application/activity+json');
assert.equal(actor.id, self.href); assert.equal(actor.publicKey.owner, actor.id); assert.equal(actor.publicKey.id, `${actor.id}#main-key`);
assert.ok(actor.publicKey.publicKeyPem.startsWith('-----BEGIN PUBLIC KEY-----'));
for (const key of ['inbox', 'outbox', 'followers', 'following']) assert.equal(new URL(actor[key]).origin, base);
await get(actor.outbox, 'application/activity+json');
await get(actor.followers, 'application/activity+json');
await get(actor.following, 'application/activity+json');
console.log(`PASS: ${handle} resolves without redirects; canonical actor, key ownership and public collections agree. Test signed follows and posts separately.`);
