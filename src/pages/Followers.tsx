import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FollowerUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
}

const fetchFollowers = async (userId: string): Promise<FollowerUser[]> => {
  // Get all users who follow this user
  const { data: follows, error } = await supabase
    .from('author_follows')
    .select('follower_id')
    .eq('author_id', userId);

  if (error || !follows?.length) return [];

  const followerIds = follows.map(f => f.follower_id);

  // Fetch profile data for followers
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, fullname, avatar_url, headline')
    .in('id', followerIds);

  return (profiles || []).map(p => ({
    id: p.id,
    username: p.username || p.id,
    displayName: p.fullname || p.username || 'Unknown',
    avatarUrl: p.avatar_url,
    headline: p.headline,
  }));
};

const fetchProfileName = async (userId: string): Promise<string> => {
  const { data } = await supabase
    .from('profiles')
    .select('fullname, username')
    .eq('id', userId)
    .single();
  
  return data?.fullname || data?.username || 'User';
};

const FollowersPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: followers, isLoading } = useQuery({
    queryKey: ['followers', userId],
    queryFn: () => fetchFollowers(userId!),
    enabled: !!userId,
  });

  const { data: profileName } = useQuery({
    queryKey: ['profileName', userId],
    queryFn: () => fetchProfileName(userId!),
    enabled: !!userId,
  });

  const isOwnProfile = user?.id === userId;

  return (
    <DashboardLayout>
      <div className="container max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/profile/${userId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {t("profile.stats.followers", "Followers")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isOwnProfile 
                ? t("followers.yourFollowers", "People who follow you")
                : t("followers.userFollowers", "People who follow {{name}}", { name: profileName })}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-card rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : followers?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {isOwnProfile 
                ? t("followers.noFollowersYet", "You don't have any followers yet")
                : t("followers.noFollowers", "No followers yet")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {followers?.map((follower) => (
              <div key={follower.id} className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-sm">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={follower.avatarUrl || undefined} alt={follower.displayName} />
                  <AvatarFallback>{follower.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/profile/${follower.username}`} 
                    className="font-semibold hover:underline block truncate"
                  >
                    {follower.displayName}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">
                    {follower.headline || `@${follower.username}`}
                  </p>
                </div>
                {user && user.id !== follower.id && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/messages/${follower.id}`}>
                      <MessageSquare className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FollowersPage;
