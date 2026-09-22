import { isPublicAddress, readBody, remoteUrl } from './remote-fetch.ts';

/** DNS is resolved once and the connection is pinned to a checked address.
 * TLS still authenticates the original HTTPS hostname. Never follow redirects
 * with OAuth credentials, or rely on a second DNS lookup after validation.
 */
export async function atprotoFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const url = remoteUrl(request.url);
  const resolved = await Promise.allSettled([Deno.resolveDns(url.hostname, 'A'), Deno.resolveDns(url.hostname, 'AAAA')]);
  const addresses = resolved.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  if (!addresses.length || addresses.some(address => !isPublicAddress(address))) throw new Error('OAuth host is not public');
  const client = Deno.createHttpClient({ proxy: { transport: 'tcp', hostname: addresses[0], port: 443 }, poolMaxIdlePerHost: 0 });
  try {
    const response = await fetch(request, {
      client, redirect: 'error', signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
    });
    if ([204, 205, 304].includes(response.status)) {
      await response.body?.cancel();
      return new Response(null, { status: response.status, headers: response.headers });
    }
    const body = await readBody(response, 2 * 1024 * 1024);
    return new Response(body, { status: response.status, headers: response.headers });
  } finally { client.close(); }
}
