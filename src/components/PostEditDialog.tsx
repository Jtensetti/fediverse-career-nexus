import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updatePost } from "@/services/postService";
import type { FederatedPost } from "@/services/federationService";

interface PostEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: FederatedPost | null;
  onUpdated: () => void;
}

export default function PostEditDialog({ open, onOpenChange, post, onUpdated }: PostEditDialogProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (post) {
      const text = (post.content.object?.content || post.content.content || "") as string;
      setContent(text);
    }
  }, [post]);

  const handleSave = async () => {
    if (!post) return;
    setLoading(true);
    try {
      await updatePost(post.id, { content });
      toast.success("Post updated successfully!");
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[200px] mt-2"
          disabled={loading}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !content.trim()}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
