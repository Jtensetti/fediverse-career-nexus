import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, BookOpen, Link2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileStatsProps {
  userId: string;
  username?: string;
  compact?: boolean;
}

interface StatsData {
  connections: number;
  followers: number;
  posts: number;
  articles: number;
}

const fetchProfileStats = async (userId: string): Promise<StatsData> => {
  // Fetch all counts in parallel
  const [followsRes, followersRes, postsRes, articlesRes] = await Promise.all([
    // Get all follows involving this user to calculate mutual connections
    supabase
      .from('author_follows')
      .select('author_id, follower_id')
      .or(`author_id.eq.${userId},follower_id.eq.${userId}`),
    
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
    
    // Get articles count
    supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('published', true),
  ]);

  // Calculate mutual connections from the follows data
  let connectionCount = 0;
  if (followsRes.data && Array.isArray(followsRes.data)) {
    const follows = followsRes.data;
    // Users this person follows
    const following = new Set(follows.filter(f => f.follower_id === userId).map(f => f.author_id));
    // Users who follow this person
    const followers = new Set(follows.filter(f => f.author_id === userId).map(f => f.follower_id));
    // Mutual = intersection (both follow each other)
    connectionCount = [...following].filter(id => followers.has(id)).length;
  }

  return {
    connections: connectionCount,
    followers: followersRes.count || 0,
    posts: (postsRes as { count: number }).count || 0,
    articles: articlesRes.count || 0,
  };
};

const StatItem = ({ 
  icon: Icon, 
  value, 
  label, 
  isLoading,
  compact
}: { 
  icon: React.ElementType; 
  value: number; 
  label: string;
  isLoading: boolean;
  compact?: boolean;
}) => (
  <div className={`flex items-center gap-1.5 ${compact ? 'text-sm' : ''}`}>
    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    {isLoading ? (
      <Skeleton className="h-4 w-6" />
    ) : (
      <span className="font-semibold text-foreground">
        {value.toLocaleString()}
      </span>
    )}
    <span className="text-muted-foreground">{label}</span>
  </div>
);

export const ProfileStats = ({ userId, username, compact = false }: ProfileStatsProps) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['profileStats', userId],
    queryFn: () => fetchProfileStats(userId),
    enabled: !!userId,
    staleTime: 30000,
  });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <StatItem
        icon={Link2}
        value={stats?.connections || 0}
        label="connections"
        isLoading={isLoading}
        compact={compact}
      />
      <StatItem
        icon={Users}
        value={stats?.followers || 0}
        label="followers"
        isLoading={isLoading}
        compact={compact}
      />
      <StatItem
        icon={FileText}
        value={stats?.posts || 0}
        label="posts"
        isLoading={isLoading}
        compact={compact}
      />
      <StatItem
        icon={BookOpen}
        value={stats?.articles || 0}
        label="articles"
        isLoading={isLoading}
        compact={compact}
      />
    </div>
  );
};

export default ProfileStats;
