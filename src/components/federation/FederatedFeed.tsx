import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFederatedFeed, type FederatedPost } from "@/services/federation/federationService";
import { getBatchPostData } from "@/services/misc/batchDataService";
import { getFeedPreferences } from "@/services/misc/feedPreferencesService";
import FederatedPostCard from "./FederatedPostCard";
import PostEditDialog from "../posts/PostEditDialog";
import { Button } from "@/components/ui/button";
import { PostSkeleton } from "../common/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import PullToRefresh from "../common/PullToRefresh";

interface FederatedFeedProps {
  limit?: number;
  className?: string;
  sourceFilter?: string;
  feedType?: string;
  onExploreNolto?: () => void;
}

export default function FederatedFeed({ limit = 20, className, sourceFilter = "following", feedType, onExploreNolto }: FederatedFeedProps) {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<FederatedPost | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const selection = feedType ?? sourceFilter;
  const { data: preferences } = useQuery({
    queryKey: ['feedPreferences', user?.id], queryFn: getFeedPreferences, enabled: !!user,
  });
  const feed = useInfiniteQuery({
    queryKey: ['federatedFeed', user?.id, selection, limit, preferences?.updated_at],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getFederatedFeed(limit, pageParam, selection, user?.id),
    getNextPageParam: (page, pages) => page.length === limit ? pages.length * limit : undefined,
    enabled: !authLoading && !!user,
    staleTime: 30_000,
  });
  const posts = [...new Map((feed.data?.pages.flat() ?? []).map(post => [post.id, post])).values()];
  const ids = posts.map(post => post.id);
  const { data: batchData } = useQuery({
    queryKey: ['feedPostDetails', user?.id, ids],
    queryFn: () => getBatchPostData(ids, user?.id),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
  const { fetchNextPage, hasNextPage, isFetching } = feed;
  useEffect(() => {
    if (!preferences?.infinite_scroll || !sentinel.current || !hasNextPage || isFetching) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) void fetchNextPage();
    }, { rootMargin: '200px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [preferences?.infinite_scroll, hasNextPage, isFetching, fetchNextPage]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
    await queryClient.invalidateQueries({ queryKey: ['feedPostDetails'] });
  }

  return <PullToRefresh onRefresh={refresh}>
    <div className={className} aria-busy={feed.isFetching}>
      {feed.isPending ? <div className="space-y-4"><PostSkeleton /><PostSkeleton /></div> : <>
        {posts.map(post => <FederatedPostCard key={post.id} post={post}
          onEdit={setEditingPost} onDelete={() => void refresh()} initialData={batchData?.get(post.id)} />)}
        {feed.isError ? <div role="alert" className="py-8 text-center space-y-3">
          <p>{t('feed.errorLoading')}</p>
          <Button variant="outline" onClick={() => feed.isFetchNextPageError ? feed.fetchNextPage() : feed.refetch()}>{t('feed.tryAgain')}</Button>
        </div> : posts.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center">
          <h2 className="font-semibold">{t(selection === 'following' ? 'personalFeeds.followingEmptyTitle' : 'personalFeeds.emptyTitle')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t(selection === 'following' ? 'personalFeeds.followingEmptyDescription' : 'personalFeeds.emptyDescription')}</p>
          {selection === 'following' && <div className="mt-4 flex flex-wrap justify-center gap-2">
            {onExploreNolto && <Button onClick={onExploreNolto}>{t('personalFeeds.exploreNolto')}</Button>}
            <Button asChild variant="outline"><Link to="/search">{t('personalFeeds.findPeople')}</Link></Button>
          </div>}
        </div> : null}
        {feed.hasNextPage && !feed.isError && <div ref={sentinel} className="py-6 text-center">
          <Button variant="outline" disabled={feed.isFetching} onClick={() => feed.fetchNextPage()}>
            {feed.isFetchingNextPage ? t('feed.loadingMore') : t('feed.loadMore')}
          </Button>
        </div>}
      </>}
      <PostEditDialog open={!!editingPost} onOpenChange={open => { if (!open) setEditingPost(null); }}
        post={editingPost} onUpdated={() => { setEditingPost(null); void refresh(); }} />
    </div>
  </PullToRefresh>;
}
