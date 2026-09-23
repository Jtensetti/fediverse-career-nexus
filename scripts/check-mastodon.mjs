/** Read-only canonical-domain check. Does not register apps or request credentials. */
import assert from 'node:assert/strict';
const origin = new URL(process.argv[2] || 'https://nolto.social');
const site = new URL(process.argv[3] || origin.origin);
for (const url of [origin, site]) {
  assert.equal(url.protocol,'https:');
  assert.equal(url.pathname,'/');
  assert.ok(!url.username && !url.password && !url.port && !url.search && !url.hash);
}
async function get(path,type='application/json') {
  const result=await fetch(new URL(path,origin),{redirect:'manual',headers:{accept:type},signal:AbortSignal.timeout(10000)});
  assert.equal(result.status,200,path+': got '+result.status+'; API may be disabled or not deployed');
  assert.ok(result.headers.get('content-type')?.includes(type),path+': wrong content type; check the proxy');
  return type==='application/json' ? result.json() : result.text();
}
const metadata=await get('/.well-known/oauth-authorization-server');
assert.equal(metadata.issuer,origin.origin);
assert.equal(metadata.authorization_endpoint,site.origin+'/oauth/authorize');
assert.equal(metadata.token_endpoint,origin.origin+'/oauth/token');
assert.ok(metadata.code_challenge_methods_supported.includes('S256'));
const instance=await get('/api/v2/instance');
assert.equal(instance.domain,origin.hostname);
assert.ok(instance.nolto?.capabilities.includes('text_statuses'));
assert.ok((await get(site.origin+'/oauth/authorize','text/html')).includes('id="root"'));
const denied=await fetch(new URL('/api/v1/accounts/verify_credentials',origin),{redirect:'manual',signal:AbortSignal.timeout(10000)});
assert.equal(denied.status,401,'verify_credentials requires an opaque user token');
console.log('PASS: canonical discovery, API route, browser consent route and unauthenticated rejection. Real native-client and federation tests remain separate.');
