import { UserFacingError } from '@/lib/userFacingError';
import { tx } from '@/i18n/tx';
import { supabase } from '@/lib/supabase';

export type AppRequest = { client: { name: string; website: string | null }; scopes: string[]; redirect_uri: string; pkce: boolean };
export type AppGrant = { id: string; client_id: string; scopes: string[]; created_at: string; expires_at: string; mastodon_clients: { name: string; website: string | null } };

export async function mastodonRequest<T>(path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: Record<string,unknown>): Promise<T> {
  const { data,error } = await supabase.functions.invoke('oauth-authorization-server/'+path,{ method, ...(body ? { body } : {}) });
  if (error) {
    let message = 'reviewUI.appServiceFailed';
    if (error.context instanceof Response) {
      if (error.context.status === 503 || error.context.status === 410) message='reviewUI.appUnavailable';
      else if ([401,403].includes(error.context.status)) message='reviewUI.appSignIn';
      else if (error.context.status === 429) message='auth.tooManyAttempts';
      else message='reviewUI.appRequestFailed';
    }
    throw new UserFacingError(message);
  }
  return data as T;
}
export function scopeDescription(scope: string): string {
  const labels: Record<string, string> = {
    read: 'reviewUI.scopeRead', write: 'reviewUI.scopeWrite', follow: 'reviewUI.scopeFollow', push: 'reviewUI.scopePush',
    'read:accounts': 'reviewUI.scopeAccounts', 'read:statuses': 'reviewUI.scopeStatuses',
    'read:favourites': 'reviewUI.scopeFavourites', 'read:follows': 'reviewUI.scopeFollows',
    'write:statuses': 'reviewUI.scopePublish', 'write:favourites': 'reviewUI.scopeLike', 'write:follows': 'reviewUI.scopeChangeFollows',
  };
  return labels[scope] ? tx(labels[scope]) : scope;
}
