import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import InlineErrorBanner from "@/components/forms/InlineErrorBanner";
import { useContentCheck } from '@/hooks/useContentCheck';
import { useRef, useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { updatePost } from "@/services/posts/postService";
import { isPoll } from "@/services/posts/pollService";
import type { FederatedPost } from "@/services/federation/federationService";

import { tx } from "@/i18n/tx";
interface PostEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: FederatedPost | null;
  onUpdated: () => void;
}

export default function PostEditDialog({ open, onOpenChange, post, onUpdated }: PostEditDialogProps) {
  const [content, setContent] = useState("");
  const contentCheck = useContentCheck();
  const [loading, setLoading] = useState(false);
  const [initialText, setInitialText] = useState("");
  const initialized = useRef<string | null>(null);
  const [submitError, setSubmitError] = useState(false);
  const confirmDiscard = useUnsavedChanges({ dirty: open && content !== initialText, message: tx("ux.leaveDescription") });
  const requestClose = () => { if (!loading && !contentCheck.checking) confirmDiscard(() => onOpenChange(false)); };

  const postIsPoll = useMemo(() => {
    if (!post?.content) return false;
    return isPoll(post.content);
  }, [post, open]);

  useEffect(() => {
    if (!open) { initialized.current = null; return; }
    if (post && initialized.current !== post.id) {
      initialized.current = post.id;
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

      setInitialText(text);
      setContent(text);
      setSubmitError(false);
    }
  }, [post, open]);

  const handleSave = async () => {
    if (!post || loading || contentCheck.checking) return;

    if (!await contentCheck.check(content)) return;
    setLoading(true);
    setSubmitError(false);

    try {
      await updatePost(post.id, { content });
      onUpdated();
      confirmDiscard.afterSave(() => onOpenChange(false));
    } catch (err: any) {
      setSubmitError(true);
      toast.error(err.message || tx("ux.saveUnconfirmed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => next ? onOpenChange(true) : requestClose()}>
            <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{postIsPoll ? tx("ui.postEditDialog.redigeraOmrostning") : tx("ui.postEditDialog.redigeraInlagg")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {submitError && <InlineErrorBanner message={tx("ux.saveUnconfirmed")} />}
          <Textarea
            aria-label={tx("ui.postEditDialog.redigeraInlagg")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={postIsPoll ? tx("ui.postEditDialog.redigeraDinOmrostningsfraga") : tx("ui.postEditDialog.vadTankerDuPa")}
            className="min-h-[150px] resize-none"
            disabled={contentCheck.checking || loading}
          />

          {postIsPoll && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {tx("ui.postEditDialog.omrostningsalternativKanInteRedigeras")}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={requestClose} disabled={contentCheck.checking || loading}>
              {tx("ui.postEditDialog.avbryt")}
            </Button>
            <Button onClick={handleSave} disabled={contentCheck.checking || loading || !content.trim()}>
              {loading ? tx("ui.postEditDialog.sparar") : tx("ui.postEditDialog.sparaAndringar")}
            </Button>
          </div>
        </div>
      </DialogContent>
      {contentCheck.dialog}
    </Dialog>
  );
}
