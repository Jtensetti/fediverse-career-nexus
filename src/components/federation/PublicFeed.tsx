import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowRight, Globe2, MessageCircle, RefreshCw } from "lucide-react";
import { fetchPublicFeed } from "@nolto/public-feed";
import FederatedPostCard from "./FederatedPostCard";
import { Button } from "@/components/ui/button";
import { PostSkeleton } from "@/components/common/skeletons";

const PAGE_SIZE = 12;

export default function PublicFeed() {
  const { t } = useTranslation();
  const [scope, setScope] = useState<"local" | "federated">("local");
  const feed = useInfiniteQuery({
    queryKey: ["publicFeed", scope],
    queryFn: ({ pageParam, signal }) => fetchPublicFeed({ url: import.meta.env.VITE_SUPABASE_URL, publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, { limit: PAGE_SIZE, offset: pageParam, scope, signal }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, offset) => lastPage.length === PAGE_SIZE ? offset + PAGE_SIZE : undefined,
    staleTime: 30_000,
  });
  const posts = [...new Map(feed.data?.pages.flat().map(post => [post.id, post]) ?? []).values()];

  return <section aria-label={t("ui.publicFeed.publicPosts")}>
    <div className="mb-5 flex items-center justify-between gap-3 border-b pb-4">
      <div className="flex gap-1 rounded-full bg-muted p-1" role="group" aria-label={t("ui.publicFeed.chooseFeed")}>
        {(["local", "federated"] as const).map(value => <button key={value} onClick={() => setScope(value)} aria-pressed={scope === value} className={`min-h-10 rounded-full px-4 text-sm font-medium transition-colors ${scope === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {value === "local" ? (t("ui.publicFeed.onNolto")) : (t("ui.publicFeed.acrossTheNetwork"))}
        </button>)}
      </div>
      <Button variant="ghost" size="icon" disabled={feed.isFetching} onClick={() => void feed.refetch()} aria-label={t("ui.publicFeed.refreshFeed")}><RefreshCw className={`h-4 w-4 ${feed.isFetching ? "animate-spin" : ""}`} /></Button>
    </div>
    {feed.isPending ? <div aria-label={t("ui.publicFeed.loadingPosts")} aria-busy="true"><PostSkeleton /><PostSkeleton /></div>
      : feed.isError && !posts.length ? <div className="rounded-2xl border bg-card p-8 text-center" role="alert">
        <h2 className="text-xl">{t("ui.publicFeed.theFeedCouldNot")}</h2>
        <p className="my-4 text-muted-foreground">{t("ui.publicFeed.pleaseTryAgainIn")}</p>
        <Button variant="outline" onClick={() => void feed.refetch()}>{t("ui.publicFeed.tryAgain")}</Button>
      </div>
      : !posts.length ? <div className="rounded-2xl border bg-card px-6 py-14 text-center sm:px-10">
        <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 text-primary"><MessageCircle className="h-8 w-8" aria-hidden="true" /></span>
        <h2 className="font-display text-2xl">{t("ui.publicFeed.conversationsStartHere")}</h2>
        <p className="mx-auto mb-7 mt-4 max-w-sm leading-relaxed text-muted-foreground">{t("ui.publicFeed.thereAreNoPublic")}</p>
        <Button asChild className="rounded-full px-6"><Link to="/auth/signup" state={{ returnTo: "/feed" }}>{t("ui.publicFeed.startAConversation")}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
      : <div>{posts.map(post => <FederatedPostCard key={post.id} post={post} hideComments />)}</div>}
    {posts.length > 0 && <div className="py-6 text-center">
      {feed.hasNextPage ? <Button variant="outline" disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>{feed.isFetchingNextPage ? (t("ui.publicFeed.loading")) : (t("ui.publicFeed.showMorePosts"))}</Button> : <p className="text-sm text-muted-foreground">{t("ui.publicFeed.youHaveSeenAll")}</p>}
      {feed.isFetchNextPageError && <p role="alert" className="mt-3 text-sm text-destructive">{t("ui.publicFeed.couldNotLoadMore")}</p>}
    </div>}
    <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Globe2 className="h-3.5 w-3.5" aria-hidden="true" />{t("ui.publicFeed.publicPostsNewestFirst")}</p>
  </section>;
}
