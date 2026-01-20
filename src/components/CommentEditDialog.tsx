import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updatePostReply } from "@/services/postReplyService";

interface CommentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commentId: string | null;
  initialContent: string;
  onUpdated: () => void;
}

export default function CommentEditDialog({ 
  open, 
  onOpenChange, 
  commentId, 
  initialContent,
  onUpdated 
}: CommentEditDialogProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && initialContent) {
      // Remove HTML tags if present
      const text = initialContent.replace(/<[^>]*>/g, '');
      setContent(text);
    }
  }, [open, initialContent]);

  const handleSave = async () => {
    if (!commentId || !content.trim()) return;
    
    setLoading(true);
    
    try {
      await updatePostReply(commentId, content);
      toast.success("Comment updated");
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update comment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Comment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Edit your comment..."
            className="min-h-[120px] resize-none"
            disabled={loading}
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {content.length}/500
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading || !content.trim()}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
