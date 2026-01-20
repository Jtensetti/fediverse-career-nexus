import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { REACTIONS, REACTION_CONFIG, ReactionKey } from "@/lib/reactions";
import { getPostReactions, togglePostReaction, ReactionCount } from "@/services/reactionsService";
import StackedReactionDisplay from "./StackedReactionDisplay";
import type { BatchReactionCount } from "@/services/batchDataService";

interface EnhancedPostReactionsProps {
  postId: string;
  compact?: boolean;
  onReactionChange?: () => void;
  initialReactions?: BatchReactionCount[];
}

const EnhancedPostReactions = ({ postId, compact = false, onReactionChange, initialReactions }: EnhancedPostReactionsProps) => {
  const { t } = useTranslation();
  const [reactions, setReactions] = useState<ReactionCount[]>(
    initialReactions || REACTIONS.map(r => ({ reaction: r, count: 0, hasReacted: false }))
  );
  const [isLoading, setIsLoading] = useState(!initialReactions);
  const [showPicker, setShowPicker] = useState(false);

  const loadReactions = useCallback(async () => {
    // Skip loading if we already have initial data
    if (initialReactions) {
      setIsLoading(false);
      return;
    }
    const data = await getPostReactions(postId);
    setReactions(data);
    setIsLoading(false);
  }, [postId, initialReactions]);

  useEffect(() => {
    // Update from initialReactions when they change
    if (initialReactions) {
      setReactions(initialReactions);
      setIsLoading(false);
    }
  }, [initialReactions]);

  useEffect(() => {
    // Only load if no initial data provided
    if (!initialReactions) {
      loadReactions();
    }
  }, [loadReactions, initialReactions]);

  const handleReaction = async (reaction: ReactionKey) => {
    // Optimistic update
    const previousReactions = [...reactions];
    const userCurrentReaction = reactions.find(r => r.hasReacted);
    
    setReactions(prev => prev.map(r => {
      if (r.reaction === reaction) {
        // Clicking the same reaction - toggle off
        if (r.hasReacted) {
          return { ...r, count: Math.max(0, r.count - 1), hasReacted: false };
        }
        // Adding this reaction
        return { ...r, count: r.count + 1, hasReacted: true };
      }
      // If user had a different reaction, remove it
      if (userCurrentReaction && r.reaction === userCurrentReaction.reaction && r.hasReacted) {
        return { ...r, count: Math.max(0, r.count - 1), hasReacted: false };
      }
      return r;
    }));

    setShowPicker(false);

    const result = await togglePostReaction(postId, reaction);
    
    if (!result.success) {
      // Revert on error
      setReactions(previousReactions);
    } else {
      onReactionChange?.();
    }
  };

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  const userReaction = reactions.find(r => r.hasReacted);
  const primaryReaction = userReaction?.reaction || 'love';
  const PrimaryIcon = REACTION_CONFIG[primaryReaction].icon;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1">
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (compact) {
    return (
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 h-8 px-2",
              userReaction && REACTION_CONFIG[userReaction.reaction].activeColor
            )}
          >
            {totalReactions > 0 ? (
              <StackedReactionDisplay 
                reactions={reactions} 
                showCount={true}
                totalCount={totalReactions}
              />
            ) : (
              <>
                <PrimaryIcon className="h-4 w-4" />
                <span className="text-xs">{t("reactions.react", "React")}</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="start">
          <div className="flex gap-1">
            {REACTIONS.map((reaction) => {
              const config = REACTION_CONFIG[reaction];
              const Icon = config.icon;
              const reactionData = reactions.find(r => r.reaction === reaction);
              const isActive = reactionData?.hasReacted;

              return (
                <TooltipProvider key={reaction}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-9 w-9 p-0 rounded-full transition-all",
                          config.hoverBg,
                          isActive && config.activeColor
                        )}
                        onClick={() => handleReaction(reaction)}
                      >
                        <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t(`reactions.${reaction}`, config.label)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full display mode
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REACTIONS.map((reaction) => {
        const config = REACTION_CONFIG[reaction];
        const Icon = config.icon;
        const reactionData = reactions.find(r => r.reaction === reaction);
        const count = reactionData?.count || 0;
        const isActive = reactionData?.hasReacted;

        return (
          <TooltipProvider key={reaction}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2 gap-1 transition-all",
                    config.hoverBg,
                    isActive && config.activeColor
                  )}
                  onClick={() => handleReaction(reaction)}
                >
                  <Icon className={cn("h-4 w-4", isActive && "fill-current")} />
                  {count > 0 && <span className="text-xs">{count}</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t(`reactions.${reaction}`, config.label)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};

export default EnhancedPostReactions;
