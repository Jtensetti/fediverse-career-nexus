import https from 'node:https';
import { checkServerIdentity } from 'node:tls';
import { isPublicAddress, remoteUrl } from './remote-fetch.ts';
import { AtprotoTransportError } from './atproto-diagnostics.ts';

const MAX_BYTES = 2 * 1024 * 1024;

/** Connect directly to a checked IP, with TLS/SNI and Host for the original
 * hostname. node:https works on the hosted Edge runtime; Deno's TCP proxy
 * option requires a newer runtime. No redirects, second DNS lookup or pooling.
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
  const body = request.body ? new Uint8Array(await request.arrayBuffer()) : undefined;
  if (body && body.byteLength > MAX_BYTES) throw new AtprotoTransportError('response-body', url.hostname);
  const headers = Object.fromEntries(request.headers.entries());
  headers.host = url.host;
  headers['accept-encoding'] = 'identity';
  headers.connection = 'close';

  return new Promise<Response>((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const abort = () => controller.abort();
    request.signal.addEventListener('abort', abort, { once: true });
    if (request.signal.aborted) abort();
    const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener('abort', abort); };
    const fail = (error: unknown) => {
      cleanup(); reject(error instanceof AtprotoTransportError ? error : new AtprotoTransportError('https', url.hostname, error));
    };
    try {
      const outgoing = https.request({
        hostname: addresses[0], port: 443, servername: url.hostname,
        checkServerIdentity: (_hostname, certificate) => checkServerIdentity(url.hostname, certificate),
        rejectUnauthorized: true, agent: false, method: request.method,
        path: url.pathname + url.search, headers, signal: controller.signal,
      }, incoming => {
        const status = incoming.statusCode || 502;
        if (status >= 300 && status < 400 && status !== 304) {
          incoming.destroy(); outgoing.destroy();
          fail(new AtprotoTransportError('https', url.hostname)); return;
        }
        const responseHeaders = new Headers();
        for (let i = 0; i < incoming.rawHeaders.length; i += 2) responseHeaders.append(incoming.rawHeaders[i], incoming.rawHeaders[i + 1]);
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        incoming.on('error', fail);
        incoming.on('data', (chunk: Uint8Array) => {
          bytes += chunk.byteLength;
          if (bytes > MAX_BYTES) {
            incoming.destroy(); outgoing.destroy();
            fail(new AtprotoTransportError('response-body', url.hostname));
          } else chunks.push(chunk);
        });
        incoming.on('end', () => {
          cleanup();
          const result = new Uint8Array(bytes);
          let offset = 0;
          for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
          try { resolve(new Response([204, 205, 304].includes(status) || request.method === 'HEAD' ? null : result, { status, headers: responseHeaders })); }
          catch (error) { fail(error); }
        });
      });
      outgoing.on('error', fail);
      outgoing.end(body);
    } catch (error) { fail(error); }
  });
}
