import { useQuery } from "@tanstack/react-query";
import FederatedPostCard from "./FederatedPostCard";
import { getUserPosts, type Post } from "@/services/postService";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

interface UserPostsListProps {
  userId?: string;
  className?: string;
}

export default function UserPostsList({ userId, className = "" }: UserPostsListProps) {
  const { data: posts, isLoading, error, refetch } = useQuery<Post[]>({
    queryKey: ["userPosts", userId],
    queryFn: () => getUserPosts(userId),
  });

  useEffect(() => {
    // refetch when userId changes
    refetch();
  }, [userId, refetch]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">Failed to load posts</div>
    );
  }

  if (!posts || posts.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No posts yet</div>;
  }

  return (
    <div className={className}>
      {posts.map((post) => (
        318azu-codex/fix-profile-setup-issue

        <FederatedPostCard
          key={post.id}
          post={{
            id: post.id,
            content: { content: post.content },
            created_at: post.created_at,
            actor_name: post.author?.fullname || post.author?.username,
            actor_avatar: post.author?.avatar_url,
            user_id: post.user_id,
            profile: {
              fullname: post.author?.fullname,
              username: post.author?.username,
              avatar_url: post.author?.avatar_url,
            },
            source: 'local',
            type: 'Note',
          }}
        />
      318azu-codex/fix-profile-setup-issue
      ))}
    </div>
  );
}
