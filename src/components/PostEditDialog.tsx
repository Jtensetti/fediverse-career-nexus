import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { updatePost } from "@/services/postService";
import { isPoll } from "@/services/pollService";
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

  const postIsPoll = useMemo(() => {
    if (!post?.content) return false;
    return isPoll(post.content);
  }, [post]);

  useEffect(() => {
    if (post) {
      // Extract content from different ActivityPub formats
      let text = "";
      if (post.type === 'Create' && post.content.object?.content) {
        text = post.content.object.content;
      } else if (post.content.content) {
        text = post.content.content;
      }
      
      // Convert HTML line breaks to newlines before stripping tags
      text = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      setContent(text);
    }
  }, [post]);

  const handleSave = async () => {
    if (!post) return;
    
    setLoading(true);
    
    try {
      await updatePost(post.id, { content });
      toast.success("Post updated");
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{postIsPoll ? "Edit Poll" : "Edit Post"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={postIsPoll ? "Edit your poll question..." : "What's on your mind?"}
            className="min-h-[150px] resize-none"
            disabled={loading}
          />
          
          {postIsPoll && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Poll options cannot be edited after creation to preserve vote integrity. 
                You can only edit the question text above.
              </AlertDescription>
            </Alert>
          )}
          
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
