import { useQuery } from "@tanstack/react-query";
import { getArticleReactions } from "@/services/articles/articleReactionsService";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArticleCardReactionsProps {
  articleId: string;
  className?: string;
}

/**
 * Compact reaction display for article cards - shows heart icon with total count
 */
const ArticleCardReactions = ({ articleId, className }: ArticleCardReactionsProps) => {
  const { data: reactions = [] } = useQuery({
    queryKey: ["articleReactions", articleId],
    queryFn: () => getArticleReactions(articleId),
    staleTime: 30000,
  });

  // Calculate total count
  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);

  return (
    <span className={cn(
      "flex items-center gap-1 hover:text-foreground transition-colors",
      className
    )}>
      <Heart className="h-4 w-4" />
      <span className="text-sm">{totalCount}</span>
    </span>
  );
};

export default ArticleCardReactions;
