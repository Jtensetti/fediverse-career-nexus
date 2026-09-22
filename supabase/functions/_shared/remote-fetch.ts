/** Shared boundary for URLs supplied by remote federation peers. */
export function remoteUrl(input: string): URL {
  const url = new URL(input);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !host.includes(".") || /[\[\]:]/.test(host) || /^\d+(\.\d+){3}$/.test(host) ||
      /\.(localhost|local|internal|test|invalid|onion)$/.test(host) || host.endsWith(".")) {
    throw new Error("A public HTTPS domain is required");
  }
  return url;
}

export function isPublicAddress(address: string): boolean {
  if (address.includes(":")) {
    // Permit global unicast only; exclude mapped IPv4, ULA, loopback, link-local and documentation.
    const ip = address.toLowerCase();
    return /^[23][0-9a-f]{0,3}:/.test(ip) && !ip.startsWith("2001:db8:") &&
      !ip.startsWith("2001:0:") && !ip.startsWith("2002:");
  }
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [a,b,c] = parts;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}

export async function validateRemoteUrl(input: string): Promise<URL> {
  const url = remoteUrl(input);
  const results = await Promise.allSettled([
    Deno.resolveDns(url.hostname, "A"), Deno.resolveDns(url.hostname, "AAAA"),
  ]);
  const addresses = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
  if (!addresses.length || addresses.some(ip => !isPublicAddress(ip))) throw new Error("Remote host did not resolve to a public address");
  return url;
}

/** Never forward credentials/signatures through redirects. */
export async function remoteFetch(input: string, init: RequestInit = {}): Promise<Response> {
  await validateRemoteUrl(input);
  return fetch(input, { ...init, redirect: "error", signal: init.signal || AbortSignal.timeout(10000) });
}

export async function readJson(response: Response, maxBytes = 1024 * 1024): Promise<any> {
  if (!response.ok) throw new Error(`Remote server returned ${response.status}`);
  if (Number(response.headers.get("content-length")) > maxBytes) throw new Error("Remote document too large");
  return JSON.parse(await readBody(response, maxBytes));
}

export async function readBody(message: Request | Response, maxBytes = 1024 * 1024): Promise<string> {
  const reader = message.body?.getReader();
  if (!reader) throw new Error("Empty body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new Error("Document too large");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}

export async function fetchActorDocument(actorUrl: string) {
  const data = await readJson(await remoteFetch(actorUrl, { headers: { Accept: "application/activity+json" } }));
  if (data.id !== actorUrl || typeof data.inbox !== "string") throw new Error("Remote actor identity does not match its URL");
  remoteUrl(data.inbox);
  return data;
}
