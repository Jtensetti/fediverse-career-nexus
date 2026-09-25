import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { client } from './client';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<'loading' | 'guest' | 'verified' | 'mfa' | 'error'>('loading');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!client) { setStatus('guest'); return; }
    const { data } = client.auth.onAuthStateChange((_event, value) => { setSession(value); setRevision(n => n + 1); });
    void client.auth.getSession().then(({ data, error }) => {
      if (error) setStatus('error'); else { setSession(data.session); setRevision(n => n + 1); }
    }).catch(() => setStatus('error'));
    if (AppState.currentState === 'active') client.auth.startAutoRefresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { client?.auth.startAutoRefresh(); setRevision(n => n + 1); }
      else client?.auth.stopAutoRefresh();
    });
    return () => { data.subscription.unsubscribe(); subscription.remove(); client?.auth.stopAutoRefresh(); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (!session || !client) { setStatus('guest'); return; }
    setStatus('loading');
    void (async () => {
      try {
        const verified = await client.rpc('current_session_is_verified');
        if (verified.error) throw verified.error;
        if (verified.data === true) { if (!cancelled) setStatus('verified'); return; }
        const active = await client.rpc('current_session_is_active');
        if (active.error || active.data !== true) throw new Error('Inactive session');
        const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assurance.error || assurance.data.nextLevel !== 'aal2') throw new Error('Invalid assurance');
        if (!cancelled) setStatus('mfa');
      } catch { if (!cancelled) setStatus('error'); }
    })();
    return () => { cancelled = true; };
  }, [session, revision]);
  return { session, status, verify: () => setRevision(n => n + 1) };
}
