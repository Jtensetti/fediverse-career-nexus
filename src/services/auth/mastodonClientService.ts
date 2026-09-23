import { supabase } from '@/lib/supabase';

export type AppRequest = { client: { name: string; website: string | null }; scopes: string[]; redirect_uri: string; pkce: boolean };
export type AppGrant = { id: string; client_id: string; scopes: string[]; created_at: string; expires_at: string; mastodon_clients: { name: string; website: string | null } };

export async function mastodonRequest<T>(path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: Record<string,unknown>): Promise<T> {
  const { data,error } = await supabase.functions.invoke('oauth-authorization-server/'+path,{ method, ...(body ? { body } : {}) });
  if (error) {
    let message = 'Det gick inte att kontakta apptjänsten. Försök igen.';
    if (error.context instanceof Response) {
      if (error.context.status === 503 || error.context.status === 410) message='Anslutning av externa appar är inte aktiverad på den här instansen ännu.';
      else if ([401,403].includes(error.context.status)) message='Logga in igen och slutför eventuell tvåfaktorsinloggning.';
      else if (error.context.status === 429) message='För många försök. Vänta en stund och försök igen.';
      else message='Appens anslutningsförfrågan är ogiltig eller har gått ut. Börja om i appen.';
    }
    throw new Error(message);
  }
  return data as T;
}
export function scopeDescription(scope: string): string {
  const labels: Record<string,string> = {
    read:'Läsa din offentliga profil, ditt flöde och dina följningar',
    write:'Publicera offentliga textinlägg och svar, gilla och följa från ditt konto',
    follow:'Läsa och ändra vilka konton du följer', push:'Pushnotiser (stöds ännu inte)',
    'read:accounts':'Läsa din offentliga profil', 'read:statuses':'Läsa ditt flöde och offentliga inlägg',
    'read:favourites':'Läsa vilka offentliga inlägg du gillar', 'read:follows':'Läsa dina följningar',
    'write:statuses':'Publicera offentliga textinlägg och svar', 'write:favourites':'Gilla och ta bort dina likes', 'write:follows':'Följa och sluta följa konton',
  };
  return labels[scope] || scope;
}
