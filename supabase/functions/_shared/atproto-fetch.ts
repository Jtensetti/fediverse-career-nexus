import { isPublicAddress, readBody, remoteUrl } from './remote-fetch.ts';
import { AtprotoTransportError } from './atproto-diagnostics.ts';

/** DNS is resolved once and the connection is pinned to a checked address.
 * TLS still authenticates the original HTTPS hostname. Never follow redirects
 * with OAuth credentials, or rely on a second DNS lookup after validation.
 */
export async function atprotoFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  let url: URL;
  try { url = remoteUrl(request.url); }
  catch (error) { throw new AtprotoTransportError('url', '', error); }
  const resolved = await Promise.allSettled([Deno.resolveDns(url.hostname, 'A'), Deno.resolveDns(url.hostname, 'AAAA')]);
  const addresses = resolved.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  if (!addresses.length) throw new AtprotoTransportError('dns', url.hostname, resolved.find(result => result.status === 'rejected')?.reason);
  if (addresses.some(address => !isPublicAddress(address))) throw new AtprotoTransportError('public-address', url.hostname);
  let client: Deno.HttpClient;
  try { client = Deno.createHttpClient({ proxy: { transport: 'tcp', hostname: addresses[0], port: 443 }, poolMaxIdlePerHost: 0 }); }
  catch (error) { throw new AtprotoTransportError('http-client', url.hostname, error); }
  try {
    let response: Response;
    try {
      response = await fetch(request, {
        client, redirect: 'error', signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
      });
    } catch (error) { throw new AtprotoTransportError('https', url.hostname, error); }
    if ([204, 205, 304].includes(response.status)) {
      await response.body?.cancel();
      return new Response(null, { status: response.status, headers: response.headers });
    }
    let body: string;
    try { body = await readBody(response, 2 * 1024 * 1024); }
    catch (error) { throw new AtprotoTransportError('response-body', url.hostname, error); }
    return new Response(body, { status: response.status, headers: response.headers });
  } finally { client.close(); }
}
