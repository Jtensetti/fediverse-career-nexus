import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Bookmark, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProfileHoverCard } from "@/components/common/ProfileHoverCard";
import InlineReplyComposer from "./InlineReplyComposer";
import CommentEditDialog from "./CommentEditDialog";
import { EnhancedCommentReactions } from "./EnhancedCommentReactions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleSaveItem, isItemSaved } from "@/services/savedItemsService";
import { deletePostReply } from "@/services/postReplyService";
import type { PostReply } from "@/services/postReplyService";

interface PostReplyThreadProps {
  reply: PostReply;
  postId: string;
  depth?: number;
  allReplies: PostReply[];
  onReplyCreated: (replyId: string) => void;
  highlightedReplyId?: string | null;
}

const MAX_DEPTH = 5;

export default function PostReplyThread({ 
  reply, 
  postId,
  depth = 0, 
  allReplies,
  onReplyCreated,
  highlightedReplyId
}: PostReplyThreadProps) {
  // Compute child replies for this reply
  const childReplies = allReplies.filter(r => r.parent_reply_id === reply.id);
  const isHighlighted = reply.id === highlightedReplyId;
  const { t } = useTranslation();
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();

  const isOwnComment = user?.id === reply.user_id;

  useEffect(() => {
    const loadSavedState = async () => {
      if (user) {
        try {
          const saved = await isItemSaved("comment", reply.id);
          setIsSaved(saved);
        } catch (error) {
          console.error('Error loading saved state:', error);
        }
      }
    };
    loadSavedState();
  }, [reply.id, user]);

  const handleReplyClick = () => {
    if (!user) {
      toast.error(t("comments.signInToReply", "Please sign in to reply"));
      return;
    }
    setShowReplyComposer(!showReplyComposer);
  };

  const handleReplyCreated = () => {
    setShowReplyComposer(false);
    onReplyCreated(reply.id);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error(t("comments.signInToReply", "Please sign in to save"));
      return;
    }

    const prevSaved = isSaved;
    setIsSaved(!isSaved);

    const result = await toggleSaveItem("comment", reply.id);
    if (!result.success) {
      setIsSaved(prevSaved);
      toast.error('Failed to save comment');
    } else {
      toast.success(result.saved ? t("comments.saved", "Comment saved") : t("comments.removedFromSaved", "Removed from saved"));
    }
  };

  const getPublishedDate = () => {
    try {
      return formatDistanceToNow(new Date(reply.created_at), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePostReply(reply.id);
      toast.success(t("comments.deleted", "Comment deleted"));
      onReplyCreated(reply.id); // Trigger refresh
    } catch (err: any) {
      toast.error(err.message || "Failed to delete comment");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <CommentEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        commentId={reply.id}
        initialContent={reply.content}
        onUpdated={() => onReplyCreated(reply.id)}
      />
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("comments.deleteComment", "Delete comment?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("comments.deleteCommentDesc", "This action cannot be undone. This will permanently delete your comment.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("comments.deleting", "Deleting...") : t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div 
        id={`reply-${reply.id}`}
        className={cn(
          "relative scroll-mt-20",
          depth > 0 && "ml-6 pl-4 border-l-2 border-border/50"
        )}
      >
      <Card className={cn(
        "border-0 shadow-none bg-muted/30 transition-all duration-500",
        isHighlighted && "ring-2 ring-primary/50 bg-primary/5"
      )}>
        <CardContent className="p-4">
          {/* Author Info */}
          <div className="flex items-start gap-3">
            <ProfileHoverCard username={reply.author.username} userId={reply.user_id}>
              <Link to={`/profile/${reply.author.username || reply.user_id}`}>
                <Avatar className="h-8 w-8 aspect-square flex-shrink-0">
                  {reply.author.avatar_url ? (
                    <AvatarImage src={reply.author.avatar_url} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {(reply.author.fullname || reply.author.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </ProfileHoverCard>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ProfileHoverCard username={reply.author.username} userId={reply.user_id}>
                  <Link 
                    to={`/profile/${reply.author.username || reply.user_id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {reply.author.fullname || reply.author.username || 'Unknown'}
                  </Link>
                </ProfileHoverCard>
                {reply.author.username && (
                  <span className="text-xs text-muted-foreground">
                    @{reply.author.username}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  · {getPublishedDate()}
                </span>
              </div>

              {/* Reply Content - with failsafe for non-string content */}
              <p className="mt-1 text-sm whitespace-pre-wrap break-words">
                {typeof reply.content === 'string' ? reply.content : 'Comment unavailable'}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 mt-2">
                {/* Enhanced reactions with full emoji picker */}
                <EnhancedCommentReactions replyId={reply.id} />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 px-2 text-xs",
                          isSaved && "text-primary"
                        )}
                        onClick={handleSave}
                      >
                        <Bookmark className={cn("h-3.5 w-3.5", isSaved && "fill-current")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isSaved ? t("comments.removeFromSaved", "Remove from saved") : t("comments.saveComment", "Save comment")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {depth < MAX_DEPTH && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1 text-xs"
                    onClick={handleReplyClick}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t("comments.reply", "Reply")}
                  </Button>
                )}

                {isOwnComment && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t("common.edit", "Edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("common.delete", "Delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Inline Reply Composer */}
          {showReplyComposer && (
            <div className="mt-3 ml-11">
              <InlineReplyComposer
                postId={postId}
                parentReplyId={reply.id}
                onReplyCreated={handleReplyCreated}
                onCancel={() => setShowReplyComposer(false)}
                placeholder={`${t("comments.replyTo", "Reply to")} @${reply.author.username || 'user'}...`}
                autoFocus
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Render child replies recursively */}
      {childReplies.length > 0 && depth < MAX_DEPTH && (
        <div className="mt-2 space-y-2">
          {childReplies.map(childReply => (
            <PostReplyThread
              key={childReply.id}
              reply={childReply}
              postId={postId}
              depth={depth + 1}
              allReplies={allReplies}
              onReplyCreated={onReplyCreated}
              highlightedReplyId={highlightedReplyId}
            />
          ))}
        </div>
      )}
      </div>
    </>
  );
}
