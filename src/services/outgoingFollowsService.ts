
import { supabase } from "@/integrations/supabase/client";

export interface OutgoingFollow {
  id: string;
  local_actor_id: string;
  remote_actor_url: string;
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

  return (data || []) as OutgoingFollow[];
};

export const getOutgoingFollowStatus = async (actorId: string, remoteActorUrl: string): Promise<'pending' | 'accepted' | 'rejected' | null> => {
  const { data, error } = await supabase
    .from('outgoing_follows')
    .select('status')
    .eq('local_actor_id', actorId)
    .eq('remote_actor_url', remoteActorUrl)
    .maybeSingle();

  if (error) {
    console.error('Error fetching outgoing follow status:', error);
    throw error;
  }

  return data?.status as 'pending' | 'accepted' | 'rejected' || null;
};

// Send a Follow activity to a remote actor
export const followRemoteActor = async (localActorId: string, remoteActorUrl: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`🌐 Following remote actor: ${remoteActorUrl}`);
    
    const { data, error } = await supabase.functions.invoke('send-follow', {
      body: {
        localActorId,
        remoteActorUrl,
        action: 'follow'
      }
    });
    
    if (error) {
      console.error('Error sending follow:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Follow request sent:', data);
    return { success: true };
  } catch (error) {
    console.error('Error following remote actor:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Send an Undo Follow activity to a remote actor
export const unfollowRemoteActor = async (localActorId: string, remoteActorUrl: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`🌐 Unfollowing remote actor: ${remoteActorUrl}`);
    
    const { data, error } = await supabase.functions.invoke('send-follow', {
      body: {
        localActorId,
        remoteActorUrl,
        action: 'unfollow'
      }
    });
    
    if (error) {
      console.error('Error sending unfollow:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Unfollow request sent:', data);
    return { success: true };
  } catch (error) {
    console.error('Error unfollowing remote actor:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
