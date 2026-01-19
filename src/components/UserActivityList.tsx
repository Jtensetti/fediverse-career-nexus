import { useQuery } from "@tanstack/react-query";
import { getUserActivity, type ActivityItem } from "@/services/userActivityService";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Repeat2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { ProfileHoverCard } from "@/components/common";

interface UserActivityListProps {
  userId?: string;
  className?: string;
}

export default function UserActivityList({ userId, className = "" }: UserActivityListProps) {
  const { data: activities, isLoading, error } = useQuery<ActivityItem[]>({
    queryKey: ["userActivity", userId],
    queryFn: () => getUserActivity(userId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">Failed to load activity</div>
    );
  }

  if (!activities || activities.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No activity yet</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

function ActivityCard({ activity }: { activity: ActivityItem }) {
  const actorName = activity.actor.fullname || activity.actor.username;
  const actionText = activity.type === 'boost' ? 'boosted this post' : 'liked this post';
  const Icon = activity.type === 'boost' ? Repeat2 : Heart;
  const iconColor = activity.type === 'boost' ? 'text-green-500' : 'text-red-500';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Activity header */}
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <ProfileHoverCard username={activity.actor.username}>
            <span className="font-medium text-foreground hover:underline cursor-pointer">
              {actorName}
            </span>
          </ProfileHoverCard>
          <span>{actionText}</span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
        </div>

        {/* Original post */}
        <Link to={`/post/${activity.originalPost.id}`} className="block">
          <div className="pl-6 border-l-2 border-muted">
            <div className="flex items-center gap-2 mb-2">
              <ProfileHoverCard username={activity.originalPost.author.username}>
                <Avatar className="h-6 w-6 aspect-square flex-shrink-0 cursor-pointer">
                  <AvatarImage src={activity.originalPost.author.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {(activity.originalPost.author.fullname || activity.originalPost.author.username || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </ProfileHoverCard>
              <ProfileHoverCard username={activity.originalPost.author.username}>
                <span className="font-medium text-sm hover:underline cursor-pointer">
                  {activity.originalPost.author.fullname || activity.originalPost.author.username}
                </span>
              </ProfileHoverCard>
              <span className="text-muted-foreground text-sm">
                @{activity.originalPost.author.username}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {activity.originalPost.content}
            </p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
