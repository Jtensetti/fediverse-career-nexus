import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { REACTION_CONFIG, ReactionKey } from "@/lib/reactions";
import { getReactionUsers, ReactionUsersResult } from "@/services/reactionUsersService";

interface ReactionUsersPopoverProps {
  children: React.ReactNode;
  targetType: 'post' | 'reply' | 'article';
  targetId: string;
  disabled?: boolean;
}

// Background colors for reaction icons
const reactionBgColors: Record<ReactionKey, string> = {
  love: 'bg-red-500',
  celebrate: 'bg-amber-500',
  support: 'bg-blue-500',
  empathy: 'bg-green-500',
  insightful: 'bg-purple-500',
};

export function ReactionUsersPopover({ 
  children,
  targetType, 
  targetId,
  disabled = false,
}: ReactionUsersPopoverProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReactionUsersResult | null>(null);
  const [open, setOpen] = useState(false);

  const loadData = async () => {
    if (data) return; // Already loaded
    setLoading(true);
    const result = await getReactionUsers(targetType, targetId);
    setData(result);
    setLoading(false);
  };

  // If the target changes, reset cached data (prevents showing stale users)
  useEffect(() => {
    setData(null);
  }, [targetType, targetId]);

  // Load on hover (desktop) or open (mobile)
  useEffect(() => {
    if (open && !data) {
      loadData();
    }
  }, [open, data, targetType, targetId]);

  if (disabled) {
    return <>{children}</>;
  }

  const content = (
    <div className="w-48 max-h-64 overflow-y-auto">
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          {t("common.loading", "Loading...")}
        </p>
      ) : !data || data.users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          {t("reactions.noReactions", "No reactions yet")}
        </p>
      ) : (
        <div className="space-y-1">
          {data.users.map((user) => {
            const config = REACTION_CONFIG[user.reaction];
            const Icon = config.icon;
            const usernameLabel = user.username && user.username !== "unknown" ? user.username : user.displayName;
            return (
              <Link
                key={`${user.userId}-${user.reaction}`}
                to={`/profile/${user.username}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted transition-colors"
              >
                <div 
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                    reactionBgColors[user.reaction]
                  )}
                >
                  <Icon className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-medium truncate">
                  {user.displayName}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  // Mobile: use Popover with click
  if (isMobile) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" side="top" align="start">
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  // Desktop: use HoverCard
  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-auto p-3" side="top" align="start">
        {content}
      </HoverCardContent>
    </HoverCard>
  );
}

export default ReactionUsersPopover;
