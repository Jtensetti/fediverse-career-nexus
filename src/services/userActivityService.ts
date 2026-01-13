import { supabase } from "@/integrations/supabase/client";

export interface ActivityItem {
  id: string;
  type: 'boost' | 'like';
  created_at: string;
  user_id: string;
  originalPost: {
    id: string;
    content: string;
    author: {
      username: string;
      fullname?: string;
      avatar_url?: string;
    };
  };
  actor: {
    username: string;
    fullname?: string;
    avatar_url?: string;
  };
}

export const getUserActivity = async (userId?: string): Promise<ActivityItem[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) return [];

    // Get the user's actor
    const { data: actor } = await supabase
      .from('actors')
      .select('id, preferred_username')
      .eq('user_id', targetUserId)
      .single();

    if (!actor) return [];

    // Get user profile for display
    const { data: userProfile } = await supabase
      .from('public_profiles')
      .select('username, fullname, avatar_url')
      .eq('id', targetUserId)
      .single();

    // Fetch boosts (Announce type) by this user
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

    // Fetch the original posts
    const { data: posts } = await supabase
      .from('ap_objects')
      .select(`
        id,
        content,
        actors!ap_objects_attributed_to_fkey (
          user_id,
          preferred_username
        )
      `)
      .in('id', postIds);

    // Get author profiles
    const authorUserIds = posts?.map(p => (p.actors as any)?.user_id).filter(Boolean) || [];
    let authorsMap: Record<string, { fullname?: string; username?: string; avatar_url?: string }> = {};
    
    if (authorUserIds.length > 0) {
      const { data: authorProfiles } = await supabase
        .from('public_profiles')
        .select('id, fullname, username, avatar_url')
        .in('id', authorUserIds);

      if (authorProfiles) {
        authorsMap = Object.fromEntries(
          authorProfiles.map(p => [p.id, { 
            fullname: p.fullname || undefined, 
            username: p.username || undefined, 
            avatar_url: p.avatar_url || undefined 
          }])
        );
      }
    }

    // Create a map of posts for easy lookup
    const postsMap = new Map(posts?.map(p => {
      const authorUserId = (p.actors as any)?.user_id;
      const authorProfile = authorUserId ? authorsMap[authorUserId] : undefined;
      const raw = p.content as any;
      const note = raw?.type === 'Create' ? raw.object : raw;
      
      return [p.id, {
        id: p.id,
        content: note?.content || '',
        author: {
          username: authorProfile?.username || (p.actors as any)?.preferred_username || 'Unknown',
          fullname: authorProfile?.fullname,
          avatar_url: authorProfile?.avatar_url
        }
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
        originalPost: postsMap.get(b.post_id)!,
        actor: {
          username: userProfile?.username || actor.preferred_username,
          fullname: userProfile?.fullname || undefined,
          avatar_url: userProfile?.avatar_url || undefined
        }
      }));

    // Transform likes into activity items
    const likeActivities: ActivityItem[] = (likes || [])
      .filter(l => postsMap.has(l.post_id))
      .map(l => ({
        id: `like-${l.id}`,
        type: 'like' as const,
        created_at: l.created_at,
        user_id: l.user_id,
        originalPost: postsMap.get(l.post_id)!,
        actor: {
          username: userProfile?.username || actor.preferred_username,
          fullname: userProfile?.fullname || undefined,
          avatar_url: userProfile?.avatar_url || undefined
        }
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
