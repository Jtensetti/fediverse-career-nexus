import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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

export default function CommentEditDialog({ open, onOpenChange, commentId, initialContent, onUpdated }: CommentEditDialogProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && initialContent) {
      const text = initialContent.replace(/<[^>]*>/g, '');
      setContent(text);
    }
  }, [open, initialContent]);

  const handleSave = async () => {
    if (!commentId || !content.trim()) return;
    setLoading(true);
    try {
      await updatePostReply(commentId, content);
      toast.success(t("commentEdit.updated"));
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || t("commentEdit.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("commentEdit.title")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("commentEdit.placeholder")} className="min-h-[120px] resize-none" disabled={loading} maxLength={500} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{content.length}/500</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{t("commentEdit.cancel")}</Button>
              <Button onClick={handleSave} disabled={loading || !content.trim()}>{loading ? t("commentEdit.saving") : t("commentEdit.save")}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
