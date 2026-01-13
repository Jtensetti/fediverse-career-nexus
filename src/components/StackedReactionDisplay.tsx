import { cn } from "@/lib/utils";
import { REACTION_CONFIG, ReactionKey, REACTIONS } from "@/lib/reactions";
import { ReactionCount } from "@/services/reactionsService";

interface StackedReactionDisplayProps {
  reactions: ReactionCount[];
  showCount?: boolean;
  totalCount?: number;
  maxIcons?: number;
  size?: 'sm' | 'md';
  className?: string;
}

const StackedReactionDisplay = ({
  reactions,
  showCount = true,
  totalCount,
  maxIcons = 3,
  size = 'md',
  className,
}: StackedReactionDisplayProps) => {
  // Filter to only reactions with count > 0 and sort by count descending
  const activeReactions = reactions
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxIcons);

  if (activeReactions.length === 0) {
    return null;
  }

  const total = totalCount ?? reactions.reduce((sum, r) => sum + r.count, 0);
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const containerSize = size === 'sm' ? 'h-[18px] w-[18px]' : 'h-5 w-5';

  // Background colors for each reaction type
  const bgColors: Record<ReactionKey, string> = {
    love: 'bg-red-500',
    celebrate: 'bg-amber-500',
    support: 'bg-blue-500',
    empathy: 'bg-green-500',
    insightful: 'bg-purple-500',
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center -space-x-1.5">
        {activeReactions.map((reaction, index) => {
          const config = REACTION_CONFIG[reaction.reaction];
          const Icon = config.icon;
          
          return (
            <div
              key={reaction.reaction}
              className={cn(
                "rounded-full flex items-center justify-center ring-2 ring-background",
                containerSize,
                bgColors[reaction.reaction]
              )}
              style={{ zIndex: maxIcons - index }}
            >
              <Icon className={cn(iconSize, "text-white")} />
            </div>
          );
        })}
      </div>
      {showCount && total > 0 && (
        <span className="text-xs text-muted-foreground font-medium">
          {total}
        </span>
      )}
    </div>
  );
};

export default StackedReactionDisplay;
