
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
      console.log('📝 Setting edit content from post:', post);
      // Extract content from different ActivityPub formats
      let text = "";
      if (post.type === 'Create' && post.content.object?.content) {
        text = post.content.object.content;
      } else if (post.content.content) {
        text = post.content.content;
      }
      
      // Remove HTML tags if present
      text = text.replace(/<[^>]*>/g, '');
      setContent(text);
      console.log('📝 Extracted content for editing:', text);
    }
  }, [post]);

  const handleSave = async () => {
    if (!post) {
      console.error('❌ No post to update');
      return;
    }
    
    console.log('💾 Saving post update:', { postId: post.id, content });
    setLoading(true);
    
    try {
      await updatePost(post.id, { content });
      console.log('✅ Post update successful');
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      console.error('❌ Post update failed:', err);
      toast.error(err.message || "Failed to update post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-[200px] resize-none"
            disabled={loading}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !content.trim()}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
