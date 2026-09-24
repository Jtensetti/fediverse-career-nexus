import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import InlineErrorBanner from "@/components/forms/InlineErrorBanner";
import { useContentCheck } from '@/hooks/useContentCheck';
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updatePostReply } from "@/services/posts/postReplyService";

interface CommentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commentId: string | null;
  initialContent: string;
  onUpdated: () => void;
}

export default function CommentEditDialog({ open, onOpenChange, commentId, initialContent, onUpdated }: CommentEditDialogProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const contentCheck = useContentCheck();
  const [loading, setLoading] = useState(false);
  const [initialText, setInitialText] = useState("");
  const initialized = useRef<string | null>(null);
  const [submitError, setSubmitError] = useState(false);
  const confirmDiscard = useUnsavedChanges({ dirty: open && content !== initialText, message: t("ux.leaveDescription") });
  const requestClose = () => { if (!loading && !contentCheck.checking) confirmDiscard(() => onOpenChange(false)); };

  useEffect(() => {
    if (!open) { initialized.current = null; return; }
    if (commentId && initialized.current !== commentId) {
      initialized.current = commentId;
      const text = initialContent.replace(/<[^>]*>/g, '');
      setInitialText(text);
      setContent(text);
      setSubmitError(false);
    }
  }, [open, initialContent, commentId]);

  const handleSave = async () => {
    if (!commentId || !content.trim() || loading || contentCheck.checking) return;
    if (!await contentCheck.check(content)) return;
    setLoading(true);
    setSubmitError(false);
    try {
      await updatePostReply(commentId, content);
      onUpdated();
      confirmDiscard.afterSave(() => onOpenChange(false));
    } catch (err: any) {
      setSubmitError(true);
      toast.error(err.message || t("commentEdit.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => next ? onOpenChange(true) : requestClose()}>
            <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("commentEdit.title")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {submitError && <InlineErrorBanner message={t("ux.saveUnconfirmed")} />}
          <Textarea aria-label={t("commentEdit.title")} value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("commentEdit.placeholder")} className="min-h-[120px] resize-none" disabled={contentCheck.checking || loading} maxLength={500} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{content.length}/500</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={requestClose} disabled={contentCheck.checking || loading}>{t("commentEdit.cancel")}</Button>
              <Button onClick={handleSave} disabled={contentCheck.checking || loading || !content.trim()}>{loading ? t("commentEdit.saving") : t("commentEdit.save")}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
      {contentCheck.dialog}
    </Dialog>
  );
}
