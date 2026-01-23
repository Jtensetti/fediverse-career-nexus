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

    // 1. Get user's actor (needed for boosts which use actor_id)
    const { data: actor } = await supabase
      .from('actors')
      .select('id')
      .eq('user_id', targetUserId)
      .maybeSingle();

    // 2. Fetch reactions from the correct 'reactions' table
    const { data: reactions } = await supabase
      .from('reactions')
      .select('id, created_at, target_id, reaction')
      .eq('user_id', targetUserId)
      .eq('target_type', 'post')
      .order('created_at', { ascending: false })
      .limit(50);

    // 3. Fetch boosts from ap_objects (only if user has an actor)
    let boosts: any[] = [];
    let quotes: any[] = [];
    if (actor?.id) {
      // Fetch Announce (boosts)
      const { data: boostData } = await supabase
        .from('ap_objects')
        .select('id, created_at, content')
        .eq('type', 'Announce')
        .eq('attributed_to', actor.id)
        .order('created_at', { ascending: false })
        .limit(50);
      boosts = boostData || [];

      // Fetch Create objects (potential quote reposts - we'll filter for quoteOf)
      const { data: createData } = await supabase
        .from('ap_objects')
        .select('id, created_at, content')
        .eq('type', 'Create')
        .eq('attributed_to', actor.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      // Filter for quote reposts: content.object.quoteOf exists
      quotes = (createData || []).filter(obj => {
        const content = obj.content as any;
        const note = content?.object || content;
        return note?.quoteOf != null;
      });
    }

    // 4. Extract post IDs from boosts (from content.object.id or content.object)
    const boostPostIds = boosts.map(b => {
      const content = b.content as any;
      // Handle both cases: object as string ID or object as full object
      if (typeof content?.object === 'string') {
        return content.object;
      }
      return content?.object?.id;
    }).filter(Boolean);

    // 5. Extract quoted post IDs from quotes
    const quotePostIds = quotes.map(q => {
      const content = q.content as any;
      const note = content?.object || content;
      return note?.quoteOf;
    }).filter(Boolean);

    // 6. Collect all post IDs for content lookup
    const reactionPostIds = reactions?.map(r => r.target_id) || [];
    const allPostIds = [...new Set([...reactionPostIds, ...boostPostIds, ...quotePostIds])];

    if (allPostIds.length === 0) return [];

    // 7. Fetch post content for previews
    const { data: posts } = await supabase
      .from('ap_objects')
      .select('id, content')
      .in('id', allPostIds);

    // 8. Build posts map
    const postsMap = new Map(posts?.map(p => {
      const raw = p.content as any;
      const note = raw?.type === 'Create' ? raw.object : raw;
      return [p.id, { id: p.id, content: note?.content || '' }];
    }) || []);

    // 9. Transform reactions into activity items
    const reactionActivities: ActivityItem[] = (reactions || [])
      .filter(r => postsMap.has(r.target_id))
      .map(r => ({
        id: `reaction-${r.id}`,
        type: 'like' as const,
        created_at: r.created_at,
        user_id: targetUserId,
        originalPost: postsMap.get(r.target_id)!
      }));

    // 10. Transform boosts into activity items
    const boostActivities: ActivityItem[] = boosts
      .map(b => {
        const content = b.content as any;
        const postId = typeof content?.object === 'string' ? content.object : content?.object?.id;
        if (!postId || !postsMap.has(postId)) return null;
        return {
          id: `boost-${b.id}`,
          type: 'boost' as const,
          created_at: b.created_at,
          user_id: targetUserId,
          originalPost: postsMap.get(postId)!
        };
      })
      .filter(Boolean) as ActivityItem[];

    // 11. Transform quotes into activity items
    const quoteActivities: ActivityItem[] = quotes
      .map(q => {
        const content = q.content as any;
        const note = content?.object || content;
        const quotedPostId = note?.quoteOf;
        if (!quotedPostId || !postsMap.has(quotedPostId)) return null;
        return {
          id: `quote-${q.id}`,
          type: 'quote' as const,
          created_at: q.created_at,
          user_id: targetUserId,
          originalPost: postsMap.get(quotedPostId)!
        };
      })
      .filter(Boolean) as ActivityItem[];

    // 12. Combine and sort by date
    return [...reactionActivities, ...boostActivities, ...quoteActivities]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  } catch (error) {
    console.error('Error fetching user activity:', error);
    return [];
  }
};
