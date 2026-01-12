import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPostReplies, PostReply } from "@/services/postReplyService";
import { toggleReplyReaction, getReplyLikeCount } from "@/services/replyReactionsService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import InlineReplyComposer from "./InlineReplyComposer";

interface CommentPreviewProps {
  postId: string;
  onCommentClick?: () => void;
  maxComments?: number;
}

interface CommentWithReaction extends PostReply {
  likeCount: number;
  hasLiked: boolean;
}

export default function CommentPreview({ postId, onCommentClick, maxComments = 2 }: CommentPreviewProps) {
  const [comments, setComments] = useState<CommentWithReaction[]>([]);
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
      
      // Get the first few with reaction counts
      const previewReplies = topLevelReplies.slice(0, maxComments);
      
      const commentsWithReactions = await Promise.all(
        previewReplies.map(async (reply) => {
          const { count, hasReacted } = await getReplyLikeCount(reply.id);
          return {
            ...reply,
            likeCount: count,
            hasLiked: hasReacted
          };
        })
      );
      
      setComments(commentsWithReactions);
    } catch (error) {
      console.error('Error loading comment preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast.error('Please sign in to like comments');
      return;
    }

    // Optimistic update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          likeCount: c.hasLiked ? c.likeCount - 1 : c.likeCount + 1,
          hasLiked: !c.hasLiked
        };
      }
      return c;
    }));

    const success = await toggleReplyReaction(commentId);
    if (!success) {
      // Revert on failure
      await loadComments();
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
            
            <div className="flex items-center gap-2 mt-0.5 ml-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-5 px-1.5 gap-1 text-[10px] rounded-full",
                  comment.hasLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                )}
                onClick={() => handleLikeComment(comment.id)}
              >
                <Heart className={cn("h-3 w-3", comment.hasLiked && "fill-current")} />
                {comment.likeCount > 0 && comment.likeCount}
              </Button>
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
