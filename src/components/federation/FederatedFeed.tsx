import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFederatedFeed, type FederatedPost, type FeedType } from "@/services/federation/federationService";
import { getBatchPostData, BatchPostData } from "@/services/misc/batchDataService";
import FederatedPostCard from "./FederatedPostCard";
import PostEditDialog from "../posts/PostEditDialog";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { PostSkeleton } from "../common/skeletons";
import EmptyState from "../common/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import PullToRefresh from "../common/PullToRefresh";

interface FederatedFeedProps {
  limit?: number;
  className?: string;
  sourceFilter?: string;
  feedType?: FeedType;
}

const findScrollableParent = (el: HTMLElement | null): HTMLElement | null => {
  let current: HTMLElement | null = el?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === "auto" || overflowY === "scroll") && current.scrollHeight > current.clientHeight;
    if (isScrollable) return current;
    current = current.parentElement;
  }
  return null;
};

export default function FederatedFeed({ limit = 10, className = "", sourceFilter = "following", feedType = "following" }: FederatedFeedProps) {
  const { t } = useTranslation();
  const [allPosts, setAllPosts] = useState<FederatedPost[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [editingPost, setEditingPost] = useState<FederatedPost | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [batchData, setBatchData] = useState<Map<string, BatchPostData>>(new Map());
  const [batchDataLoading, setBatchDataLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  // Track which post IDs we've already fetched batch data for to prevent redundant calls
  const fetchedPostIds = useRef<Set<string>>(new Set());
  
  // Determine the effective feed type from either prop
  const effectiveFeedType: FeedType = feedType !== 'following' ? feedType : 
    (sourceFilter === 'local' ? 'local' : 
     sourceFilter === 'federated' ? 'federated' : 'following');

  const offsetStep = limit;

  // Refs for infinite scroll
  const isFetchingRef = useRef(false);
  const loadMoreLockRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  // Fetch local posts
  const { data: posts, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['federatedFeed', limit, offset, effectiveFeedType, user?.id],
    queryFn: () => getFederatedFeed(limit, offset, effectiveFeedType, user?.id),
    staleTime: 30000,
    enabled: !authLoading, // Wait for auth to resolve before querying
  });

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
  }, [effectiveFeedType, user?.id]);
  
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

  useEffect(() => {
    if (!posts) return;
    setAllPosts(current => offset === 0 ? posts : [...new Map([...current, ...posts].map(post => [post.id, post])).values()]);
    setHasMore(posts.length === limit);
    if (posts.length) void fetchBatchData(posts.map(post => post.id));
  }, [posts, offset, limit, fetchBatchData]);

  // Load more function - guarded against double calls
  const loadMore = useCallback(() => {
    if (loadMoreLockRef.current || isFetchingRef.current || !hasMore) return;
    loadMoreLockRef.current = true;
    setOffset(prev => prev + offsetStep);
  }, [hasMore, offsetStep]);
  
  // Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    
    // Don't observe if no more posts to load
    if (!hasMore) return;
    
    // Create new observer
    const scrollRoot = findScrollableParent(sentinelRef.current);
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingRef.current && !loadMoreLockRef.current) {
          loadMore();
        }
      },
      { 
        // If the feed is rendered inside an overflow container (e.g. homepage preview),
        // observe relative to that container; otherwise fall back to viewport.
        root: scrollRoot,
        threshold: 0,
        rootMargin: '400px' // Start loading before reaching the end
      }
    );
    
    // Observe the sentinel element if it exists
    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadMore, allPosts.length]); // Re-attach when posts change

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
    await refetch();
  }, [queryClient, refetch]);
  
  if (error) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <p className="text-destructive mb-2">{t("feed.errorLoading")}</p>
        <Button onClick={() => refetch()} variant="outline">
          {t("feed.tryAgain")}
        </Button>
      </div>
    );
  }
  
  const showInitialLoading = (isLoading && offset === 0) || (offset === 0 && batchDataLoading && allPosts.length > 0 && batchData.size === 0);

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
      <div className={className}>
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
              <div ref={sentinelRef} className="mt-4 flex flex-col items-center gap-3 py-4">
                {isFetching ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("feed.loadingMore")}</span>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadMore}
                    className="text-muted-foreground"
                  >
                    {t("feed.loadMore")}
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
            title={effectiveFeedType === 'following' 
              ? "Anslut för att se något här" 
              : "Flödet värms fortfarande upp"}
            description={effectiveFeedType === 'following'
              ? "Följ personer eller anslut till andra för att se deras inlägg i detta flöde."
              : "Du är tidig – det är bra! Bli den första att dela något med nätverket."}
            action={{
              label: "Uppdatera",
              onClick: () => {
                refetch();
              }
            }}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
