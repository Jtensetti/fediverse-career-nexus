import { useState, useEffect } from "react";
import { getArticleReactions, toggleReaction, ReactionCount } from "@/services/articleReactionsService";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Heart, ThumbsUp, PartyPopper, Smile, Lightbulb, LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ArticleReactionsProps {
  articleId: string;
}

// Map emoji identifiers to Lucide icons with proper theming
const REACTION_CONFIG: Record<string, { icon: LucideIcon; label: string; activeColor: string; hoverBg: string }> = {
  '❤️': { 
    icon: Heart, 
    label: 'Love', 
    activeColor: 'text-red-500 fill-red-500',
    hoverBg: 'hover:bg-red-50 dark:hover:bg-red-950'
  },
  '🎉': { 
    icon: PartyPopper, 
    label: 'Celebrate', 
    activeColor: 'text-yellow-500',
    hoverBg: 'hover:bg-yellow-50 dark:hover:bg-yellow-950'
  },
  '✌️': { 
    icon: ThumbsUp, 
    label: 'Support', 
    activeColor: 'text-blue-500',
    hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-950'
  },
  '🤗': { 
    icon: Smile, 
    label: 'Empathy', 
    activeColor: 'text-green-500',
    hoverBg: 'hover:bg-green-50 dark:hover:bg-green-950'
  },
  '😮': { 
    icon: Lightbulb, 
    label: 'Insightful', 
    activeColor: 'text-purple-500',
    hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-950'
  },
};

const ArticleReactions = ({ articleId }: ArticleReactionsProps) => {
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

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
    if (!user) {
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
    return (
      <div className="flex justify-center gap-2 my-4">
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-14 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 my-4 flex-wrap">
        {reactions.map((reaction) => {
          const config = REACTION_CONFIG[reaction.emoji];
          if (!config) return null;
          
          const Icon = config.icon;
          
          return (
            <Tooltip key={reaction.emoji}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReaction(reaction.emoji)}
                  className={cn(
                    "transition-all gap-1.5",
                    config.hoverBg,
                    reaction.hasReacted 
                      ? `border-primary/50 bg-primary/5 ${config.activeColor}` 
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-transform",
                    reaction.hasReacted && "scale-110"
                  )} />
                  {reaction.count > 0 && (
                    <span className="text-sm font-medium">{reaction.count}</span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{config.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default ArticleReactions;
