import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Send, X, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createPostReply } from "@/services/postReplyService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_REPLY_LENGTH = 500;

interface CompanyContext {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface InlineReplyComposerProps {
  postId: string;
  parentReplyId?: string;
  onReplyCreated: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Company the user can reply as (if they have a role) */
  companyContext?: CompanyContext;
}

export default function InlineReplyComposer({
  postId,
  parentReplyId,
  onReplyCreated,
  onCancel,
  placeholder,
  autoFocus = false,
  companyContext,
}: InlineReplyComposerProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [replyAsCompany, setReplyAsCompany] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error(t("comments.signInToReply", "Please sign in to reply"));
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      toast.error(t("comments.emptyReply", "Reply cannot be empty"));
      return;
    }

    if (trimmedContent.length > MAX_REPLY_LENGTH) {
      toast.error(t("comments.replyTooLong", `Reply must be less than ${MAX_REPLY_LENGTH} characters`));
      return;
    }

    setLoading(true);
    try {
      const success = await createPostReply(
        postId,
        trimmedContent,
        parentReplyId,
        replyAsCompany && companyContext ? companyContext.id : undefined
      );
      if (success) {
        setContent("");
        setIsFocused(false);
        onReplyCreated();
      }
    } catch {
      toast.error(t("comments.failedToPost", "Failed to post reply"));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  const handleCancel = () => {
    setContent("");
    setIsFocused(false);
    setReplyAsCompany(false);
    onCancel?.();
  };

  const remainingChars = MAX_REPLY_LENGTH - content.length;
  const isNearLimit = remainingChars <= 50;
  const isOverLimit = remainingChars < 0;
  const showExpanded = isFocused || content.length > 0;

  return (
    <div 
      className={cn(
        "relative rounded-lg border bg-background transition-all",
        showExpanded ? "ring-1 ring-primary/20" : "",
        loading && "opacity-70"
      )}
      data-interactive="true"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* Company toggle indicator */}
      {replyAsCompany && companyContext && (
        <div className="flex items-center gap-1.5 px-3 pt-2 text-xs text-primary font-medium">
          <Building2 className="h-3.5 w-3.5" />
          {t("comments.replyingAs", "Replying as {{name}}", { name: companyContext.name })}
        </div>
      )}

      <Textarea
        ref={textareaRef}
        placeholder={
          replyAsCompany && companyContext
            ? t("comments.writeReplyAsCompany", "Reply as {{name}}...", { name: companyContext.name })
            : placeholder || t("comments.writeReply", "Write a reply...")
        }
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_REPLY_LENGTH + 50))}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        className={cn(
          "min-h-[40px] border-0 focus-visible:ring-0 resize-none transition-all",
          showExpanded ? "min-h-[80px]" : ""
        )}
        disabled={loading}
        maxLength={MAX_REPLY_LENGTH + 50}
      />

      {showExpanded && (
        <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
                className="h-7 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                {t("comments.cancel", "Cancel")}
              </Button>
            )}

            {/* Company toggle */}
            {companyContext && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      pressed={replyAsCompany}
                      onPressedChange={setReplyAsCompany}
                      size="sm"
                      className={cn(
                        "h-7 px-2 gap-1 text-xs",
                        replyAsCompany && "bg-primary/10 text-primary border-primary/30"
                      )}
                      aria-label={t("comments.toggleCompanyReply", "Toggle reply as company")}
                    >
                      {replyAsCompany ? (
                        <Building2 className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                      {replyAsCompany ? companyContext.name : t("comments.you", "You")}
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>
                    {replyAsCompany
                      ? t("comments.switchToPersonal", "Switch to replying as yourself")
                      : t("comments.switchToCompany", "Reply as {{name}}", { name: companyContext.name })}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <span className={cn(
              "text-xs",
              isOverLimit ? "text-destructive font-medium" : isNearLimit ? "text-yellow-600" : "text-muted-foreground"
            )}>
              {remainingChars}
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !content.trim() || isOverLimit}
            className="h-7 px-3 gap-1"
          >
            {loading ? (
              t("comments.posting", "Posting...")
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                {t("comments.reply", "Reply")}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
