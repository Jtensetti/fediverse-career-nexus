import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 
  | 'connection_request' 
  | 'connection_accepted' 
  | 'endorsement' 
  | 'message' 
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

export const notificationService = {
  async getNotifications(limit = 50): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(id, fullname, username, avatar_url)
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return (data || []) as Notification[];
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
          // Fetch the full notification with actor data
          const { data } = await supabase
            .from('notifications')
            .select(`
              *,
              actor:profiles!notifications_actor_id_fkey(id, fullname, username, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            callback(data as Notification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
