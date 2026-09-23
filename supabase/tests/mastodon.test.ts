import { strict as assert } from 'node:assert';
import { accountEntity } from '../functions/_shared/mastodon-entities.ts';
import { browserOrigin, decimalId, hasScope, parameters, redirectUri, safeHtml, safeUrl, scopes } from '../functions/_shared/mastodon.ts';
import { pkceChallenge, randomToken, tokenHash } from '../functions/_shared/oauth.ts';

Deno.test('native OAuth redirects accept app callbacks and reject executable or ambiguous destinations', () => {
  for (const value of ['tusky://oauth','org.joinmastodon.app://oauth','https://app.example/callback?source=nolto','http://127.0.0.1:9876/callback']) assert.equal(redirectUri(value),value);
  for (const value of ['javascript:alert(1)','data:text/html,evil','intent://evil','file:///tmp/key','blob:https://app.example/abc','//app.example/callback','http://remote.example/callback','https://user:pass@app.example/callback','https://app.example/#code','https://app.example/?state=forged','https://app.example/?code=forged','https://app.example/\ncallback']) assert.throws(()=>redirectUri(value));
});
Deno.test('scopes separate read, write and follow capabilities and reject unsupported names', () => {
  assert.deepEqual(scopes('read write read'),['read','write']);
  assert.ok(hasScope(['read'],'read:statuses'));
  assert.ok(hasScope(['follow'],'write:follows'));
  assert.ok(!hasScope(['read:accounts'],'read:statuses'));
  assert.ok(!hasScope(['read'],'write:statuses'));
  for (const value of ['admin','read:secrets',[],null,'']) assert.throws(()=>scopes(value));
});
Deno.test('Mastodon IDs remain exact int64 strings and cannot inject queries', () => {
  for (const value of ['1','9007199254740993','9223372036854775807']) assert.equal(decimalId(value),value);
  for (const value of ['0','-1','01','1.0','9223372036854775808','1),user_id.neq.null',1,null]) assert.throws(()=>decimalId(value));
});
Deno.test('request parsing handles repeated arrays and rejects duplicate credentials and oversized bodies', async () => {
  const form = (body: string) => new Request('https://nolto.social/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  assert.deepEqual((await parameters(form('media_ids%5B%5D=1&media_ids%5B%5D=2'))).media_ids,['1','2']);
  await assert.rejects(()=>parameters(form('client_id=first&client_id=second')));
  await assert.rejects(()=>parameters(form('status='+'å'.repeat(20000))));
  const special=await parameters(form('__proto__=own-property'));
  assert.equal(Object.getPrototypeOf(special),null);
  for (const body of ['[]','null','{"invalid"']) await assert.rejects(()=>parameters(new Request('https://nolto.social',{method:'POST',headers:{'content-type':'application/json'},body})));
});
Deno.test('consent is origin-bound and remote HTML cannot become active markup in a native client', () => {
  Deno.env.set('SITE_URL','https://nolto.social');
  browserOrigin(new Request('https://backend.example/consent',{headers:{origin:'https://nolto.social'}}));
  for (const origin of ['https://evil.example','null','https://nolto.social.evil.example']) assert.throws(()=>browserOrigin(new Request('https://backend.example/consent',{headers:{origin}})));
  assert.throws(()=>browserOrigin(new Request('https://backend.example/consent')));
  assert.equal(safeUrl('javascript:alert(1)'),null);
  assert.equal(safeUrl('https://127.0.0.1/private'),null);
  assert.equal(safeUrl('https://intranet.local/private'),null);
  assert.equal(safeUrl('https://user:pass@app.example'),null);
  assert.equal(safeHtml('<img src=x onerror=alert(1)>hello<script>alert(1)</script>',true),'helloalert(1)');
  assert.equal(safeHtml('<hello>\n&'), '&lt;hello&gt;<br>&amp;');
});
Deno.test('public account entities omit credentials, email and private profile fields', () => {
  Deno.env.set('FEDERATION_DOMAIN','nolto.social');
  const row={id:'42',actor_id:'actor',user_id:'user',preferred_username:'alice',is_remote:false,remote_actor_url:null,created_at:'2026-09-22T00:00:00Z',follower_count:2,following_count:3,fullname:'Alice',bio:'<script>secret()</script>',avatar_url:null,header_url:null,private_key:'must-not-leak',email:'private@example.com'};
  const output=accountEntity(row,7,true);
  assert.equal(output.id,'42'); assert.equal(output.acct,'alice'); assert.equal(output.statuses_count,7);
  assert.ok(!JSON.stringify(output).includes('must-not-leak'));
  assert.ok(!JSON.stringify(output).includes('private@example.com'));
  assert.ok(!output.note.includes('<script>'));
});
Deno.test('PKCE uses the RFC 7636 S256 vector and access tokens are random opaque values', async () => {
  assert.equal(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  const one=randomToken(),two=randomToken();
  assert.match(one,/^[0-9a-f]{64}$/); assert.notEqual(one,two);
  assert.match(await tokenHash(one),/^[0-9a-f]{64}$/); assert.notEqual(await tokenHash(one),one);
});
