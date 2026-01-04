import { useState, useRef, useEffect } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createPostReply } from "@/services/postReplyService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_REPLY_LENGTH = 500;

interface InlineReplyComposerProps {
  postId: string;
  parentReplyId?: string;
  onReplyCreated: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function InlineReplyComposer({
  postId,
  parentReplyId,
  onReplyCreated,
  onCancel,
  placeholder = "Write a reply...",
  autoFocus = false,
}: InlineReplyComposerProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      toast.error('Reply cannot be empty');
      return;
    }

    if (trimmedContent.length > MAX_REPLY_LENGTH) {
      toast.error(`Reply must be less than ${MAX_REPLY_LENGTH} characters`);
      return;
    }

    setLoading(true);
    try {
      const success = await createPostReply(postId, trimmedContent, parentReplyId);
      if (success) {
        setContent("");
        setIsFocused(false);
        onReplyCreated();
      }
    } catch {
      toast.error('Failed to post reply');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  const handleCancel = () => {
    setContent("");
    setIsFocused(false);
    onCancel?.();
  };

  const remainingChars = MAX_REPLY_LENGTH - content.length;
  const isNearLimit = remainingChars <= 50;
  const isOverLimit = remainingChars < 0;
  const showExpanded = isFocused || content.length > 0;

  return (
    <div className={cn(
      "relative rounded-lg border bg-background transition-all",
      showExpanded ? "ring-1 ring-primary/20" : "",
      loading && "opacity-70"
    )}>
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_REPLY_LENGTH + 50))}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        className={cn(
          "min-h-[40px] border-0 focus-visible:ring-0 resize-none transition-all",
          showExpanded ? "min-h-[80px]" : ""
        )}
        disabled={loading}
        maxLength={MAX_REPLY_LENGTH + 50}
      />

      {showExpanded && (
        <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
                className="h-7 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
            <span className={cn(
              "text-xs",
              isOverLimit ? "text-destructive font-medium" : isNearLimit ? "text-yellow-600" : "text-muted-foreground"
            )}>
              {remainingChars}
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !content.trim() || isOverLimit}
            className="h-7 px-3 gap-1"
          >
            {loading ? (
              "Posting..."
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Reply
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
