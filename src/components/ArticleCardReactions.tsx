import { useQuery } from "@tanstack/react-query";
import { getArticleReactions } from "@/services/articleReactionsService";
import { REACTION_EMOJIS, ReactionKey, REACTIONS } from "@/lib/reactions";
import { cn } from "@/lib/utils";

interface ArticleCardReactionsProps {
  articleId: string;
  className?: string;
}

/**
 * Compact reaction display for article cards - shows stacked emojis with total count
 */
const ArticleCardReactions = ({ articleId, className }: ArticleCardReactionsProps) => {
  const { data: reactions = [] } = useQuery({
    queryKey: ["articleReactions", articleId],
    queryFn: () => getArticleReactions(articleId),
    staleTime: 30000,
  });

  // Filter to only reactions with counts
  const activeReactions = reactions.filter((r) => r.count > 0);
  const totalCount = activeReactions.reduce((sum, r) => sum + r.count, 0);

  if (totalCount === 0) {
    return null;
  }

  // Get unique emoji types (max 3 for display)
  const uniqueEmojis = activeReactions.slice(0, 3).map((r) => r.emoji);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex -space-x-1">
        {uniqueEmojis.map((emoji, i) => (
          <span
            key={emoji}
            className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-xs"
            style={{ zIndex: 3 - i }}
          >
            {emoji}
          </span>
        ))}
      </div>
      <span className="text-xs text-muted-foreground font-medium">{totalCount}</span>
    </div>
  );
};

export default ArticleCardReactions;
