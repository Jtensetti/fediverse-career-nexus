import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { REACTIONS, REACTION_CONFIG, REACTION_EMOJIS, ReactionKey } from "@/lib/reactions";
import { getReactionUsers, ReactionUser, ReactionUsersResult } from "@/services/reactionUsersService";

interface ReactionUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'post' | 'reply' | 'article';
  targetId: string;
}

export function ReactionUsersDialog({ 
  open, 
  onOpenChange, 
  targetType, 
  targetId 
}: ReactionUsersDialogProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReactionUsersResult | null>(null);
  const [filter, setFilter] = useState<'all' | ReactionKey>('all');

  useEffect(() => {
    if (open && targetId) {
      setLoading(true);
      getReactionUsers(targetType, targetId).then(result => {
        setData(result);
        setLoading(false);
      });
    }
  }, [open, targetType, targetId]);

  const filteredUsers = data?.users.filter(u => 
    filter === 'all' || u.reaction === filter
  ) || [];

  const content = (
    <div className="flex flex-col h-full max-h-[60vh]">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 pb-4 overflow-x-auto scrollbar-hide">
        <Button
          variant={filter === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className="rounded-full shrink-0"
          onClick={() => setFilter('all')}
        >
          {t("reactions.all", "All")} · {data?.total || 0}
        </Button>
        {REACTIONS.map(reaction => {
          const count = data?.counts[reaction] || 0;
          if (count === 0) return null;
          return (
            <Button
              key={reaction}
              variant={filter === reaction ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-full shrink-0 gap-1"
              onClick={() => setFilter(reaction)}
            >
              <span className="text-base">{REACTION_EMOJIS[reaction]}</span>
              <span>{count}</span>
            </Button>
          );
        })}
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))
        ) : filteredUsers.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            {t("reactions.noReactions", "No reactions yet")}
          </p>
        ) : (
          filteredUsers.map((user) => (
            <Link
              key={`${user.userId}-${user.reaction}`}
              to={`/profile/${user.username}`}
              onClick={() => onOpenChange(false)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10">
                    {user.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{user.displayName}</span>
              </div>
              <span className="text-xl">{REACTION_EMOJIS[user.reaction]}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl">
          <SheetHeader className="pb-2">
            <SheetTitle>{t("reactions.title", "Reactions")}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("reactions.title", "Reactions")}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

export default ReactionUsersDialog;
