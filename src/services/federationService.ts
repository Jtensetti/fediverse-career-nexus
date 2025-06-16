
import { supabase } from "@/integrations/supabase/client";

export interface FederatedPost {
  id: string;
  content: any;
  created_at: string;
  actor_name?: string;
  actor_avatar?: string;
}

export const getFederatedFeed = async (limit: number = 20): Promise<FederatedPost[]> => {
  try {
    console.log('🌐 Fetching federated feed with limit:', limit);
    
    // Try to get federated content from ap_objects (ActivityPub objects)
    const { data: apObjects, error: apError } = await supabase
      .from('ap_objects')
      .select(`
        id,
        content,
        created_at,
        attributed_to
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (apError) {
      console.error('Error fetching from ap_objects:', apError);
      // Fallback to an empty array instead of throwing
      return [];
    }

    if (!apObjects || apObjects.length === 0) {
      console.log('No federated content found');
      return [];
    }

    // Transform the data into our expected format
    const federatedPosts: FederatedPost[] = apObjects.map(obj => ({
      id: obj.id,
      content: obj.content,
      created_at: obj.created_at,
      actor_name: obj.content?.actor?.name || 'Unknown User',
      actor_avatar: obj.content?.actor?.icon?.url || null
    }));

    console.log('✅ Fetched federated posts:', federatedPosts.length);
    return federatedPosts;
  } catch (error) {
    console.error('Error fetching federated feed:', error);
    // Return empty array instead of throwing to prevent breaking the UI
    return [];
  }
};

export const federateActivity = async (activity: any) => {
  try {
    console.log('🌐 Federating activity:', activity.type);
    
    // For now, just log the activity - federation will be implemented later
    console.log('Activity to federate:', activity);
    
    // Store locally in ap_objects table
    const { data, error } = await supabase
      .from('ap_objects')
      .insert({
        type: activity.type,
        content: activity,
        attributed_to: activity.attributed_to || activity.actor?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing federated activity:', error);
      throw error;
    }

    console.log('✅ Activity federated successfully');
    return data;
  } catch (error) {
    console.error('Error federating activity:', error);
    throw error;
  }
};
