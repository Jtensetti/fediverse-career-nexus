import { useQuery } from "@tanstack/react-query";
import { getUserActivity, type ActivityItem } from "@/services/userActivityService";
import { Heart, Repeat2, Loader2, Quote } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

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
    <div className={`space-y-3 ${className}`}>
      {activities.map((activity) => (
        <ActivityRow key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

function ActivityRow({ activity }: { activity: ActivityItem }) {
  const getActionDetails = () => {
    switch (activity.type) {
      case 'boost':
        return {
          icon: <Repeat2 className="h-4 w-4 text-primary" />,
          text: 'boosted a post'
        };
      case 'quote':
        return {
          icon: <Quote className="h-4 w-4 text-accent-foreground" />,
          text: 'quoted a post'
        };
      case 'like':
      default:
        return {
          icon: <Heart className="h-4 w-4 text-destructive" />,
          text: 'liked a post'
        };
    }
  };

  const { icon, text } = getActionDetails();
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });

  // Get a preview snippet of the post content (first 60 chars)
  const contentPreview = activity.originalPost.content
    ? activity.originalPost.content.replace(/<[^>]*>/g, '').slice(0, 60) + (activity.originalPost.content.length > 60 ? '...' : '')
    : 'a post';

  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="text-muted-foreground">{text}: </span>
          <Link 
            to={`/post/${activity.originalPost.id}`}
            className="text-foreground hover:text-primary hover:underline"
          >
            "{contentPreview}"
          </Link>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
      </div>
    </div>
  );
}
