import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { REACTIONS, REACTION_CONFIG, ReactionKey } from "@/lib/reactions";
import { getReplyReactions, toggleReplyReaction, ReactionCount } from "@/services/reactionsService";
import StackedReactionDisplay from "./StackedReactionDisplay";

interface EnhancedCommentReactionsProps {
  replyId: string;
  className?: string;
}

export function EnhancedCommentReactions({ replyId, className }: EnhancedCommentReactionsProps) {
  const [reactions, setReactions] = useState<ReactionCount[]>(
    REACTIONS.map(r => ({ reaction: r, count: 0, hasReacted: false }))
  );
  const [isOpen, setIsOpen] = useState(false);

  const loadReactions = useCallback(async () => {
    const data = await getReplyReactions(replyId);
    setReactions(data);
  }, [replyId]);

  useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  const handleReaction = async (reaction: ReactionKey) => {
    // Optimistic update
    const previousReactions = [...reactions];
    const userCurrentReaction = reactions.find(r => r.hasReacted);
    
    setReactions(prev => prev.map(r => {
      if (r.reaction === reaction) {
        if (r.hasReacted) {
          return { ...r, count: Math.max(0, r.count - 1), hasReacted: false };
        }
        return { ...r, count: r.count + 1, hasReacted: true };
      }
      if (userCurrentReaction && r.reaction === userCurrentReaction.reaction && r.hasReacted) {
        return { ...r, count: Math.max(0, r.count - 1), hasReacted: false };
      }
      return r;
    }));

    setIsOpen(false);

    const result = await toggleReplyReaction(replyId, reaction);
    
    if (!result.success) {
      setReactions(previousReactions);
    }
  };

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  const userReaction = reactions.find(r => r.hasReacted);
  const primaryReaction = userReaction?.reaction || 'love';
  const PrimaryIcon = REACTION_CONFIG[primaryReaction].icon;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 gap-1.5 text-xs",
            userReaction && REACTION_CONFIG[userReaction.reaction].activeColor,
            className
          )}
        >
          {totalReactions > 0 ? (
            <StackedReactionDisplay 
              reactions={reactions} 
              showCount={true}
              totalCount={totalReactions}
              size="sm"
            />
          ) : (
            <>
              <PrimaryIcon className="h-3.5 w-3.5" />
              <span>React</span>
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
              <Button
                key={reaction}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 rounded-full transition-all",
                  config.hoverBg,
                  isActive && config.activeColor
                )}
                onClick={() => handleReaction(reaction)}
                title={config.label}
              >
                <Icon className={cn("h-4 w-4", isActive && "fill-current")} />
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default EnhancedCommentReactions;
