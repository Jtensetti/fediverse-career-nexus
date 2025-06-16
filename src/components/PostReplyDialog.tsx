
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createPostReply } from "@/services/postReplyService";

interface PostReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onReplyCreated: () => void;
}

export default function PostReplyDialog({ open, onOpenChange, postId, onReplyCreated }: PostReplyDialogProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      const success = await createPostReply(postId, content);
      if (success) {
        setContent("");
        onReplyCreated();
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reply to Post</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Write your reply..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] mt-2"
          disabled={loading}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
