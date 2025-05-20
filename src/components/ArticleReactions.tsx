
import { useState, useEffect } from "react";
import { getArticleReactions, toggleReaction, ReactionCount } from "@/services/articleReactionsService";
import { Button } from "@/components/ui/button";
import { useSession } from "@supabase/auth-helpers-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ArticleReactionsProps {
  articleId: string;
}

const ArticleReactions = ({ articleId }: ArticleReactionsProps) => {
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const session = useSession();
  
  useEffect(() => {
    const fetchReactions = async () => {
      setIsLoading(true);
      const reactionData = await getArticleReactions(articleId);
      setReactions(reactionData);
      setIsLoading(false);
    };
    
    fetchReactions();
  }, [articleId]);
  
  const handleReaction = async (emoji: string) => {
    if (!session) {
      toast.error('Please sign in to react to articles');
      return;
    }
    
    // Optimistic update
    const updatedReactions = reactions.map(reaction => {
      if (reaction.emoji === emoji) {
        const increment = reaction.hasReacted ? -1 : 1;
        return {
          ...reaction,
          count: reaction.count + increment,
          hasReacted: !reaction.hasReacted
        };
      }
      return reaction;
    });
    
    setReactions(updatedReactions);
    
    // Perform the actual update
    const success = await toggleReaction(articleId, emoji);
    
    if (!success) {
      // Revert optimistic update if failed
      const reactionData = await getArticleReactions(articleId);
      setReactions(reactionData);
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center gap-2 my-4">Loading reactions...</div>;
  }
  
  return (
    <div className="flex items-center gap-2 my-4 flex-wrap">
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant="outline"
          size="sm"
          onClick={() => handleReaction(reaction.emoji)}
          className={cn(
            "transition-all",
            reaction.hasReacted ? "border-primary bg-primary/10" : ""
          )}
        >
          <span className="mr-1 text-lg">{reaction.emoji}</span>
          <span className="text-sm">{reaction.count > 0 ? reaction.count : ""}</span>
        </Button>
      ))}
    </div>
  );
};

export default ArticleReactions;
