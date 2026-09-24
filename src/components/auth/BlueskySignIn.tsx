import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ATPROTO_LOGIN_STORAGE, clearAtprotoLogin } from '@/lib/atprotoLogin';

export default function BlueskySignIn({ link = false, showUnavailable = false }: { link?: boolean; showUnavailable?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const readiness = useQuery({
    queryKey: ['atproto-auth-ready', user?.id], retry: false, staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('atproto-auth', { method: 'GET' });
      if (error) throw error;
      return data as { ready: boolean; siteUrl: string };
    },
  });
  const identity = useQuery({
    queryKey: ['atproto-identity', user?.id], enabled: link && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('atproto_identities').select('did').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !readiness.data?.ready) return;
    setBusy(true); setError('');
    try {
      const proof = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
      // Confirm browser storage works before starting an external authorization.
      sessionStorage.setItem(ATPROTO_LOGIN_STORAGE, JSON.stringify({ proof, createdAt: Date.now(), link }));
      const { data, error } = await supabase.functions.invoke('atproto-auth', { body: { action: 'start', handle, link, browserProof: proof } });
      if (error || !data?.authorizationUrl || typeof data.state !== 'string') throw new Error('Sign-in unavailable');
      const url = new URL(data.authorizationUrl);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid authorization URL');
      sessionStorage.setItem(ATPROTO_LOGIN_STORAGE, JSON.stringify({ proof, state: data.state, createdAt: Date.now(), link }));
      window.location.assign(url.href);
    } catch {
      clearAtprotoLogin();
      setError(t('bluesky.failed')); setBusy(false);
    }
  };
  // No sign-in button is shown until the deployed backend explicitly enables it.
  if (!readiness.data?.ready) return link || showUnavailable ? <section className="rounded-lg border p-5 space-y-2">
    <h3 className="font-semibold">Bluesky</h3><p role="status" className="text-sm text-muted-foreground">{t(readiness.isLoading ? 'common.loading' : 'bluesky.unavailable')}</p>
    {showUnavailable && readiness.isError && <Button variant="outline" onClick={() => void readiness.refetch()}>{t('common.retry')}</Button>}
  </section> : null;
  const site = new URL(readiness.data.siteUrl);
  if (site.protocol !== 'https:') return null;
  return <section className="space-y-3 rounded-lg border p-5">
    <h3 className="font-semibold">{t(link ? 'bluesky.linkTitle' : 'bluesky.signIn')}</h3>
    <p className="text-sm text-muted-foreground">{t('bluesky.scope')}</p>
    {link && identity.isError ? <p role="alert" className="text-sm text-destructive">{t('bluesky.identityFailed')}</p>
      : identity.data ? <div className="space-y-2 text-sm"><p>{t('bluesky.linked')}</p><p className="break-all text-muted-foreground">{identity.data.did}</p></div>
      : site.origin !== window.location.origin ? <a className="text-primary underline" href={`${site.origin}${link ? '/profile/edit' : '/auth'}`}>{t('bluesky.canonicalSite')}</a>
      : <form onSubmit={event => void start(event)} className="space-y-3">
        <Label htmlFor={link ? 'bluesky-link-handle' : 'bluesky-login-handle'}>{t('bluesky.handle')}</Label>
        <Input id={link ? 'bluesky-link-handle' : 'bluesky-login-handle'} value={handle} onChange={event => setHandle(event.target.value)}
          placeholder="namn.bsky.social" required autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={254} disabled={busy} />
        <Button type="submit" variant="outline" className="w-full" disabled={busy || !handle.trim() || (link && identity.isLoading)}>{t(busy ? 'bluesky.starting' : 'bluesky.continue')}</Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>}
  </section>;
}
