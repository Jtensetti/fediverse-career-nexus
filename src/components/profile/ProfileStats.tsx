import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileStatsProps {
  userId: string;
}

interface StatsData {
  posts: number;
  following: number;
  followers: number;
}

const fetchProfileStats = async (userId: string): Promise<StatsData> => {
  // Fetch all counts in parallel
  const [followsRes, followersRes, postsRes] = await Promise.all([
    // Get all follows involving this user to calculate following
    supabase
      .from('author_follows')
      .select('author_id, follower_id')
      .eq('follower_id', userId),
    
    // Get followers count from author_follows table
    supabase
      .from('author_follows')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId),
    
    // Get posts count - need to get actor first, then count posts
    (async () => {
      const { data: actor } = await supabase
        .from('actors')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (!actor) return { count: 0 };
      
      const { count } = await supabase
        .from('ap_objects')
        .select('*', { count: 'exact', head: true })
        .eq('attributed_to', actor.id)
        .eq('type', 'Note');
      
      return { count: count || 0 };
    })(),
  ]);

  // Calculate following count
  const followingCount = followsRes.data?.length || 0;

  return {
    posts: (postsRes as { count: number }).count || 0,
    following: followingCount,
    followers: followersRes.count || 0,
  };
};

const StatItem = ({ 
  value, 
  label, 
  isLoading,
}: { 
  value: number; 
  label: string;
  isLoading: boolean;
}) => (
  <div className="text-center">
    {isLoading ? (
      <Skeleton className="h-7 w-12 mx-auto" />
    ) : (
      <span className="text-2xl font-bold">{value.toLocaleString()}</span>
    )}
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

export const ProfileStats = ({ userId }: ProfileStatsProps) => {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['profileStats', userId],
    queryFn: () => fetchProfileStats(userId),
    enabled: !!userId,
    staleTime: 30000,
  });

  return (
    <div className="flex items-center gap-6">
      <StatItem
        value={stats?.posts || 0}
        label={t("profile.stats.posts", "posts")}
        isLoading={isLoading}
      />
      <StatItem
        value={stats?.following || 0}
        label={t("profile.stats.following", "following")}
        isLoading={isLoading}
      />
      <StatItem
        value={stats?.followers || 0}
        label={t("profile.stats.followers", "followers")}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ProfileStats;
