
import { supabase } from "@/integrations/supabase/client";

export interface OutgoingFollow {
  id: string;
  local_actor_id: string;
  remote_actor_uri: string;
  follow_activity_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export const getOutgoingFollows = async (actorId: string): Promise<OutgoingFollow[]> => {
  const { data, error } = await supabase
    .from('outgoing_follows')
    .select('*')
    .eq('local_actor_id', actorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching outgoing follows:', error);
    throw error;
  }

  return data || [];
};

export const getOutgoingFollowStatus = async (actorId: string, remoteActorUri: string): Promise<'pending' | 'accepted' | 'rejected' | null> => {
  const { data, error } = await supabase
    .from('outgoing_follows')
    .select('status')
    .eq('local_actor_id', actorId)
    .eq('remote_actor_uri', remoteActorUri)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    console.error('Error fetching outgoing follow status:', error);
    throw error;
  }

  return data?.status || null;
};

export const subscribeToOutgoingFollows = (
  actorId: string,
  callback: (follows: OutgoingFollow[]) => void
) => {
  const subscription = supabase
    .channel('outgoing_follows_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'outgoing_follows',
        filter: `local_actor_id=eq.${actorId}`
      },
      async () => {
        // Refetch data when changes occur
        try {
          const follows = await getOutgoingFollows(actorId);
          callback(follows);
        } catch (error) {
          console.error('Error refetching outgoing follows:', error);
        }
      }
    )
    .subscribe();

  return subscription;
};
