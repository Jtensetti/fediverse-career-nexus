import { Heart, PartyPopper, ThumbsUp, Smile, Lightbulb, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReactionData {
  emoji: string;
  count: number;
  hasReacted?: boolean;
}

interface StackedReactionDisplayProps {
  reactions: ReactionData[];
  className?: string;
  showCount?: boolean;
  maxIcons?: number;
}

// Unified reaction config
const REACTION_CONFIG: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  '❤️': { 
    icon: Heart, 
    color: 'text-white',
    bgColor: 'bg-red-500'
  },
  '🎉': { 
    icon: PartyPopper, 
    color: 'text-white',
    bgColor: 'bg-yellow-500'
  },
  '✌️': { 
    icon: ThumbsUp, 
    color: 'text-white',
    bgColor: 'bg-blue-500'
  },
  '🤗': { 
    icon: Smile, 
    color: 'text-white',
    bgColor: 'bg-green-500'
  },
  '😮': { 
    icon: Lightbulb, 
    color: 'text-white',
    bgColor: 'bg-purple-500'
  },
};

export default function StackedReactionDisplay({ 
  reactions, 
  className,
  showCount = true,
  maxIcons = 5
}: StackedReactionDisplayProps) {
  // Filter reactions with count > 0 and sort by count (most popular first)
  const activeReactions = reactions
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxIcons);
  
  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);
  
  if (activeReactions.length === 0 || totalCount === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Stacked reaction icons - overlapping like LinkedIn */}
      <div className="flex items-center -space-x-1">
        {activeReactions.map((reaction, index) => {
          const config = REACTION_CONFIG[reaction.emoji];
          if (!config) return null;
          
          const Icon = config.icon;
          
          return (
            <div
              key={reaction.emoji}
              className={cn(
                "h-[18px] w-[18px] rounded-full flex items-center justify-center ring-2 ring-background",
                config.bgColor
              )}
              style={{ zIndex: activeReactions.length - index }}
            >
              <Icon className={cn("h-2.5 w-2.5", config.color)} />
            </div>
          );
        })}
      </div>
      
      {/* Total count */}
      {showCount && totalCount > 0 && (
        <span className="text-xs text-muted-foreground ml-0.5">
          {totalCount}
        </span>
      )}
    </div>
  );
}
