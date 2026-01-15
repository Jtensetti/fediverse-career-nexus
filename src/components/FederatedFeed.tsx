
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFederatedFeed, type FederatedPost, type FeedType } from "@/services/federationService";
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
  feedType?: FeedType;
}

export default function FederatedFeed({ limit = 10, className = "", sourceFilter = "all", feedType = "all" }: FederatedFeedProps) {
  const [allPosts, setAllPosts] = useState<FederatedPost[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [editingPost, setEditingPost] = useState<FederatedPost | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Track loaded post IDs to prevent duplicates
  const loadedIds = useMemo(() => new Set(allPosts.map(p => p.id)), [allPosts]);
  
  // Determine the effective feed type from either prop
  const effectiveFeedType: FeedType = feedType !== 'all' ? feedType : 
    (sourceFilter === 'local' ? 'local' : 
     sourceFilter === 'remote' ? 'remote' : 
     sourceFilter === 'following' ? 'following' : 'all');
  
  // Track which offset the current query is for
  const [queryOffset, setQueryOffset] = useState(0);
  
  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const { data: posts, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['federatedFeed', limit, offset, effectiveFeedType],
    queryFn: () => {
      // Capture offset at query time
      setQueryOffset(offset);
      return getFederatedFeed(limit, offset, effectiveFeedType);
    },
  });
  
  // Reset when feed type changes
  useEffect(() => {
    setOffset(0);
    setAllPosts([]);
    setHasMore(true);
    setQueryOffset(0);
  }, [effectiveFeedType]);
  
  // Process new posts when they arrive - remove offset from dependencies
  useEffect(() => {
    if (!posts || posts.length === 0) {
      if (posts && posts.length === 0 && queryOffset === 0) {
        // Empty feed on first page
        setAllPosts([]);
        setHasMore(false);
      }
      return;
    }
    
    setAllPosts(currentPosts => {
      // For first page (queryOffset === 0), replace entirely
      if (queryOffset === 0) {
        return posts;
      }
      
      // For pagination, deduplicate and append
      const existingIds = new Set(currentPosts.map(p => p.id));
      const newPosts = posts.filter(p => !existingIds.has(p.id));
      
      // Only append if we actually have new posts
      if (newPosts.length === 0) return currentPosts;
      return [...currentPosts, ...newPosts];
    });
    
    // Check if we've reached the end
    if (posts.length < limit) {
      setHasMore(false);
    }
  }, [posts, queryOffset, limit]);
  
  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isFetching) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          setOffset(prev => prev + limit);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    observer.observe(loadMoreRef.current);
    
    return () => observer.disconnect();
  }, [hasMore, isFetching, limit]);

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
            <div ref={loadMoreRef} className="mt-4 flex justify-center py-4">
              {isFetching && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading more posts...</span>
                </div>
              )}
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
