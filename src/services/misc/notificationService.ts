import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 
  | 'connection_request' 
  | 'connection_accepted' 
  | 'endorsement' 
  | 'message' 
  | 'message_reaction'
  | 'job_application' 
  | 'mention' 
  | 'follow' 
  | 'like' 
  | 'boost' 
  | 'reply'
  | 'recommendation_request'
  | 'recommendation_received'
  | 'article_published';

export interface Notification {
  id: string;
  type: NotificationType;
  recipient_id: string;
  actor_id: string | null;
  content: string | null;
  object_id: string | null;
  object_type: string | null;
  read: boolean;
  created_at: string;
  actor?: {
    id: string;
    fullname: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

// Helper function to enrich notifications with actor data from public_profiles view
async function enrichWithActorData(notifications: any[]): Promise<Notification[]> {
  if (notifications.length === 0) return [];

  // Get unique actor IDs
  const actorIds = [...new Set(notifications.map(n => n.actor_id).filter(Boolean))];
  
  if (actorIds.length === 0) {
    return notifications as Notification[];
  }

  // Fetch actor profiles from the public_profiles view (bypasses RLS, excludes sensitive fields)
  const { data: profiles } = await supabase
    .from('public_profiles')
    .select('id, fullname, username, avatar_url')
    .in('id', actorIds);

  // Create a map for quick lookup
  const profileMap = new Map(
    (profiles || []).map(p => [p.id, p])
  );

  // Enrich notifications with actor data
  return notifications.map(notification => ({
    ...notification,
    actor: notification.actor_id ? profileMap.get(notification.actor_id) || null : null
  })) as Notification[];
}

export const notificationService = {
  async getNotifications(limit = 50): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return enrichWithActorData(data || []);
  },

  async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('read', false);

    if (error) return 0;
    return count || 0;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
  },

  async markAllAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', user.id)
      .eq('read', false);
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
  },

  async createNotification(params: {
    type: NotificationType;
    recipientId: string;
    actorId?: string;
    content?: string;
    objectId?: string;
    objectType?: string;
  }): Promise<void> {
    await supabase
      .from('notifications')
      .insert({
        type: params.type,
        recipient_id: params.recipientId,
        actor_id: params.actorId,
        content: params.content,
        object_id: params.objectId,
        object_type: params.objectType,
      });
  },

  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          // Fetch the full notification and enrich with actor data
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            const enriched = await enrichWithActorData([data]);
            if (enriched.length > 0) {
              callback(enriched[0]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
