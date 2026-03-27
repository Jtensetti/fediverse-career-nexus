import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createPostReply } from "@/services/posts/postReplyService";
import { toast } from "sonner";

const MAX_REPLY_LENGTH = 500;

interface PostReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onReplyCreated: () => void;
}

export default function PostReplyDialog({ open, onOpenChange, postId, onReplyCreated }: PostReplyDialogProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContentChange = (value: string) => {
    if (value.length <= MAX_REPLY_LENGTH) setContent(value);
    if (error) setError(null);
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) { setError(t("postReply.emptyError")); return; }
    if (trimmed.length > MAX_REPLY_LENGTH) { setError(t("postReply.tooLongError", { max: MAX_REPLY_LENGTH })); return; }
    setLoading(true);
    try {
      const success = await createPostReply(postId, trimmed);
      if (success) { setContent(""); setError(null); onReplyCreated(); onOpenChange(false); }
    } catch { toast.error(t("postReply.failed")); } finally { setLoading(false); }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) { setContent(""); setError(null); }
    onOpenChange(isOpen);
  };

  const remainingChars = MAX_REPLY_LENGTH - content.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("postReply.title")}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Textarea placeholder={t("postReply.placeholder")} value={content} onChange={(e) => handleContentChange(e.target.value)} className={`min-h-[100px] mt-2 ${error ? "border-destructive" : ""}`} disabled={loading} aria-invalid={!!error} maxLength={MAX_REPLY_LENGTH} />
          <div className="flex justify-between items-center">
            {error ? <p className="text-sm text-destructive">{error}</p> : <span />}
            <p className={`text-sm ${remainingChars <= 50 ? "text-destructive" : "text-muted-foreground"}`}>{remainingChars} {t("postReply.charactersRemaining")}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>{t("postReply.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading || !content.trim()}>{loading ? t("postReply.posting") : t("postReply.reply")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
