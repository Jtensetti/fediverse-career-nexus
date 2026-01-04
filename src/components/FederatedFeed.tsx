
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFederatedFeed, type FederatedPost } from "@/services/federationService";
import FederatedPostCard from "./FederatedPostCard";
import PostEditDialog from "./PostEditDialog";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { PostSkeleton } from "./common/skeletons";
import EmptyState from "./common/EmptyState";

interface FederatedFeedProps {
  limit?: number;
  className?: string;
  sourceFilter?: string;
}

export default function FederatedFeed({ limit = 10, className = "", sourceFilter = "all" }: FederatedFeedProps) {
  const [allPosts, setAllPosts] = useState<FederatedPost[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [editingPost, setEditingPost] = useState<FederatedPost | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Track loaded post IDs to prevent duplicates
  const loadedIds = useMemo(() => new Set(allPosts.map(p => p.id)), [allPosts]);
  
  const { data: posts, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['federatedFeed', limit, offset],
    queryFn: () => getFederatedFeed(limit, offset),
  });
  
  // Reset when source filter changes
  useEffect(() => {
    setOffset(0);
    setAllPosts([]);
    setHasMore(true);
  }, [sourceFilter]);
  
  // Process new posts when they arrive
  useEffect(() => {
    if (posts) {
      // Filter posts based on sourceFilter
      const filteredPosts = sourceFilter === "all" 
        ? posts 
        : posts.filter(post => (post.source || 'local') === sourceFilter);
      
      if (offset === 0) {
        // First page - replace all posts
        setAllPosts(filteredPosts);
      } else {
        // Subsequent pages - append only new posts (deduplicate by ID)
        setAllPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = filteredPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      }
      
      // Check if we've reached the end
      if (filteredPosts.length < limit) {
        setHasMore(false);
      }
    }
  }, [posts, offset, sourceFilter, limit]);
  
  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setOffset(prev => prev + limit);
    }
  };

  const handleEditPost = (post: FederatedPost) => {
    setEditingPost(post);
    setEditOpen(true);
  };

  const handleDeletePost = (postId: string) => {
    // Remove the deleted post from the local state
    setAllPosts(prev => prev.filter(post => post.id !== postId));
    // Invalidate and refetch to ensure we have the latest data
    queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
  };

  const handlePostUpdated = () => {
    // Reset and refetch the feed
    setOffset(0);
    setAllPosts([]);
    queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
    refetch();
  };
  
  if (error) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <p className="text-destructive mb-2">Error loading federated posts</p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <div className={`${className}`}>
      {isLoading && offset === 0 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : allPosts.length > 0 ? (
        <>
          {allPosts.map((post, index) => (
            <FederatedPostCard
              key={`${post.id}-${index}`}
              post={post}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
            />
          ))}
          
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleLoadMore}
                disabled={isFetching}
                variant="outline"
                className="w-full max-w-md"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
          <PostEditDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            post={editingPost}
            onUpdated={handlePostUpdated}
          />
        </>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title="This feed is still warming up"
          description="You're early – that's a good thing! Be the first to share something with the network."
        />
      )}
    </div>
  );
}
