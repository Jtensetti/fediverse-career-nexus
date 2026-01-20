import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, FileText, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileStatsProps {
  userId: string;
  username?: string;
}

interface StatsData {
  followers: number;
  following: number;
  posts: number;
  articles: number;
}

const fetchProfileStats = async (userId: string): Promise<StatsData> => {
  // Fetch all counts in parallel
  const [followersRes, followingRes, postsRes, articlesRes] = await Promise.all([
    // Get followers count from author_follows table
    supabase
      .from('author_follows')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId),
    
    // Get following count from author_follows table (users this person follows)
    supabase
      .from('author_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId),
    
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
    
    // Get articles count
    supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('published', true),
  ]);

  return {
    followers: followersRes.count || 0,
    following: followingRes.count || 0,
    posts: (postsRes as { count: number }).count || 0,
    articles: articlesRes.count || 0,
  };
};

const StatItem = ({ 
  icon: Icon, 
  value, 
  label, 
  isLoading 
}: { 
  icon: React.ElementType; 
  value: number; 
  label: string;
  isLoading: boolean;
}) => (
  <div className="flex flex-col items-center gap-1 px-4 py-3">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {isLoading ? (
        <Skeleton className="h-6 w-8" />
      ) : (
        <span className="text-xl font-semibold text-foreground">
          {value.toLocaleString()}
        </span>
      )}
    </div>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export const ProfileStats = ({ userId, username }: ProfileStatsProps) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['profileStats', userId],
    queryFn: () => fetchProfileStats(userId),
    enabled: !!userId,
    staleTime: 30000, // Cache for 30 seconds
  });

  return (
    <div className="flex items-center justify-center divide-x divide-border border-t border-border bg-muted/30 rounded-b-lg -mx-4 md:-mx-6 -mb-6 mt-6">
      <StatItem
        icon={Users}
        value={stats?.followers || 0}
        label="Followers"
        isLoading={isLoading}
      />
      <StatItem
        icon={UserPlus}
        value={stats?.following || 0}
        label="Following"
        isLoading={isLoading}
      />
      <StatItem
        icon={FileText}
        value={stats?.posts || 0}
        label="Posts"
        isLoading={isLoading}
      />
      <StatItem
        icon={BookOpen}
        value={stats?.articles || 0}
        label="Articles"
        isLoading={isLoading}
      />
    </div>
  );
};

export default ProfileStats;
