import { useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createPostReply } from "@/services/postReplyService";
import { toast } from "sonner";

const MAX_REPLY_LENGTH = 500;

const replySchema = z.object({
  content: z
    .string()
    .min(1, "Reply cannot be empty")
    .max(MAX_REPLY_LENGTH, `Reply must be less than ${MAX_REPLY_LENGTH} characters`),
});

interface PostReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onReplyCreated: () => void;
}

export default function PostReplyDialog({ open, onOpenChange, postId, onReplyCreated }: PostReplyDialogProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContentChange = (value: string) => {
    // Enforce max length at input level
    if (value.length <= MAX_REPLY_LENGTH) {
      setContent(value);
    }
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async () => {
    // Validate input
    const result = replySchema.safeParse({ content: content.trim() });
    
    if (!result.success) {
      setError(result.error.errors[0]?.message || "Invalid input");
      return;
    }
    
    setLoading(true);
    try {
      const success = await createPostReply(postId, content.trim());
      if (success) {
        setContent("");
        setError(null);
        onReplyCreated();
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setContent("");
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const remainingChars = MAX_REPLY_LENGTH - content.length;
  const isNearLimit = remainingChars <= 50;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reply to Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            placeholder="Write your reply..."
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className={`min-h-[100px] mt-2 ${error ? "border-destructive" : ""}`}
            disabled={loading}
            aria-invalid={!!error}
            maxLength={MAX_REPLY_LENGTH}
          />
          <div className="flex justify-between items-center">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <span />
            )}
            <p className={`text-sm ${isNearLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {remainingChars} characters remaining
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !content.trim()}>
            {loading ? "Posting..." : "Reply"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
