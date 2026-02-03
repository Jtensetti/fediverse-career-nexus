import { useState } from "react";
import { cn } from "@/lib/utils";
import { REACTION_CONFIG, ReactionKey, REACTIONS } from "@/lib/reactions";
import { ReactionCount } from "@/services/reactionsService";
import { useLongPress } from "@/hooks/useLongPress";
import ReactionUsersDialog from "./ReactionUsersDialog";

interface StackedReactionDisplayProps {
  reactions: ReactionCount[];
  showCount?: boolean;
  totalCount?: number;
  maxIcons?: number;
  size?: 'sm' | 'md';
  className?: string;
  /** Target ID for fetching who reacted */
  targetId?: string;
  /** Target type for fetching who reacted */
  targetType?: 'post' | 'reply' | 'article';
  /** Callback when long-press/double-click to open reaction picker */
  onOpenReactionPicker?: () => void;
  /** Whether clicking is enabled (opens user list) */
  interactive?: boolean;
  /** The current user's reaction (if any) */
  userReaction?: ReactionKey | null;
}

const StackedReactionDisplay = ({
  reactions,
  showCount = true,
  totalCount,
  maxIcons = 3,
  size = 'md',
  className,
  targetId,
  targetType,
  onOpenReactionPicker,
  interactive = true,
  userReaction,
}: StackedReactionDisplayProps) => {
  const [showUsersDialog, setShowUsersDialog] = useState(false);

  // Filter to only reactions with count > 0 and sort by count descending
  const activeReactions = reactions
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxIcons);

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

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      onOpenReactionPicker?.();
    },
    onClick: () => {
      if (interactive && targetId && targetType && total > 0) {
        setShowUsersDialog(true);
      }
    },
  });

  if (activeReactions.length === 0) {
    return null;
  }

  const isClickable = interactive && targetId && targetType && total > 0;

  // Get user's reaction icon for the indicator
  const UserReactionIcon = userReaction ? REACTION_CONFIG[userReaction].icon : null;
  const userReactionColor = userReaction ? REACTION_CONFIG[userReaction].activeColor : '';

  return (
    <>
      <div 
        className={cn(
          "flex items-center gap-1",
          isClickable && "cursor-pointer",
          className
        )}
        {...(isClickable || onOpenReactionPicker ? {
          onMouseDown: longPressHandlers.onMouseDown,
          onMouseUp: longPressHandlers.onMouseUp,
          onMouseLeave: longPressHandlers.onMouseLeave,
          onTouchStart: longPressHandlers.onTouchStart,
          onTouchEnd: longPressHandlers.onTouchEnd,
          onDoubleClick: longPressHandlers.onDoubleClick,
        } : {})}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setShowUsersDialog(true);
          }
        }}
      >
        <div className="flex items-center -space-x-1.5">
          {activeReactions.map((reaction, index) => {
            const config = REACTION_CONFIG[reaction.reaction];
            const Icon = config.icon;
            const isUserReaction = userReaction === reaction.reaction;
            
            return (
              <div
                key={reaction.reaction}
                className={cn(
                  "rounded-full flex items-center justify-center ring-2",
                  containerSize,
                  bgColors[reaction.reaction],
                  isUserReaction ? "ring-primary ring-[3px]" : "ring-background"
                )}
                style={{ zIndex: maxIcons - index }}
              >
                <Icon className={cn(iconSize, "text-white")} />
              </div>
            );
          })}
        </div>
        {showCount && total > 0 && (
          <span className={cn(
            "text-xs font-medium",
            userReaction ? userReactionColor : "text-muted-foreground"
          )}>
            {total}
          </span>
        )}
        {/* Show small indicator of user's reaction if not visible in stack */}
        {userReaction && UserReactionIcon && !activeReactions.some(r => r.reaction === userReaction) && (
          <div className={cn("ml-0.5", userReactionColor)}>
            <UserReactionIcon className="h-3 w-3" />
          </div>
        )}
      </div>

      {targetId && targetType && (
        <ReactionUsersDialog
          open={showUsersDialog}
          onOpenChange={setShowUsersDialog}
          targetType={targetType}
          targetId={targetId}
        />
      )}
    </>
  );
};

export default StackedReactionDisplay;
