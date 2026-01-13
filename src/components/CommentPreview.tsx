import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getPostReplies, PostReply } from "@/services/postReplyService";
import { toggleSaveItem, isItemSaved } from "@/services/savedItemsService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import InlineReplyComposer from "./InlineReplyComposer";
import { EnhancedCommentReactions } from "./EnhancedCommentReactions";

interface CommentPreviewProps {
  postId: string;
  onCommentClick?: () => void;
  maxComments?: number;
}

interface CommentWithState extends PostReply {
  isSaved: boolean;
}

export default function CommentPreview({ postId, onCommentClick, maxComments = 2 }: CommentPreviewProps) {
  const [comments, setComments] = useState<CommentWithState[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const replies = await getPostReplies(postId);
      
      // Get only top-level replies (no parent)
      const topLevelReplies = replies.filter(r => !r.parent_reply_id);
      setTotalCount(topLevelReplies.length);
      
      // Get the first few with reaction counts and saved status
      const previewReplies = topLevelReplies.slice(0, maxComments);
      
      const commentsWithState = await Promise.all(
        previewReplies.map(async (reply) => {
          try {
            const saved = user ? await isItemSaved("comment", reply.id).catch(() => false) : false;
            return {
              ...reply,
              isSaved: saved
            };
          } catch {
            return {
              ...reply,
              isSaved: false
            };
          }
        })
      );
      
      setComments(commentsWithState);
    } catch (error) {
      console.error('Error loading comment preview:', error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveComment = async (commentId: string) => {
    if (!user) {
      toast.error('Please sign in to save comments');
      return;
    }

    // Optimistic update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, isSaved: !c.isSaved };
      }
      return c;
    }));

    const result = await toggleSaveItem("comment", commentId);
    if (!result.success) {
      // Revert on failure (don't reload entire list)
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, isSaved: !c.isSaved };
        }
        return c;
      }));
      toast.error('Failed to save comment');
    } else {
      toast.success(result.saved ? "Comment saved" : "Removed from saved");
    }
  };

  const handleReplyCreated = () => {
    setShowReplyComposer(false);
    loadComments();
  };

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2 border-t border-border/50">
        {[...Array(maxComments)].map((_, i) => (
          <div key={i} className="flex gap-2 animate-pulse">
            <div className="h-6 w-6 rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-3 w-24 bg-muted rounded mb-1" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0 && totalCount === 0) {
    return (
      <div className="pt-2 border-t border-border/50">
        {showReplyComposer ? (
          <InlineReplyComposer
            postId={postId}
            onReplyCreated={handleReplyCreated}
            onCancel={() => setShowReplyComposer(false)}
            placeholder="Write a comment..."
            autoFocus
          />
        ) : (
          <button
            onClick={() => user ? setShowReplyComposer(true) : toast.error('Please sign in to comment')}
            className="w-full text-left text-sm text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            Write the first comment...
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pt-2 border-t border-border/50 space-y-2">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-2 group/comment">
          <Link to={`/profile/${comment.author.username || comment.user_id}`}>
            <Avatar className="h-6 w-6">
              {comment.author.avatar_url && (
                <AvatarImage src={comment.author.avatar_url} />
              )}
              <AvatarFallback className="text-[10px] bg-muted">
                {(comment.author.fullname || comment.author.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1 min-w-0">
            <div className="bg-muted/50 rounded-lg px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <Link 
                  to={`/profile/${comment.author.username || comment.user_id}`}
                  className="text-xs font-medium hover:underline"
                >
                  {comment.author.fullname || comment.author.username || 'Unknown'}
                </Link>
                <span className="text-[10px] text-muted-foreground">
                  · {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-foreground/90 line-clamp-2">
                {comment.content}
              </p>
            </div>
            
            <div className="flex items-center gap-1 mt-0.5 ml-1">
              {/* Enhanced reactions with full emoji picker */}
              <EnhancedCommentReactions replyId={comment.id} className="scale-90 origin-left" />
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-5 px-1.5 text-[10px] rounded-full",
                        comment.isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"
                      )}
                      onClick={() => handleSaveComment(comment.id)}
                    >
                      <Bookmark className={cn("h-3 w-3", comment.isSaved && "fill-current")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{comment.isSaved ? "Remove from saved" : "Save comment"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      ))}
      
      {totalCount > maxComments && (
        <Link
          to={`/post/${postId}`}
          className="block text-xs text-primary hover:underline pl-8"
          onClick={onCommentClick}
        >
          View all {totalCount} comments
        </Link>
      )}
      
      {/* Quick reply input */}
      {showReplyComposer ? (
        <div className="pt-1">
          <InlineReplyComposer
            postId={postId}
            onReplyCreated={handleReplyCreated}
            onCancel={() => setShowReplyComposer(false)}
            placeholder="Write a comment..."
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => user ? setShowReplyComposer(true) : toast.error('Please sign in to comment')}
          className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-2"
        >
          <MessageSquare className="h-3 w-3" />
          Add a comment...
        </button>
      )}
    </div>
  );
}
