import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ATPROTO_LOGIN_STORAGE, readAtprotoLogin, clearAtprotoLogin } from '@/lib/atprotoLogin';
import { Button } from '@/components/ui/button';

export default function AtprotoCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const exchange = useRef<Promise<boolean> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    exchange.current ??= (async () => {
      const params = new URLSearchParams(window.location.search);
      // Remove OAuth credentials from history and subsequent referrers immediately.
      window.history.replaceState(null, '', '/auth/atproto/callback');
      if (params.has('error')) throw new Error('Authorization declined');
      const stored = readAtprotoLogin(sessionStorage.getItem(ATPROTO_LOGIN_STORAGE), params.get('state'));
      const { data, error } = await supabase.functions.invoke('atproto-auth', { body: {
        action: 'callback', state: params.get('state'), code: params.get('code'), iss: params.get('iss'), browserProof: stored.proof,
      } });
      if (error) throw error;
      if (stored.link) {
        if (data?.linked !== true) throw new Error('Account linking failed');
        return true;
      }
      if (typeof data?.tokenHash !== 'string') throw new Error('Sign-in failed');
      const { error: sessionError } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: data.tokenHash });
      if (sessionError) throw sessionError;
      return false;
    })().finally(clearAtprotoLogin);
    exchange.current.then(linked => {
      if (cancelled) return;
      void client.invalidateQueries({ queryKey: ['atproto-identity'] });
      navigate(linked ? '/profile/edit' : '/', { replace: true });
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [client, navigate]);
  return <main className="min-h-screen flex items-center justify-center bg-background p-5">
    <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
      <h1 className="text-xl font-semibold">{t('bluesky.signIn')}</h1>
      {failed ? <><p role="alert">{t('bluesky.failed')}</p><Button asChild><Link to="/auth">{t('bluesky.tryAgain')}</Link></Button><Link className="block text-sm underline" to="/">{t('bluesky.home')}</Link></>
        : <p role="status">{t('bluesky.finishing')}</p>}
    </div>
  </main>;
}
