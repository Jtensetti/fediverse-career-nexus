const MAX_BODY = 2 * 1024 * 1024;
const text = new TextDecoder('latin1');
function lineEnd(bytes: Uint8Array, start: number) {
  for (let i = start; i + 1 < bytes.length; i++) if (bytes[i] === 13 && bytes[i + 1] === 10) return i;
  throw new Error('Truncated HTTP response');
}

/** Bounded HTTP/1 response decoder for one connection, never reused. Ambiguous
 * framing, truncated chunks and unexpected content encodings fail closed.
 */
export function pinnedHttpResponse(bytes: Uint8Array, method: string): Response {
  let offset = 0, status = 0, headers = new Headers();
  do {
    headers = new Headers();
    const end = lineEnd(bytes, offset);
    const match = /^HTTP\/1\.[01] ([1-5][0-9]{2})(?: |$)/.exec(text.decode(bytes.subarray(offset, end)));
    if (!match) throw new Error('Invalid HTTP response');
    status = Number(match[1]); offset = end + 2;
    while (true) {
      const end = lineEnd(bytes, offset);
      if (end > 65536) throw new Error('HTTP headers too large');
      if (end === offset) { offset += 2; break; }
      const line = text.decode(bytes.subarray(offset, end));
      const colon = line.indexOf(':');
      if (colon < 1 || /^[ \t]/.test(line)) throw new Error('Invalid HTTP header');
      headers.append(line.slice(0, colon), line.slice(colon + 1).trim());
      offset = end + 2;
    }
    if (status === 101) throw new Error('HTTP upgrade is unsupported');
  } while (status < 200);
  if (status >= 300 && status < 400 && status !== 304) throw new Error('OAuth redirects are forbidden');
  if (method === 'HEAD' || [204, 205, 304].includes(status)) return new Response(null, { status, headers });
  if (headers.has('content-encoding') && headers.get('content-encoding') !== 'identity') throw new Error('Unexpected content encoding');
  let body: Uint8Array;
  const transfer = headers.get('transfer-encoding'), length = headers.get('content-length');
  if (transfer) {
    if (transfer.toLowerCase() !== 'chunked' || length !== null) throw new Error('Ambiguous HTTP framing');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const end = lineEnd(bytes, offset);
      const hex = text.decode(bytes.subarray(offset, end)).split(';', 1)[0];
      if (!/^[0-9a-f]{1,8}$/i.test(hex)) throw new Error('Invalid HTTP chunk');
      const count = parseInt(hex, 16); offset = end + 2;
      if (count === 0) {
        // Trailers carry no OAuth semantics and are deliberately not forwarded.
        while (true) { const end = lineEnd(bytes, offset); if (end === offset) { offset += 2; break; } offset = end + 2; }
        if (offset !== bytes.length) throw new Error('Unexpected trailing bytes');
        break;
      }
      size += count;
      if (size > MAX_BODY || offset + count + 2 > bytes.length || bytes[offset + count] !== 13 || bytes[offset + count + 1] !== 10) throw new Error('Invalid or oversized HTTP body');
      chunks.push(bytes.subarray(offset, offset + count)); offset += count + 2;
    }
    body = new Uint8Array(size); let position = 0;
    for (const chunk of chunks) { body.set(chunk, position); position += chunk.length; }
    headers.delete('transfer-encoding'); headers.set('content-length', String(size));
  } else {
    body = bytes.subarray(offset);
    if (body.length > MAX_BODY || (length !== null && (!/^\d+$/.test(length) || Number(length) !== body.length))) throw new Error('Invalid or oversized HTTP body');
  }
  return new Response(new Uint8Array(body), { status, headers });
}
