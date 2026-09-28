/** Only the managed Nolto deployment has this same-origin Worker route.
 * Previews and self-hosted backends retain their configured SDK transport.
 * No API key, JWT, channel message or reconnect behavior is changed here.
 */
export function realtimeSocketUrl(address: string | URL, backend: string, pageOrigin: string): string {
  const original = String(address);
  if (pageOrigin !== 'https://nolto.social' || backend.replace(/\/$/, '') !== 'https://anknmcmqljejabxbeohv.supabase.co') return original;
  const url = new URL(original);
  if (url.origin !== 'wss://anknmcmqljejabxbeohv.supabase.co' || url.pathname !== '/realtime/v1/websocket' || url.username || url.password) return original;
  url.host = 'nolto.social';
  return url.href;
}

export function realtimeTransport(backend: string, pageOrigin: string): typeof WebSocket {
  return class extends WebSocket {
    constructor(address: string | URL, protocols?: string | string[]) {
      super(realtimeSocketUrl(address, backend, pageOrigin), protocols);
    }
  };
}
