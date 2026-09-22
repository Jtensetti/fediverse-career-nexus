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
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  const [scope, setScope] = useState<"local" | "federated">("local");
  const feed = useInfiniteQuery({
    queryKey: ["publicFeed", scope],
    queryFn: ({ pageParam, signal }) => fetchPublicFeed({ url: import.meta.env.VITE_SUPABASE_URL, publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, { limit: PAGE_SIZE, offset: pageParam, scope, signal }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, offset) => lastPage.length === PAGE_SIZE ? offset + PAGE_SIZE : undefined,
    staleTime: 30_000,
  });
  const posts = [...new Map(feed.data?.pages.flat().map(post => [post.id, post]) ?? []).values()];

  return <section aria-label={sv ? "Offentliga inlägg" : "Public posts"}>
    <div className="mb-5 flex items-center justify-between gap-3 border-b pb-4">
      <div className="flex gap-1 rounded-full bg-muted p-1" role="group" aria-label={sv ? "Välj flöde" : "Choose feed"}>
        {(["local", "federated"] as const).map(value => <button key={value} onClick={() => setScope(value)} aria-pressed={scope === value} className={`min-h-10 rounded-full px-4 text-sm font-medium transition-colors ${scope === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {value === "local" ? (sv ? "På Nolto" : "On Nolto") : (sv ? "Hela nätverket" : "Across the network")}
        </button>)}
      </div>
      <Button variant="ghost" size="icon" disabled={feed.isFetching} onClick={() => void feed.refetch()} aria-label={sv ? "Uppdatera flödet" : "Refresh feed"}><RefreshCw className={`h-4 w-4 ${feed.isFetching ? "animate-spin" : ""}`} /></Button>
    </div>
    {feed.isPending ? <div aria-label={sv ? "Laddar inlägg" : "Loading posts"} aria-busy="true"><PostSkeleton /><PostSkeleton /></div>
      : feed.isError && !posts.length ? <div className="rounded-2xl border bg-card p-8 text-center" role="alert">
        <h2 className="text-xl">{sv ? "Flödet kunde inte laddas" : "The feed could not be loaded"}</h2>
        <p className="my-4 text-muted-foreground">{sv ? "Försök igen om en stund." : "Please try again in a moment."}</p>
        <Button variant="outline" onClick={() => void feed.refetch()}>{sv ? "Försök igen" : "Try again"}</Button>
      </div>
      : !posts.length ? <div className="rounded-2xl border bg-card px-6 py-14 text-center sm:px-10">
        <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 text-primary"><MessageCircle className="h-8 w-8" aria-hidden="true" /></span>
        <h2 className="font-display text-2xl">{sv ? "Här börjar samtalen." : "Conversations start here."}</h2>
        <p className="mx-auto mb-7 mt-4 max-w-sm leading-relaxed text-muted-foreground">{sv ? "Det finns inga offentliga inlägg här än. Dela en tanke, ställ en fråga eller berätta vad du arbetar med." : "There are no public posts here yet. Share an idea, ask a question or tell us what you are working on."}</p>
        <Button asChild className="rounded-full px-6"><Link to="/auth/signup" state={{ returnTo: "/feed" }}>{sv ? "Starta ett samtal" : "Start a conversation"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
      : <div>{posts.map(post => <FederatedPostCard key={post.id} post={post} hideComments />)}</div>}
    {posts.length > 0 && <div className="py-6 text-center">
      {feed.hasNextPage ? <Button variant="outline" disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>{feed.isFetchingNextPage ? (sv ? "Laddar…" : "Loading…") : (sv ? "Visa fler inlägg" : "Show more posts")}</Button> : <p className="text-sm text-muted-foreground">{sv ? "Du har sett alla inlägg i det här flödet." : "You have seen all posts in this feed."}</p>}
      {feed.isFetchNextPageError && <p role="alert" className="mt-3 text-sm text-destructive">{sv ? "Fler inlägg kunde inte hämtas. Försök igen." : "Could not load more posts. Please try again."}</p>}
    </div>}
    <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Globe2 className="h-3.5 w-3.5" aria-hidden="true" />{sv ? "Offentliga inlägg · Senaste först" : "Public posts · Newest first"}</p>
  </section>;
}
