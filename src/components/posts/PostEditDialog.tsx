import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { updatePost } from "@/services/posts/postService";
import { isPoll } from "@/services/posts/pollService";
import type { FederatedPost } from "@/services/federation/federationService";

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
      let text = "";
      if (post.type === 'Create' && post.content.object?.content) {
        text = post.content.object.content;
      } else if (post.content.content) {
        text = post.content.content;
      }
      
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
      toast.success("Inlägget uppdaterat");
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Kunde inte uppdatera inlägget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{postIsPoll ? "Redigera omröstning" : "Redigera inlägg"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={postIsPoll ? "Redigera din omröstningsfråga..." : "Vad tänker du på?"}
            className="min-h-[150px] resize-none"
            disabled={loading}
          />
          
          {postIsPoll && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Omröstningsalternativ kan inte redigeras efter att de skapats för att bevara rösternas integritet. 
                Du kan bara redigera frågetexten ovan.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={loading || !content.trim()}>
              {loading ? "Sparar..." : "Spara ändringar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
