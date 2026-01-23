import { supabase } from "@/integrations/supabase/client";

export interface ActivityItem {
  id: string;
  type: 'boost' | 'like' | 'quote';
  created_at: string;
  user_id: string;
  originalPost: {
    id: string;
    content: string;
  };
}

export const getUserActivity = async (userId?: string): Promise<ActivityItem[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) return [];

    // Fetch boosts by this user
    const { data: boosts } = await supabase
      .from('post_boosts')
      .select(`
        id,
        created_at,
        post_id,
        user_id
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch likes by this user
    const { data: likes } = await supabase
      .from('post_reactions')
      .select(`
        id,
        created_at,
        post_id,
        user_id,
        emoji
      `)
      .eq('user_id', targetUserId)
      .eq('emoji', '❤️')
      .order('created_at', { ascending: false })
      .limit(50);

    // Get all unique post IDs
    const postIds = [
      ...(boosts?.map(b => b.post_id) || []),
      ...(likes?.map(l => l.post_id) || [])
    ].filter(Boolean);

    if (postIds.length === 0) return [];

    // Fetch the original posts - just get content for preview
    const { data: posts } = await supabase
      .from('ap_objects')
      .select(`
        id,
        content
      `)
      .in('id', postIds);

    // Create a map of posts for easy lookup
    const postsMap = new Map(posts?.map(p => {
      const raw = p.content as any;
      const note = raw?.type === 'Create' ? raw.object : raw;
      
      return [p.id, {
        id: p.id,
        content: note?.content || ''
      }];
    }) || []);

    // Transform boosts into activity items
    const boostActivities: ActivityItem[] = (boosts || [])
      .filter(b => postsMap.has(b.post_id))
      .map(b => ({
        id: `boost-${b.id}`,
        type: 'boost' as const,
        created_at: b.created_at,
        user_id: b.user_id,
        originalPost: postsMap.get(b.post_id)!
      }));

    // Transform likes into activity items
    const likeActivities: ActivityItem[] = (likes || [])
      .filter(l => postsMap.has(l.post_id))
      .map(l => ({
        id: `like-${l.id}`,
        type: 'like' as const,
        created_at: l.created_at,
        user_id: l.user_id,
        originalPost: postsMap.get(l.post_id)!
      }));

    // Combine and sort by date
    const allActivities = [...boostActivities, ...likeActivities]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allActivities;
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return [];
  }
};
