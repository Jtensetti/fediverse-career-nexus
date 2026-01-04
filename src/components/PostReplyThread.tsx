import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import InlineReplyComposer from "./InlineReplyComposer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PostReply } from "@/services/postReplyService";

interface PostReplyThreadProps {
  reply: PostReply;
  postId: string;
  depth?: number;
  onReplyCreated: (replyId: string) => void;
}

const MAX_DEPTH = 3;

export default function PostReplyThread({ 
  reply, 
  postId,
  depth = 0, 
  onReplyCreated 
}: PostReplyThreadProps) {
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const { user } = useAuth();

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

  const handleLike = () => {
    if (!user) {
      toast.error('Please sign in to like');
      return;
    }
    setIsLiked(!isLiked);
  };

  const getPublishedDate = () => {
    try {
      return formatDistanceToNow(new Date(reply.created_at), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
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
            <Avatar className="h-8 w-8">
              {reply.author.avatar_url ? (
                <AvatarImage src={reply.author.avatar_url} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {(reply.author.fullname || reply.author.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {reply.author.fullname || reply.author.username || 'Unknown'}
                </span>
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
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 gap-1 text-xs",
                    isLiked && "text-red-500"
                  )}
                  onClick={handleLike}
                >
                  <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
                </Button>

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
    </div>
  );
}
