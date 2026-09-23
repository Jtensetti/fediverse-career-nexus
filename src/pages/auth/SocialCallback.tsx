import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { readSocialLogin, SOCIAL_LOGIN_STORAGE } from '@/lib/socialLogin';
import { Button } from '@/components/ui/button';
import { consumeAppAuthorization } from '@/lib/appAuthorizationReturn';

export default function SocialCallback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const exchange = useRef<Promise<void>>();
  useEffect(() => {
    let active = true;
    exchange.current ??= (async () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const saved = sessionStorage.getItem(SOCIAL_LOGIN_STORAGE);
      sessionStorage.removeItem(SOCIAL_LOGIN_STORAGE);
      // Remove tokens and the browser binding before any further navigation.
      window.history.replaceState(null, '', '/auth/social/callback');
      if (params.getAll('flow').length !== 1) throw new Error('Invalid sign-in state');
      const tokens = readSocialLogin(saved, params.get('flow'), hash);
      // setSession verifies the access token with this project's Auth service;
      // the ordinary AuthProvider still enforces MFA before exposing the user.
      const { error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
    })();
    exchange.current.then(() => { if (active) navigate(consumeAppAuthorization() || '/feed', { replace: true }); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [navigate]);
  return <main className="min-h-screen flex items-center justify-center bg-background p-5"><div className="max-w-md rounded-xl border p-6 space-y-4">
    <h1 className="text-xl font-semibold">Logga in på Nolto</h1>
    {failed ? <><p role="alert">Inloggningen kunde inte slutföras. Starta ett nytt försök i samma webbläsare.</p><Button asChild><Link to="/auth">Försök igen</Link></Button></>
      : <p role="status">Slutför inloggningen…</p>}
  </div></main>;
}
