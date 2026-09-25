export type MobileNotification = {
  id: string; type: string; read: boolean; created_at: string;
  actor_id: string | null; object_id: string | null; object_type: string | null;
};
export const isUuid = (value: unknown): value is string => typeof value === 'string' && value.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function notificationTitle(type: string) {
  return ({ message: 'Du har ett nytt meddelande', message_reaction: 'En reaktion på ditt meddelande', reply: 'Ett nytt svar', mention: 'Du har blivit omnämnd', like: 'En reaktion på ditt inlägg', boost: 'Ditt inlägg har delats', follow: 'En ny följare', connection_request: 'En ny kontaktförfrågan', connection_accepted: 'Din kontaktförfrågan har accepterats', endorsement: 'En ny bekräftelse av din kompetens', job_application: 'En ny jobbansökan', recommendation_request: 'En förfrågan om rekommendation', recommendation_received: 'En ny rekommendation', article_published: 'En ny artikel' } as Record<string, string>)[type] ?? 'Nytt på Nolto';
}

// No URL, content or route supplied by a push payload is ever opened.
// Call only with an owned notification fetched from the authenticated API.
export function notificationPath(notification: MobileNotification): string {
  const id = notification.object_id;
  if (notification.type === 'connection_request' || notification.type === 'connection_accepted') return '/connections';
  if (notification.object_type === 'profile' && isUuid(id)) return `/profile/${id}`;
  if (notification.type === 'message' || notification.type === 'message_reaction') return isUuid(notification.actor_id) ? `/messages/${notification.actor_id}` : '/messages';
  if (isUuid(id)) {
    const prefix = ({ post: '/post/', reply: '/post/', article: '/articles/', job: '/jobs/', event: '/events/' } as Record<string, string>)[notification.object_type ?? ''];
    if (prefix) return `${prefix}${id}`;
  }
  if (isUuid(notification.actor_id)) return `/profile/${notification.actor_id}`;
  return '/notifications';
}
