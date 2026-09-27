/** Only Nolto's known CORS media handlers opt into anonymous image requests.
 * Arbitrary remote images may not support CORS and must keep their normal load.
 */
export function mediaCrossOrigin(src: string | undefined, backend: string | undefined): 'anonymous' | undefined {
  if (!src || !backend) return undefined;
  try {
    const url = new URL(src);
    const origin = new URL(backend);
    if (url.origin !== origin.origin || url.protocol !== 'https:' || url.username || url.password) return undefined;
    if (url.pathname.startsWith('/functions/v1/public-media/') || url.pathname === '/functions/v1/proxy-media') return 'anonymous';
  } catch { /* Relative, blob and malformed URLs keep ordinary image behavior. */ }
  return undefined;
}
