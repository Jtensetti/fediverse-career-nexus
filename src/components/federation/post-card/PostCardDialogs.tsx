import { useTranslation } from "react-i18next";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ReportDialog } from "@/components/common/ReportDialog";
import BlockUserDialog from "@/components/moderation/BlockUserDialog";
import QuoteRepostDialog from "@/components/posts/QuoteRepostDialog";
import { stripHtml } from "@/lib/linkify";

interface PostCardDialogsProps {
  postId: string;
  displayContent: string;
  userId?: string;
  actorName: string;
  actorUsername: string;
  avatarUrl?: string;
  publishedAt?: string;
  isRemote: boolean;
  rawContent: string;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (open: boolean) => void;
  showReportDialog: boolean;
  setShowReportDialog: (open: boolean) => void;
  showBlockDialog: boolean;
  setShowBlockDialog: (open: boolean) => void;
  showQuoteRepostDialog: boolean;
  setShowQuoteRepostDialog: (open: boolean) => void;
  onDelete: () => void;
  onDeletePost?: (postId: string) => void;
  onRepostSuccess: () => void;
}

export default function PostCardDialogs({
  postId,
  displayContent,
  userId,
  actorName,
  actorUsername,
  avatarUrl,
  publishedAt,
  isRemote,
  rawContent,
  showDeleteDialog,
  setShowDeleteDialog,
  showReportDialog,
  setShowReportDialog,
  showBlockDialog,
  setShowBlockDialog,
  showQuoteRepostDialog,
  setShowQuoteRepostDialog,
  onDelete,
  onDeletePost,
  onRepostSuccess,
}: PostCardDialogsProps) {
  const { t } = useTranslation();

  return (
    <>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('postCard.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('postCard.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('postCard.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
              {t('postCard.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportDialog
        contentType="post"
        contentId={postId}
        contentTitle={stripHtml(displayContent).substring(0, 50)}
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
      />

      {userId && (
        <BlockUserDialog
          open={showBlockDialog}
          onOpenChange={setShowBlockDialog}
          userId={userId}
          userName={actorName}
          onBlocked={() => onDeletePost?.(postId)}
        />
      )}

      <QuoteRepostDialog
        open={showQuoteRepostDialog}
        onOpenChange={setShowQuoteRepostDialog}
        originalPost={{
          id: postId,
          content: rawContent,
          authorName: actorName,
          authorUsername: actorUsername,
          authorAvatar: avatarUrl,
          publishedAt: publishedAt,
          isRemote: isRemote,
        }}
        onSuccess={onRepostSuccess}
      />
    </>
  );
}
