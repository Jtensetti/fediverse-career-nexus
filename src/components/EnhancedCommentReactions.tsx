import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, PartyPopper, ThumbsUp, Smile, Lightbulb, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getReplyReactions, toggleReplyReaction, ReplyReactionCount } from "@/services/replyReactionsService";
import StackedReactionDisplay from "@/components/StackedReactionDisplay";

const SUPPORTED_EMOJIS = ['❤️', '🎉', '✌️', '🤗', '😮'];

// Same icon config as posts/articles
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
    
    const currentUserEmoji = reactions.find(r => r.hasReacted)?.emoji;
    
    setReactions(prev => prev.map(r => {
      if (currentUserEmoji && currentUserEmoji !== emoji && r.emoji === currentUserEmoji) {
        return { ...r, count: Math.max(0, r.count - 1), hasReacted: false };
      }
      if (r.emoji === emoji) {
        if (r.hasReacted) {
          return { ...r, count: Math.max(0, r.count - 1), hasReacted: false };
        } else {
          return { ...r, count: r.count + 1, hasReacted: true };
        }
      }
      return r;
    }));

    try {
      const result = await toggleReplyReaction(replyId, emoji);
      if (!result.ok) {
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
  const userReaction = reactions.find(r => r.hasReacted);
  const primaryEmoji = userReaction?.emoji || '❤️';
  const primaryConfig = REACTION_CONFIG[primaryEmoji];
  const PrimaryIcon = primaryConfig?.icon || Heart;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1 text-xs rounded-full",
              primaryConfig?.hoverBg,
              userReaction ? primaryConfig?.activeColor : "text-muted-foreground"
            )}
            disabled={isLoading}
          >
            {totalReactions > 0 ? (
              <StackedReactionDisplay reactions={reactions.filter(r => r.count > 0)} showCount={false} />
            ) : (
              <PrimaryIcon className={cn("h-3.5 w-3.5", userReaction && "fill-current")} />
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
              const cfg = REACTION_CONFIG[emoji];
              const ReactionIcon = cfg.icon;
              const isActive = reaction?.hasReacted || false;
              
              return (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0 rounded-full transition-transform hover:scale-110",
                    cfg.hoverBg,
                    isActive && cfg.activeColor
                  )}
                  onClick={() => handleReaction(emoji)}
                  disabled={isLoading}
                >
                  <ReactionIcon className={cn("h-4 w-4", isActive && "fill-current")} />
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
