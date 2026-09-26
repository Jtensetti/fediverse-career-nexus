import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { mastodonRequest, scopeDescription, type AppRequest } from '@/services/auth/mastodonClientService';
import { rememberAppAuthorization } from '@/lib/appAuthorizationReturn';
import { formatFederatedHandle } from '@/lib/federation';

import { tx } from "@/i18n/tx";
export default function AuthorizeApp() {
  const { user, loading, mfaPending } = useAuth();
  const { search } = useLocation();
  const navigate = useNavigate();
  const input = useMemo(() => Object.fromEntries(new URLSearchParams(search)),[search]);
  const request = useQuery({ queryKey:['mastodon-consent',search],queryFn:()=>mastodonRequest<AppRequest>('request'+search),retry:false });
  const profile = useQuery({ queryKey:['app-consent-profile',user?.id], enabled:!!user, queryFn:async()=> {
    const { data,error } = await supabase.from('public_profiles').select('username,fullname').eq('id',user!.id).single();
    if (error) throw error; return data;
  } });
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const signIn = () => {
    try {
      const returnTo = '/oauth/authorize'+search;
      rememberAppAuthorization(returnTo);
      navigate('/auth', { state: { returnTo } });
    } catch { setError(tx("ui.authorizeApp.storageRequired")); }
  };
  const decide = async (decision:'allow'|'deny') => {
    setBusy(true); setError('');
    try {
      const result=await mastodonRequest<{redirect:string}>('consent','POST',{...input,decision});
      // Only the service's validated, registered destination is used.
      window.location.assign(result.redirect);
    } catch(error) { setError(error instanceof Error ? error.message : 'Anslutningen misslyckades.'); setBusy(false); }
  };
  if (window.top !== window.self) return <p role="alert">{tx("ui.authorizeApp.oppnaAppanslutningenIEtt")}</p>;
  return <div className="mx-auto max-w-lg space-y-6 px-5 py-12">
    <Helmet><title>{tx("ui.authorizeApp.anslutEnAppNolto")}</title><meta name="referrer" content="no-referrer" /></Helmet>
    <a href="/" className="font-display text-2xl text-primary">Nolto</a>
    <h1 className="text-2xl font-semibold">{tx("ui.authorizeApp.villDuAnslutaDen")}</h1>
    {request.isPending ? <p role="status">{tx("ui.authorizeApp.kontrollerarAppensForfragan")}</p> : request.isError ? <p role="alert">{request.error.message}</p> : <>
      <div className="space-y-2 rounded-xl border p-5"><p className="text-xl font-semibold break-words">{request.data.client.name}</p>
        {request.data.client.website && <p className="text-sm break-all text-muted-foreground">{request.data.client.website}</p>}
        <p className="text-sm text-muted-foreground">{tx("ui.authorizeApp.appensNamnOchWebbplats")}</p>
      </div>
      <div><p className="font-medium">{tx("ui.authorizeApp.appenBegarAttFa")}</p><ul className="mt-3 list-disc space-y-2 pl-5">{request.data.scopes.map(scope=><li key={scope}>{scopeDescription(scope)}</li>)}</ul></div>
      <p className="text-sm text-muted-foreground">{tx("ui.authorizeApp.atkomstenGallerIHogst")}</p>
      <p className="text-sm">{tx("ui.authorizeApp.mastodonAppstodetArUnder")}</p>
      {loading ? <p role="status">{tx("ui.authorizeApp.kontrollerarInloggningen")}</p> : !user || mfaPending ? <div className="space-y-3"><Button onClick={signIn}>{tx("ui.authorizeApp.loggaInPaNolto")}</Button><p className="text-sm">{tx("ui.authorizeApp.efterInloggningenKommerDu")}</p></div>
        : <p className="rounded-lg bg-muted p-4">{tx("ui.authorizeApp.ansluterSom")}{' '}<strong>{profile.data?.username ? formatFederatedHandle(profile.data.username) : tx("ui.authorizeApp.dittNoltoKonto")}</strong>.</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {profile.isError && <p role="alert">{tx("ui.authorizeApp.kundeInteLasaDitt")}</p>}
      <div className="flex gap-3"><Button variant="outline" disabled={busy} onClick={()=>void decide('deny')}>{tx("ui.authorizeApp.avbryt")}</Button><Button disabled={busy || !user || loading || mfaPending || !profile.data} onClick={()=>void decide('allow')}>{busy ? tx("ui.authorizeApp.ansluter") : tx("ui.authorizeApp.godkannOchAnslut")}</Button></div>
    </>}
  </div>;
}
