import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFederatedFeed, type FederatedPost, type FeedType } from "@/services/federationService";
import { getBatchPostData, BatchPostData } from "@/services/batchDataService";
import FederatedPostCard from "./FederatedPostCard";
import PostEditDialog from "./PostEditDialog";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { PostSkeleton } from "./common/skeletons";
import EmptyState from "./common/EmptyState";
import { useAuth } from "@/contexts/AuthContext";

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
  const [batchData, setBatchData] = useState<Map<string, BatchPostData>>(new Map());
  const [batchDataLoading, setBatchDataLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Track which post IDs we've already fetched batch data for to prevent redundant calls
  const fetchedPostIds = useRef<Set<string>>(new Set());
  
  // Determine the effective feed type from either prop
  const effectiveFeedType: FeedType = feedType !== 'all' ? feedType : 
    (sourceFilter === 'local' ? 'local' : 
     sourceFilter === 'remote' ? 'remote' : 
     sourceFilter === 'following' ? 'following' : 'all');
  
  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Use a ref to track offset for the query to avoid stale closure issues
  const currentOffset = useRef(0);
  currentOffset.current = offset;
  
  const { data: posts, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['federatedFeed', limit, offset, effectiveFeedType],
    queryFn: () => getFederatedFeed(limit, offset, effectiveFeedType),
    staleTime: 30000, // 30 seconds
    enabled: true,
  });
  
  // Reset when feed type changes
  useEffect(() => {
    setOffset(0);
    setAllPosts([]);
    setHasMore(true);
    setBatchData(new Map());
    fetchedPostIds.current.clear();
  }, [effectiveFeedType]);
  
  // Memoized batch data fetcher - only fetches posts we haven't fetched before
  const fetchBatchData = useCallback(async (postIds: string[]) => {
    // Filter out posts we've already fetched
    const newPostIds = postIds.filter(id => !fetchedPostIds.current.has(id));
    if (newPostIds.length === 0) return;
    
    // Mark as fetched immediately to prevent duplicate calls
    newPostIds.forEach(id => fetchedPostIds.current.add(id));
    
    setBatchDataLoading(true);
    try {
      const data = await getBatchPostData(newPostIds, user?.id);
      setBatchData(prev => {
        const newMap = new Map(prev);
        data.forEach((value, key) => newMap.set(key, value));
        return newMap;
      });
    } finally {
      setBatchDataLoading(false);
    }
  }, [user?.id]);

  // Process new posts and fetch batch data when posts arrive
  useEffect(() => {
    if (!posts) return;
    
    if (posts.length === 0) {
      if (offset === 0) {
        // Empty feed on first page
        setAllPosts([]);
        setHasMore(false);
        setBatchDataLoading(false);
      } else {
        // No more posts to load
        setHasMore(false);
      }
      return;
    }
    
    // Update allPosts
    setAllPosts(currentPosts => {
      if (offset === 0) {
        return posts;
      }
      
      const existingIds = new Set(currentPosts.map(p => p.id));
      const newPosts = posts.filter(p => !existingIds.has(p.id));
      
      if (newPosts.length === 0) return currentPosts;
      return [...currentPosts, ...newPosts];
    });
    
    if (posts.length < limit) {
      setHasMore(false);
    }
    
    // Fetch batch data for new posts in ONE request
    const postIds = posts.map(p => p.id);
    fetchBatchData(postIds);
  }, [posts, offset, limit, fetchBatchData]);
  
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
    setAllPosts(prev => prev.filter(post => post.id !== postId));
    queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
  };

  const handlePostUpdated = () => {
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
  
  // Show loading state during initial load OR while fetching first batch data
  const showInitialLoading = (isLoading && offset === 0) || (offset === 0 && batchDataLoading && allPosts.length > 0 && batchData.size === 0);

  return (
    <div className={`${className}`}>
      {showInitialLoading && allPosts.length === 0 ? (
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
              initialData={batchData.get(post.id)}
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
