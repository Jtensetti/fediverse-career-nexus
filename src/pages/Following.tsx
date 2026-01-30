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

interface FollowingUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
}

const fetchFollowing = async (userId: string): Promise<FollowingUser[]> => {
  // Get all users this user follows
  const { data: follows, error } = await supabase
    .from('author_follows')
    .select('author_id')
    .eq('follower_id', userId);

  if (error || !follows?.length) return [];

  const followingIds = follows.map(f => f.author_id);

  // Fetch profile data for following from public_profiles view (bypasses RLS)
  const { data: profiles } = await supabase
    .from('public_profiles')
    .select('id, username, fullname, avatar_url, headline')
    .in('id', followingIds);

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
    .from('public_profiles')
    .select('fullname, username')
    .eq('id', userId)
    .single();
  
  return data?.fullname || data?.username || 'User';
};

const FollowingPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: following, isLoading } = useQuery({
    queryKey: ['following', userId],
    queryFn: () => fetchFollowing(userId!),
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
              {t("profile.stats.following", "Following")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isOwnProfile 
                ? t("following.yourFollowing", "People you follow")
                : t("following.userFollowing", "People {{name}} follows", { name: profileName })}
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
        ) : following?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {isOwnProfile 
                ? t("following.noFollowingYet", "You're not following anyone yet")
                : t("following.noFollowing", "Not following anyone yet")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {following?.map((followedUser) => (
              <div key={followedUser.id} className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-sm">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={followedUser.avatarUrl || undefined} alt={followedUser.displayName} />
                  <AvatarFallback>{followedUser.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/profile/${followedUser.username}`} 
                    className="font-semibold hover:underline block truncate"
                  >
                    {followedUser.displayName}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">
                    {followedUser.headline || `@${followedUser.username}`}
                  </p>
                </div>
                {user && user.id !== followedUser.id && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/messages/${followedUser.id}`}>
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

export default FollowingPage;
