import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { mastodonRequest, scopeDescription, type AppGrant } from '@/services/auth/mastodonClientService';

export default function ConnectedApps() {
  const { user } = useAuth();
  const apps = useQuery({ queryKey:['connected-apps',user?.id],queryFn:()=>mastodonRequest<{grants:AppGrant[]}>('grants'),retry:false,enabled:!!user });
  const [busy,setBusy] = useState<string | null>(null);
  const [error,setError] = useState('');
  const groups = new Map<string,AppGrant[]>();
  for (const grant of apps.data?.grants || []) groups.set(grant.client_id,[...(groups.get(grant.client_id)||[]),grant]);
  const revoke = async(clientId:string) => {
    setBusy(clientId); setError('');
    try { await mastodonRequest('grants','DELETE',{client_id:clientId}); await apps.refetch(); }
    catch(error) { setError(error instanceof Error ? error.message : 'Kunde inte återkalla åtkomsten.'); }
    finally { setBusy(null); }
  };
  return <div className="mx-auto max-w-2xl space-y-6 px-5 py-12">
    <Link className="text-sm text-primary underline" to="/mastodon-apps">Om Mastodon-appar</Link>
    <h1 className="text-3xl font-semibold">Anslutna appar</h1>
    <p className="text-muted-foreground">Här kan du återkalla en extern apps åtkomst till ditt Nolto-konto. För att använda appen igen behöver du ansluta den på nytt.</p>
    {apps.isPending ? <p role="status">Hämtar anslutningar…</p> : apps.isError ? <p role="alert">{apps.error.message}</p> : groups.size === 0 ? <p>Du har inga godkända appanslutningar.</p> : [...groups.entries()].map(([clientId,grants])=><div key={clientId} className="space-y-3 rounded-xl border p-5">
      <h2 className="text-xl font-medium">{grants[0].mastodon_clients.name}</h2>
      {grants[0].mastodon_clients.website && <p className="break-all text-sm text-muted-foreground">{grants[0].mastodon_clients.website}</p>}
      <ul className="list-disc pl-5 text-sm">{[...new Set(grants.flatMap(g=>g.scopes))].map(scope=><li key={scope}>{scopeDescription(scope)}</li>)}</ul>
      <p className="text-sm text-muted-foreground">{grants.length} anslutning(ar). Senast godkänd {new Date(grants[0].created_at).toLocaleDateString('sv-SE')}.</p>
      <Button variant="destructive" disabled={!!busy} onClick={()=>void revoke(clientId)}>{busy === clientId ? 'Återkallar…' : 'Återkalla åtkomst'}</Button>
    </div>)}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </div>;
}
