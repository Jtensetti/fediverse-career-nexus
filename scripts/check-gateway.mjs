/** Read-only routing preflight. No sign-in, account creation or signed delivery. */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function origin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) throw new Error('Use an HTTPS origin without a path');
  return url.origin;
}

export async function checkGateway(handle, website, backend, fetcher = fetch) {
  handle = handle.replace(/^@/, '');
  if (!/^[a-z0-9_]{3,30}@[a-z0-9.-]+$/.test(handle)) throw new Error('Use username@nolto.social');
  const [username, domain] = handle.split('@');
  const federation = origin('https://'+domain), site = origin(website), api = origin(backend);
  const actorUrl = federation+'/functions/v1/actor/'+username;
  const resource = '?resource='+encodeURIComponent('acct:'+handle);
  const checks = [];
  async function probe(name, url, validate) {
    let status = null, type = null;
    try {
      const response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
      status = response.status;
      type = response.headers.get('content-type') || '';
      const body = await response.text();
      const detail = validate(response, body, type);
      return { name, url, status, type, ok: detail === null, detail };
    } catch {
      return { name, url, status, type, ok: false, detail: 'Could not read the expected response (network/TLS error or invalid document).' };
    }
  }
  const html = (res, body, type) => res.status === 200 && type.includes('text/html') && /id=["']root["']/.test(body) ? null :
    'The website must answer directly with the app. A redirect back to the federation domain creates a loop in split mode; check Lovable primary domain.';
  const webfinger = (res, body, type) => {
    if (res.status !== 200 || !type.includes('application/jrd+json')) return 'Expected WebFinger JSON without a redirect; check DNS and Worker routing.';
    const doc = JSON.parse(body);
    return doc.subject === 'acct:'+handle && doc.links?.some(link => link.rel === 'self' && link.type === 'application/activity+json' && link.href === actorUrl) ? null : 'WebFinger must keep the handle and actor on the federation domain.';
  };
  checks.push(...await Promise.all([
    probe('website', site+'/', html),
    probe('browser-consent-route', site+'/oauth/authorize', html),
    probe('social-callback-route', site+'/auth/social/callback', html),
    probe('federation-root-navigation', federation+'/', (res, body, type) => {
      if (site === federation) return html(res, body, type);
      return [302,307,308].includes(res.status) && res.headers.get('location') === site+'/' ? null : 'In split mode only browser navigation should redirect to the website origin.';
    }),
    probe('backend-webfinger', api+'/functions/v1/webfinger'+resource, webfinger),
    probe('canonical-webfinger', federation+'/.well-known/webfinger'+resource, webfinger),
    probe('canonical-actor', actorUrl, (res, body, type) => {
      if (res.status !== 200 || !type.includes('application/activity+json')) return 'Expected an ActivityPub actor without a redirect or SPA HTML.';
      const actor = JSON.parse(body);
      return actor.id === actorUrl && actor.publicKey?.owner === actorUrl && actor.inbox === federation+'/functions/v1/inbox/'+username ? null : 'Actor identity, signing-key owner and inbox must stay on the federation domain.';
    }),
    probe('profile-embed', site+'/embed/nolto-profile.js', (res, body, type) =>
      res.status === 200 && /(?:javascript|ecmascript)/.test(type) && body.includes('requestProfile') ? null : 'Load the profile button script directly from the website origin; a cross-origin redirect breaks popup origin checks.'),
  ]));
  return { federation, site, checkedAt: new Date().toISOString(), ok: checks.every(check => check.ok), checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const handle = process.argv[2];
  if (!handle) throw new Error('Usage: node scripts/check-gateway.mjs username@nolto.social [https://www.nolto.social]');
  const site = process.argv[3] || 'https://'+handle.replace(/^@/, '').split('@')[1];
  const backend = JSON.parse(await readFile(new URL('../config/public-backend.json', import.meta.url), 'utf8')).url;
  const result = await checkGateway(handle, site, backend);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
