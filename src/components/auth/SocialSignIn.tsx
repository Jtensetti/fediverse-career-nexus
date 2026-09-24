import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createLovableAuth } from '@lovable.dev/cloud-auth-js';
import { SOCIAL_LOGIN_STORAGE } from '@/lib/socialLogin';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Loader2 } from 'lucide-react';

export default function SocialSignIn({ chooser = false }: { chooser?: boolean }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { data: providers, isLoading, isError, refetch } = useQuery({
    queryKey: ['social-auth-providers'], staleTime: 60000, retry: false,
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Sign-in settings unavailable');
      const result = await response.json();
      return ['google', 'apple'].filter(provider => result.external?.[provider] === true) as ('google' | 'apple')[];
    },
  });
  const start = async (provider: 'google' | 'apple') => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (window.self !== window.top || !crypto.getRandomValues) throw new Error('Open sign-in in its own tab');
      const flow = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem(SOCIAL_LOGIN_STORAGE, JSON.stringify({ flow, createdAt: Date.now() }));
      const result = await createLovableAuth().signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth/social/callback?flow=${flow}` });
      if (result.error || !result.redirected) throw result.error || new Error('Expected managed sign-in redirect');
    } catch { setError(t('auth.socialFailed')); setBusy(false); }
  };
  if (!chooser && !providers?.length) return null;
  if (window.self !== window.top) return <a className="block text-center underline" href="https://nolto.social/auth" target="_blank" rel="noopener noreferrer">{t('auth.socialOpenNolto')}</a>;
  return <section className="space-y-3">
    <div className={chooser ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2'}>{(chooser ? ['google', 'apple'] as const : providers || []).map(provider => <Button key={provider} type="button" variant="outline" disabled={busy || !providers?.includes(provider)} onClick={() => void start(provider)}
      className={chooser ? 'h-auto min-h-14 w-full justify-start gap-3 rounded-xl px-4 py-3 text-left whitespace-normal' : undefined}>
      {chooser && <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-lg font-semibold">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : provider === 'google' ? 'G' : <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M16.8 2.1c.1 1.3-.5 2.6-1.3 3.5-.9 1-2 1.6-3.3 1.5-.2-1.2.4-2.5 1.2-3.4.9-1 2.3-1.6 3.4-1.6zM20.9 17c-.5 1.2-.7 1.7-1.3 2.7-.9 1.3-2.1 3-3.7 3-1.4 0-1.8-.9-3.7-.9s-2.3.9-3.7.9c-1.6 0-2.8-1.5-3.7-2.8C2.3 16.2 2 11.5 3.7 9c1.2-1.8 3.2-2.8 5.1-2.3 1.4.4 2.4 1 3.4 1 .9 0 2.4-.8 4-1 1.7-.2 3.4.5 4.5 1.8-4 2.2-3.4 7.3.2 8.5z" /></svg>}</span>}
      <span className={chooser ? 'flex-1' : undefined}>{t('auth.socialContinue', { provider: provider === 'google' ? 'Google' : 'Apple' })}</span>
      {chooser && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </Button>)}</div>
    {chooser && !isLoading && (isError || providers?.length !== 2) && <p role="status" className="text-xs text-muted-foreground">{t('auth.socialUnavailable')} {isError && <button type="button" onClick={() => void refetch()} className="underline">{t('common.retry')}</button>}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
