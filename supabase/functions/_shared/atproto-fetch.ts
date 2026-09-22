import { isPublicAddress, remoteUrl, readBody } from './remote-fetch.ts';
import { AtprotoTransportError } from './atproto-diagnostics.ts';
import { pinnedHttpResponse } from './pinned-http-response.ts';

export function managedAtprotoHost(hostname: string): boolean {
  return hostname === 'bsky.social' || hostname === 'plc.directory' || hostname.endsWith('.host.bsky.network');
}

/** Use stable Deno TCP/TLS APIs. Older node:https polyfills internally call
 * fetch and ignore servername on an IP URL; the newer TCP proxy API is absent
 * on hosted Edge. startTls checks the original hostname on the pinned socket.
 */
export async function atprotoFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  let url: URL;
  try { url = remoteUrl(request.url); }
  catch (error) { throw new AtprotoTransportError('url', '', error); }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const abort = () => controller.abort();
  request.signal.addEventListener('abort', abort, { once: true });
  if (request.signal.aborted) abort();
  let connection: Deno.Conn | undefined;
  const close = () => { try { connection?.close(); } catch { /* Already closed. */ } };
  const cancelled = new Promise<never>((_, reject) => {
    const cancel = () => { close(); reject(new AtprotoTransportError('https', url.hostname, new DOMException('Cancelled', 'AbortError'))); };
    controller.signal.addEventListener('abort', cancel, { once: true });
    if (controller.signal.aborted) cancel();
  });
  const run = async () => {
    const resolved = await Promise.allSettled([Deno.resolveDns(url.hostname, 'A'), Deno.resolveDns(url.hostname, 'AAAA')]);
    const addresses = resolved.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    if (!addresses.length) throw new AtprotoTransportError('dns', url.hostname, resolved.find(result => result.status === 'rejected')?.reason);
    if (addresses.some(address => !isPublicAddress(address))) throw new AtprotoTransportError('public-address', url.hostname);
    controller.signal.throwIfAborted();
    try {
      // These service domains are operated by Bluesky/PLC, never taken from an
      // arbitrary user's handle. The Edge fetch service supports their HTTPS
      // transport where raw outbound TLS is reset. Unknown PDS/issuer domains
      // must use the pinned socket below; there is no generic fetch fallback.
      if (managedAtprotoHost(url.hostname)) {
        const response = await fetch(request, { redirect: 'error', signal: controller.signal });
        if ([204, 205, 304].includes(response.status)) {
          await response.body?.cancel();
          return new Response(null, { status: response.status, headers: response.headers });
        }
        try { return new Response(await readBody(response, 2 * 1024 * 1024), { status: response.status, headers: response.headers }); }
        catch (error) { throw new AtprotoTransportError('response-body', url.hostname, error); }
      }
      const tcp = await Deno.connect({ hostname: addresses[0], port: 443, transport: 'tcp' });
      connection = tcp;
      if (controller.signal.aborted) { close(); controller.signal.throwIfAborted(); }
      connection = await Deno.startTls(tcp, { hostname: url.hostname, alpnProtocols: ['http/1.1'] });
      if (controller.signal.aborted) { close(); controller.signal.throwIfAborted(); }
      const body = request.body ? new Uint8Array(await request.arrayBuffer()) : new Uint8Array();
      if (body.length > 2 * 1024 * 1024) throw new Error('Request too large');
      const headers = new Headers(request.headers);
      headers.set('host', url.host); headers.set('accept-encoding', 'identity'); headers.set('connection', 'close');
      headers.delete('transfer-encoding'); headers.delete('expect'); headers.set('content-length', String(body.length));
      const head = new TextEncoder().encode(`${request.method} ${url.pathname}${url.search} HTTP/1.1\r\n${[...headers].map(([key,value]) => `${key}: ${value}\r\n`).join('')}\r\n`);
      for (const data of [head, body]) {
        let offset = 0;
        while (offset < data.length) {
          const count = await connection.write(data.subarray(offset));
          if (count <= 0) throw new Error('Connection closed');
          offset += count;
        }
      }
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const chunk = new Uint8Array(16384);
        const count = await connection.read(chunk);
        if (count === null) break;
        size += count;
        if (size > 4 * 1024 * 1024) throw new AtprotoTransportError('response-body', url.hostname);
        chunks.push(chunk.subarray(0, count));
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      try { return pinnedHttpResponse(bytes, request.method); }
      catch (error) { throw new AtprotoTransportError('response-body', url.hostname, error); }
    } catch (error) { throw error instanceof AtprotoTransportError ? error : new AtprotoTransportError('https', url.hostname, error); }
    finally { close(); }
  };
  try { return await Promise.race([run(), cancelled]); }
  finally { clearTimeout(timer); request.signal.removeEventListener('abort', abort); close(); }
}
