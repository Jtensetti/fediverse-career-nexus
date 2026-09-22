import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createLovableAuth } from '@lovable.dev/cloud-auth-js';
import { SOCIAL_LOGIN_STORAGE } from '@/lib/socialLogin';
import { Button } from '@/components/ui/button';

export default function SocialSignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { data: providers } = useQuery({
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
    } catch { setError('Inloggningen kunde inte startas. Försök igen.'); setBusy(false); }
  };
  if (!providers?.length) return null;
  if (window.self !== window.top) return <a className="block text-center underline" href="https://nolto.social/auth" target="_blank" rel="noopener noreferrer">Öppna Nolto för att logga in med Google eller Apple</a>;
  return <section className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2">{providers.map(provider => <Button key={provider} type="button" variant="outline" disabled={busy} onClick={() => void start(provider)}>
      Fortsätt med {provider === 'google' ? 'Google' : 'Apple'}
    </Button>)}</div>
    <p className="text-xs text-muted-foreground">Välj ditt @namn@nolto.social när du skapar din profil.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
