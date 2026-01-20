import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  childReplies?: PostReply[];
  onReplyCreated: (replyId: string) => void;
}

const MAX_DEPTH = 3;

export default function PostReplyThread({ 
  reply, 
  postId,
  depth = 0, 
  childReplies = [],
  onReplyCreated 
}: PostReplyThreadProps) {
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
      toast.error('Please sign in to reply');
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
      toast.error('Please sign in to save');
      return;
    }

    const prevSaved = isSaved;
    setIsSaved(!isSaved);

    const result = await toggleSaveItem("comment", reply.id);
    if (!result.success) {
      setIsSaved(prevSaved);
      toast.error('Failed to save comment');
    } else {
      toast.success(result.saved ? "Comment saved" : "Removed from saved");
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
      toast.success("Comment deleted");
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
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div 
        className={cn(
          "relative",
          depth > 0 && "ml-6 pl-4 border-l-2 border-border/50"
        )}
      >
      <Card className="border-0 shadow-none bg-muted/30">
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

              {/* Reply Content */}
              <p className="mt-1 text-sm whitespace-pre-wrap break-words">
                {reply.content}
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
                      <p>{isSaved ? "Remove from saved" : "Save comment"}</p>
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
                    Reply
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
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
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
                placeholder={`Reply to @${reply.author.username || 'user'}...`}
                autoFocus
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Render child replies recursively */}
      {childReplies.length > 0 && (
        <div className="mt-2 space-y-2">
          {childReplies.map(childReply => (
            <PostReplyThread
              key={childReply.id}
              reply={childReply}
              postId={postId}
              depth={depth + 1}
              childReplies={[]}
              onReplyCreated={onReplyCreated}
            />
          ))}
        </div>
      )}
      </div>
    </>
  );
}
