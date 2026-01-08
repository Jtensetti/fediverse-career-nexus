import { supabase } from "@/integrations/supabase/client";

export interface AuthorFollow {
  id: string;
  follower_id: string;
  author_id: string;
  created_at: string;
}

export interface AuthorWithProfile {
  id: string;
  username: string | null;
  fullname: string | null;
  avatar_url: string | null;
  headline: string | null;
}

export const followAuthor = async (authorId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('author_follows')
    .insert({
      follower_id: user.id,
      author_id: authorId
    });

  if (error) {
    console.error('Error following author:', error);
    return false;
  }
  return true;
};

export const unfollowAuthor = async (authorId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('author_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('author_id', authorId);

  if (error) {
    console.error('Error unfollowing author:', error);
    return false;
  }
  return true;
};

export const isFollowingAuthor = async (authorId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('author_follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('author_id', authorId)
    .maybeSingle();

  if (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
  return !!data;
};

export const getAuthorFollowerCount = async (authorId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('author_follows')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', authorId);

  if (error) {
    console.error('Error getting follower count:', error);
    return 0;
  }
  return count || 0;
};

export const getFollowedAuthors = async (): Promise<AuthorWithProfile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('author_follows')
    .select('author_id')
    .eq('follower_id', user.id);

  if (error || !data) {
    console.error('Error getting followed authors:', error);
    return [];
  }

  const authorIds = data.map(f => f.author_id);
  if (authorIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, fullname, avatar_url, headline')
    .in('id', authorIds);

  if (profileError) {
    console.error('Error getting author profiles:', profileError);
    return [];
  }

  return profiles || [];
};

export const canAccessFullArticle = async (articleAuthorId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // User is the author
  if (user.id === articleAuthorId) return true;

  // Check if following the author
  const isFollowing = await isFollowingAuthor(articleAuthorId);
  if (isFollowing) return true;

  // Check if connected to the author
  const { data: connection } = await supabase
    .from('user_connections')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(user_id.eq.${user.id},connected_user_id.eq.${articleAuthorId}),and(user_id.eq.${articleAuthorId},connected_user_id.eq.${user.id})`)
    .maybeSingle();

  return !!connection;
};
