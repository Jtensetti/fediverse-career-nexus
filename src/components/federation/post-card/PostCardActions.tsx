import { useTranslation } from "react-i18next";
import { MessageSquare, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { ShareButton } from "@/components/common/ShareButton";
import EnhancedPostReactions from "@/components/reactions/EnhancedPostReactions";
import { stripHtml } from "@/lib/linkify";
import { cn } from "@/lib/utils";
import type { BatchPostData } from "@/services/misc/batchDataService";

interface PostCardActionsProps {
  postId: string;
  displayContent: string;
  isBoosted: boolean;
  boostCount: number;
  replyCount: number;
  onBoost: () => void;
  onReply: () => void;
  initialReactions?: BatchPostData['reactions'];
}

export default function PostCardActions({
  postId,
  displayContent,
  isBoosted,
  boostCount,
  replyCount,
  onBoost,
  onReply,
  initialReactions,
}: PostCardActionsProps) {
  const { t } = useTranslation();

  return (
    <CardFooter className="pt-0 flex items-center gap-1 border-t border-border/50 mx-2 sm:mx-4 py-2" data-interactive="true">
      <EnhancedPostReactions postId={postId} compact initialReactions={initialReactions} />

      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 rounded-full hover:text-primary hover:bg-primary/10 transition-all duration-200 px-3"
        onClick={onReply}
        aria-label={t('postCard.replyToPost')}
      >
        <MessageSquare className="h-4 w-4" />
        {replyCount > 0 && <span className="text-xs">{replyCount}</span>}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1.5 rounded-full transition-all duration-200 px-3",
          isBoosted ? "text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950" : "hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950"
        )}
        onClick={onBoost}
        aria-label={isBoosted ? t('postCard.removeBoost') : t('postCard.boostPost')}
        aria-pressed={isBoosted}
      >
        <Repeat className={cn("h-4 w-4 transition-transform", isBoosted && "text-green-500")} />
        {boostCount > 0 && <span className="text-xs">{boostCount}</span>}
      </Button>
      <div className="ml-auto">
        <ShareButton
          url={`${window.location.origin}/post/${postId}`}
          title={stripHtml(displayContent).substring(0, 100)}
          variant="ghost"
          size="sm"
        />
      </div>
    </CardFooter>
  );
}
