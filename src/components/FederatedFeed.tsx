import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFederatedFeed, fetchRemoteHomeTimeline, type FederatedPost, type FeedType } from "@/services/federationService";
import { getBatchPostData, BatchPostData } from "@/services/batchDataService";
import FederatedPostCard from "./FederatedPostCard";
import PostEditDialog from "./PostEditDialog";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Globe } from "lucide-react";
import { PostSkeleton } from "./common/skeletons";
import EmptyState from "./common/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import PullToRefresh from "./common/PullToRefresh";

interface FederatedFeedProps {
  limit?: number;
  className?: string;
  sourceFilter?: string;
  feedType?: FeedType;
}

export default function FederatedFeed({ limit = 10, className = "", sourceFilter = "following", feedType = "following" }: FederatedFeedProps) {
  const [allPosts, setAllPosts] = useState<FederatedPost[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [editingPost, setEditingPost] = useState<FederatedPost | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [batchData, setBatchData] = useState<Map<string, BatchPostData>>(new Map());
  const [batchDataLoading, setBatchDataLoading] = useState(false);
  const [remoteInstance, setRemoteInstance] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Track which post IDs we've already fetched batch data for to prevent redundant calls
  const fetchedPostIds = useRef<Set<string>>(new Set());
  
  // Determine the effective feed type from either prop
  const effectiveFeedType: FeedType = feedType !== 'following' ? feedType : 
    (sourceFilter === 'local' ? 'local' : 
     sourceFilter === 'federated' ? 'federated' : 'following');
  
  // Refs for infinite scroll
  const isFetchingRef = useRef(false);
  const loadMoreLockRef = useRef(false);
  
  // Fetch local posts
  const { data: posts, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['federatedFeed', limit, offset, effectiveFeedType, user?.id],
    queryFn: () => getFederatedFeed(limit, offset, effectiveFeedType, user?.id),
    staleTime: 30000,
    enabled: true,
  });

  // Fetch remote posts for federated feed
  const { data: remoteData, isLoading: remoteLoading } = useQuery({
    queryKey: ['remoteHomeTimeline', limit],
    queryFn: async () => {
      const result = await fetchRemoteHomeTimeline(limit);
      if (result.instance) {
        setRemoteInstance(result.instance);
      }
      return result;
    },
    staleTime: 60000, // Cache for 1 minute
    enabled: effectiveFeedType === 'federated' && !!user,
  });
  
  const remotePosts = remoteData?.posts || [];
  const remoteError = remoteData?.error;
  const tokenExpired = remoteData?.tokenExpired;
  
  // Keep refs in sync with state
  isFetchingRef.current = isFetching;
  
  // Reset lock when fetch completes
  useEffect(() => {
    if (!isFetching) {
      loadMoreLockRef.current = false;
    }
  }, [isFetching]);
  
  // Reset when feed type changes
  useEffect(() => {
    setOffset(0);
    setAllPosts([]);
    setHasMore(true);
    setBatchData(new Map());
    fetchedPostIds.current.clear();
    loadMoreLockRef.current = false;
  }, [effectiveFeedType]);
  
  // Memoized batch data fetcher
  const fetchBatchData = useCallback(async (postIds: string[]) => {
    const newPostIds = postIds.filter(id => !fetchedPostIds.current.has(id));
    if (newPostIds.length === 0) return;
    
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

  // Process new posts when they arrive (merge local and remote for federated feed)
  // Use a ref to track previous posts to prevent unnecessary re-renders
  const prevPostsRef = useRef<string>("");
  const prevRemotePostsRef = useRef<string>("");
  
  useEffect(() => {
    // Create a stable key to compare posts
    const postsKey = posts ? posts.map(p => p.id).join(',') : '';
    const remotePostsKey = remotePosts ? remotePosts.map(p => p.id).join(',') : '';
    
    // Skip if nothing changed
    if (postsKey === prevPostsRef.current && remotePostsKey === prevRemotePostsRef.current) {
      return;
    }
    
    prevPostsRef.current = postsKey;
    prevRemotePostsRef.current = remotePostsKey;
    
    // Combine local posts with remote posts for federated feed
    let combinedPosts: FederatedPost[] = [];
    
    if (effectiveFeedType === 'federated') {
      // Merge local and remote posts, sort by date
      const localPosts = posts || [];
      const remotePostsList = remotePosts || [];
      
      combinedPosts = [...localPosts, ...remotePostsList].sort((a, b) => {
        const dateA = new Date(a.published_at || a.created_at).getTime();
        const dateB = new Date(b.published_at || b.created_at).getTime();
        return dateB - dateA;
      });
    } else {
      combinedPosts = posts || [];
    }
    
    if (combinedPosts.length === 0) {
      if (offset === 0) {
        setAllPosts([]);
        setHasMore(effectiveFeedType !== 'federated'); // Don't show "load more" for federated if empty
        setBatchDataLoading(false);
      } else {
        setHasMore(false);
      }
      return;
    }
    
    setAllPosts(currentPosts => {
      if (offset === 0) {
        return combinedPosts;
      }
      
      const existingIds = new Set(currentPosts.map(p => p.id));
      const newPosts = combinedPosts.filter(p => !existingIds.has(p.id));
      
      if (newPosts.length === 0) return currentPosts;
      return [...currentPosts, ...newPosts];
    });
    
    if ((posts?.length || 0) < limit) {
      setHasMore(false);
    }
    
    // Only fetch batch data for local posts (remote posts don't have local IDs)
    const localPostIds = (posts || []).map(p => p.id);
    if (localPostIds.length > 0) {
      fetchBatchData(localPostIds);
    }
  }, [posts, remotePosts, offset, limit, fetchBatchData, effectiveFeedType]);
  
  // Load more function - guarded against double calls
  const loadMore = useCallback(() => {
    if (loadMoreLockRef.current || isFetchingRef.current || !hasMore) return;
    loadMoreLockRef.current = true;
    setOffset(prev => prev + limit);
  }, [hasMore, limit]);
  
  // Callback ref for sentinel - attaches observer when element mounts
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || !hasMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { 
        root: null,
        threshold: 0.1, 
        rootMargin: '300px'
      }
    );
    
    observer.observe(node);
    
    // Cleanup when node unmounts - store observer on node for cleanup
    (node as any)._infiniteScrollObserver?.disconnect();
    (node as any)._infiniteScrollObserver = observer;
    
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

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

  const handlePullRefresh = useCallback(async () => {
    setOffset(0);
    setAllPosts([]);
    fetchedPostIds.current.clear();
    loadMoreLockRef.current = false;
    await queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
    await queryClient.invalidateQueries({ queryKey: ['remoteHomeTimeline'] });
    await refetch();
  }, [queryClient, refetch]);
  
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
  
  const showInitialLoading = ((isLoading || (effectiveFeedType === 'federated' && remoteLoading)) && offset === 0) || (offset === 0 && batchDataLoading && allPosts.length > 0 && batchData.size === 0);

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
      <div className={className}>
        {/* Show token expired warning for federated feed */}
        {effectiveFeedType === 'federated' && tokenExpired && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-sm text-destructive">
            <Globe className="h-4 w-4" />
            <span>Your {remoteInstance} session has expired. Please re-authenticate to see remote posts.</span>
          </div>
        )}
        
        {/* Show remote instance indicator for federated feed */}
        {effectiveFeedType === 'federated' && remoteInstance && !tokenExpired && remotePosts.length > 0 && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Including {remotePosts.length} posts from your {remoteInstance} timeline</span>
          </div>
        )}
        
        {/* Show remote error if any (not token expired) */}
        {effectiveFeedType === 'federated' && remoteError && !tokenExpired && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Could not fetch from {remoteInstance}: {remoteError}</span>
          </div>
        )}
        
        {showInitialLoading && allPosts.length === 0 ? (
          <div className="space-y-4">
            {effectiveFeedType === 'federated' && remoteLoading && (
              <div className="p-3 bg-muted/30 rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Fetching posts from your Fediverse instance...</span>
              </div>
            )}
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
              <div ref={sentinelRef} className="mt-4 flex flex-col items-center gap-3 py-4">
                {isFetching ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading more posts...</span>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadMore}
                    className="text-muted-foreground"
                  >
                    Load more
                  </Button>
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
    </PullToRefresh>
  );
}