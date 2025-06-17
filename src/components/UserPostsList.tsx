import { useQuery, useQueryClient } from "@tanstack/react-query";
import FederatedPostCard from "./FederatedPostCard";
import PostEditDialog from "./PostEditDialog";
import { getUserPosts, type UserPostWithMeta } from "@/services/postService";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface UserPostsListProps {
  userId?: string;
  className?: string;
}

export default function UserPostsList({ userId, className = "" }: UserPostsListProps) {
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: posts, isLoading, error, refetch } = useQuery<UserPostWithMeta[]>({
    queryKey: ["userPosts", userId],
    queryFn: () => getUserPosts(userId),
  });

  useEffect(() => {
    // refetch when userId changes
    refetch();
  }, [userId, refetch]);

  const handleEditPost = (post: any) => {
    setEditingPost(post);
    setEditOpen(true);
  };

  const handleDeletePost = () => {
    queryClient.invalidateQueries({ queryKey: ["userPosts", userId] });
    refetch();
  };

  const handlePostUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["userPosts", userId] });
    queryClient.invalidateQueries({ queryKey: ["federatedFeed"] });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Failed to load posts</div>;
  }

  if (!posts || posts.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No posts yet</div>;
  }

  return (
    <>
      <div className={className}>
        {posts.map((post) => (
          <FederatedPostCard
            key={post.id}
            post={{
              id: post.id,
              content: post.isQuoteRepost
                ? {
                    content: post.content,
                    isQuoteRepost: true,
                    object: post.quotedPost,
                  }
                : { content: post.content },
              created_at: post.created_at,
              actor_name: post.author?.fullname || post.author?.username || "Unknown User",
              actor_avatar: post.author?.avatar_url,
              user_id: post.user_id,
              profile: {
                fullname: post.author?.fullname,
                username: post.author?.username,
                avatar_url: post.author?.avatar_url,
              },
              source: "local",
              type: post.type || "Note",
            }}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
          />
        ))}
      </div>

      <PostEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        post={editingPost}
        onUpdated={handlePostUpdated}
      />
    </>
  );
}