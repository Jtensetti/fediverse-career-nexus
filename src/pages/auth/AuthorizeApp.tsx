import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { mastodonRequest, scopeDescription, type AppRequest } from '@/services/auth/mastodonClientService';

export default function AuthorizeApp() {
  const { user, loading, mfaPending } = useAuth();
  const input = useMemo(() => Object.fromEntries(new URLSearchParams(window.location.search)),[]);
  const request = useQuery({ queryKey:['mastodon-consent',window.location.search],queryFn:()=>mastodonRequest<AppRequest>('request'+window.location.search),retry:false });
  const profile = useQuery({ queryKey:['app-consent-profile',user?.id], enabled:!!user, queryFn:async()=> {
    const { data,error } = await supabase.from('public_profiles').select('username,fullname').eq('id',user!.id).single();
    if (error) throw error; return data;
  } });
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const decide = async (decision:'allow'|'deny') => {
    setBusy(true); setError('');
    try {
      const result=await mastodonRequest<{redirect:string}>('consent','POST',{...input,decision});
      // Only the service's validated, registered destination is used.
      window.location.assign(result.redirect);
    } catch(error) { setError(error instanceof Error ? error.message : 'Anslutningen misslyckades.'); setBusy(false); }
  };
  return <div className="mx-auto max-w-lg space-y-6 px-5 py-12">
    <Helmet><title>Anslut en app · Nolto</title><meta name="referrer" content="no-referrer" /></Helmet>
    <a href="/" className="font-display text-2xl text-primary">Nolto</a>
    <h1 className="text-2xl font-semibold">Vill du ansluta den här appen?</h1>
    {request.isPending ? <p role="status">Kontrollerar appens förfrågan…</p> : request.isError ? <p role="alert">{request.error.message}</p> : <>
      <div className="space-y-2 rounded-xl border p-5"><p className="text-xl font-semibold break-words">{request.data.client.name}</p>
        {request.data.client.website && <p className="text-sm break-all text-muted-foreground">{request.data.client.website}</p>}
        <p className="text-sm text-muted-foreground">Appens namn och webbplats anges av utvecklaren och är inte verifierade av Nolto. Godkänn bara en app du själv har valt att ansluta.</p>
      </div>
      <div><p className="font-medium">Appen begär att få:</p><ul className="mt-3 list-disc space-y-2 pl-5">{request.data.scopes.map(scope=><li key={scope}>{scopeDescription(scope)}</li>)}</ul></div>
      <p className="text-sm text-muted-foreground">Åtkomsten gäller i högst 30 dagar och kan återkallas under Anslutna appar. Den upphör även när inloggningssessionen återkallas. Nya inlägg följer Noltós regler för moderering.</p>
      <p className="text-sm">Mastodon-appstödet är under utprovning. Textinlägg, svar, likes och följningar ingår. Bild- och videouppladdning, privata meddelanden, boostar och pushnotiser ingår ännu inte.</p>
      {loading ? <p role="status">Kontrollerar inloggningen…</p> : !user || mfaPending ? <div className="space-y-3"><Button asChild><a href="/auth" target="_blank" rel="noopener noreferrer">Logga in på Nolto</a></Button><p className="text-sm">Slutför inloggningen i den nya fliken och återvänd sedan hit.</p></div>
        : <p className="rounded-lg bg-muted p-4">Ansluter som <strong>{profile.data?.username ? '@'+profile.data.username+'@'+window.location.hostname : 'ditt Nolto-konto'}</strong>.</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {profile.isError && <p role="alert">Kunde inte läsa ditt konto. Ladda om sidan och försök igen.</p>}
      <div className="flex gap-3"><Button variant="outline" disabled={busy} onClick={()=>void decide('deny')}>Avbryt</Button><Button disabled={busy || !user || loading || mfaPending || !profile.data} onClick={()=>void decide('allow')}>{busy ? 'Ansluter…' : 'Godkänn och anslut'}</Button></div>
    </>}
  </div>;
}
