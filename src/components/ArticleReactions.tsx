import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getArticleReactions, toggleReaction, ReactionCount } from "@/services/articleReactionsService";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Heart, ThumbsUp, PartyPopper, Smile, Lightbulb, LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReactionKey } from "@/lib/reactions";
import ReactionUsersPopover from "./ReactionUsersPopover";

interface ArticleReactionsProps {
  articleId: string;
}

const ArticleReactions = ({ articleId }: ArticleReactionsProps) => {
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useTranslation();

  const REACTION_CONFIG: Record<string, { icon: LucideIcon; label: string; activeColor: string; hoverBg: string; reactionKey: ReactionKey }> = {
    '❤️': { icon: Heart, label: t('articleReactions.love'), activeColor: 'text-red-500 fill-red-500', hoverBg: 'hover:bg-red-50 dark:hover:bg-red-950', reactionKey: 'love' },
    '🎉': { icon: PartyPopper, label: t('articleReactions.celebrate'), activeColor: 'text-yellow-500', hoverBg: 'hover:bg-yellow-50 dark:hover:bg-yellow-950', reactionKey: 'celebrate' },
    '✌️': { icon: ThumbsUp, label: t('articleReactions.support'), activeColor: 'text-blue-500', hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-950', reactionKey: 'support' },
    '🤗': { icon: Smile, label: t('articleReactions.empathy'), activeColor: 'text-green-500', hoverBg: 'hover:bg-green-50 dark:hover:bg-green-950', reactionKey: 'empathy' },
    '😮': { icon: Lightbulb, label: t('articleReactions.insightful'), activeColor: 'text-purple-500', hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-950', reactionKey: 'insightful' },
  };

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
      toast.error(t('articleReactions.signInToReact'));
      return;
    }
    const updatedReactions = reactions.map(reaction => {
      if (reaction.emoji === emoji) {
        const increment = reaction.hasReacted ? -1 : 1;
        return { ...reaction, count: reaction.count + increment, hasReacted: !reaction.hasReacted };
      }
      return reaction;
    });
    setReactions(updatedReactions);
    const success = await toggleReaction(articleId, emoji);
    if (!success) {
      const reactionData = await getArticleReactions(articleId);
      setReactions(reactionData);
    }
  };

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  
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
        {totalReactions > 0 && (
          <ReactionUsersPopover targetType="article" targetId={articleId}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <span className="text-sm font-medium">{totalReactions} {t('articleReactions.reactions')}</span>
            </Button>
          </ReactionUsersPopover>
        )}
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
                  <Icon className={cn("h-4 w-4 transition-transform", reaction.hasReacted && "scale-110")} />
                  {reaction.count > 0 && <span className="text-sm font-medium">{reaction.count}</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{config.label}</p></TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default ArticleReactions;