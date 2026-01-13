import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { getReplyReactions, toggleReplyReaction, ReplyReactionCount } from "@/services/replyReactionsService";
import StackedReactionDisplay from "@/components/StackedReactionDisplay";

const SUPPORTED_EMOJIS = ['❤️', '🎉', '✌️', '🤗', '😮'];

interface EnhancedCommentReactionsProps {
  replyId: string;
  className?: string;
}

export function EnhancedCommentReactions({ replyId, className }: EnhancedCommentReactionsProps) {
  const [reactions, setReactions] = useState<ReplyReactionCount[]>(
    SUPPORTED_EMOJIS.map(emoji => ({ emoji, count: 0, hasReacted: false }))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadReactions = useCallback(async () => {
    try {
      const data = await getReplyReactions(replyId);
      setReactions(data);
    } catch (error) {
      console.error('Error loading comment reactions:', error);
    }
  }, [replyId]);

  useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  const handleReaction = async (emoji: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setIsOpen(false);
    
    // Find current user's reaction (if any)
    const currentUserEmoji = reactions.find(r => r.hasReacted)?.emoji;
    
    // Optimistic update
    setReactions(prev => prev.map(r => {
      if (currentUserEmoji && currentUserEmoji !== emoji && r.emoji === currentUserEmoji) {
        // Decrement the old emoji
        return { ...r, count: Math.max(0, r.count - 1), hasReacted: false };
      }
      if (r.emoji === emoji) {
        if (r.hasReacted) {
          // Toggle off
          return { ...r, count: Math.max(0, r.count - 1), hasReacted: false };
        } else {
          // Toggle on
          return { ...r, count: r.count + 1, hasReacted: true };
        }
      }
      return r;
    }));

    try {
      const result = await toggleReplyReaction(replyId, emoji);
      
      if (!result.ok) {
        // Revert on failure
        await loadReactions();
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      await loadReactions();
    } finally {
      setIsLoading(false);
    }
  };

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  const reactedEmojis = reactions.filter(r => r.count > 0);
  const userHasReacted = reactions.some(r => r.hasReacted);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1 text-xs",
              userHasReacted && "text-primary"
            )}
            disabled={isLoading}
          >
            {totalReactions > 0 ? (
              <StackedReactionDisplay reactions={reactedEmojis} />
            ) : (
              <Heart className={cn("h-3.5 w-3.5", userHasReacted && "fill-current")} />
            )}
            {totalReactions > 0 && (
              <span className="ml-0.5">{totalReactions}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-1" 
          side="top" 
          align="start"
        >
          <div className="flex gap-0.5">
            {SUPPORTED_EMOJIS.map(emoji => {
              const reaction = reactions.find(r => r.emoji === emoji);
              const isActive = reaction?.hasReacted || false;
              
              return (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0 text-base hover:scale-110 transition-transform",
                    isActive && "bg-primary/10 ring-1 ring-primary"
                  )}
                  onClick={() => handleReaction(emoji)}
                  disabled={isLoading}
                >
                  {emoji}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
