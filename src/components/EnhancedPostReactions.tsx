import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Heart, PartyPopper, ThumbsUp, Smile, Lightbulb, LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getPostReactions, togglePostReaction, ReactionCount } from "@/services/postReactionsService";

interface EnhancedPostReactionsProps {
  postId: string;
  compact?: boolean;
  onReactionChange?: () => void;
}

// Unified reaction config matching ArticleReactions
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

// These must match the supported emojis in postReactionsService.ts for consistency
const SUPPORTED_EMOJIS = ['❤️', '🎉', '✌️', '🤗', '😮'];

export default function EnhancedPostReactions({ postId, compact = false, onReactionChange }: EnhancedPostReactionsProps) {
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadReactions();
  }, [postId]);

  const loadReactions = async () => {
    setIsLoading(true);
    const reactionData = await getPostReactions(postId);
    
    // Map to our supported emojis, ensuring all are present
    const mappedReactions = SUPPORTED_EMOJIS.map(emoji => {
      const existing = reactionData.find(r => r.emoji === emoji);
      return existing || { emoji, count: 0, hasReacted: false };
    });
    
    setReactions(mappedReactions);
    setIsLoading(false);
  };

  const handleReaction = async (emoji: string) => {
    if (!user) {
      toast.error('Please sign in to react to posts');
      return;
    }
    
    // Optimistic update
    setReactions(prev => prev.map(r => {
      if (r.emoji === emoji) {
        return {
          ...r,
          count: r.hasReacted ? r.count - 1 : r.count + 1,
          hasReacted: !r.hasReacted
        };
      }
      return r;
    }));
    
    const success = await togglePostReaction(postId, emoji);
    
    if (!success) {
      // Revert on failure
      await loadReactions();
    } else {
      onReactionChange?.();
    }
  };

  // Get total reaction count
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  
  // Get active reactions (ones with count > 0 or user has reacted)
  const activeReactions = reactions.filter(r => r.count > 0 || r.hasReacted);
  
  // Get user's reactions
  const userReactions = reactions.filter(r => r.hasReacted);

  if (isLoading) {
    return (
      <div className="flex gap-1">
        {compact ? (
          <div className="h-8 w-16 rounded-full bg-muted animate-pulse" />
        ) : (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-10 rounded-full bg-muted animate-pulse" />
          ))
        )}
      </div>
    );
  }

  // Compact mode: Show primary reaction button with picker on hover
  if (compact) {
    const primaryReaction = userReactions[0] || reactions.find(r => r.count > 0) || reactions[0];
    const config = REACTION_CONFIG[primaryReaction?.emoji || '❤️'];
    const Icon = config?.icon || Heart;

    return (
      <TooltipProvider delayDuration={100}>
        <div className="relative group/reactions">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(primaryReaction?.emoji || '❤️')}
                className={cn(
                  "gap-1.5 rounded-full transition-all px-3",
                  config?.hoverBg,
                  primaryReaction?.hasReacted 
                    ? config?.activeColor 
                    : "text-muted-foreground"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-transform",
                  primaryReaction?.hasReacted && "scale-110 fill-current"
                )} />
                {totalReactions > 0 && (
                  <span className="text-xs font-medium">{totalReactions}</span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="p-1">
              <div className="flex gap-0.5">
                {SUPPORTED_EMOJIS.map(emoji => {
                  const reaction = reactions.find(r => r.emoji === emoji);
                  const cfg = REACTION_CONFIG[emoji];
                  const ReactionIcon = cfg.icon;
                  
                  return (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReaction(emoji);
                      }}
                      className={cn(
                        "h-8 w-8 p-0 rounded-full",
                        cfg.hoverBg,
                        reaction?.hasReacted && cfg.activeColor
                      )}
                    >
                      <ReactionIcon className={cn(
                        "h-4 w-4",
                        reaction?.hasReacted && "fill-current"
                      )} />
                    </Button>
                  );
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // Full mode: Show all reactions
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        {reactions.map((reaction) => {
          const config = REACTION_CONFIG[reaction.emoji];
          if (!config) return null;
          
          const Icon = config.icon;
          
          return (
            <Tooltip key={reaction.emoji}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction(reaction.emoji)}
                  className={cn(
                    "transition-all gap-1 rounded-full px-2 h-8",
                    config.hoverBg,
                    reaction.hasReacted 
                      ? `${config.activeColor} bg-primary/5` 
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    reaction.hasReacted && "scale-110 fill-current"
                  )} />
                  {reaction.count > 0 && (
                    <span className="text-xs font-medium">{reaction.count}</span>
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
}
