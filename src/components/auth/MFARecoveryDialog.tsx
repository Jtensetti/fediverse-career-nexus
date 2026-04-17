import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface MFARecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Silently captured: the email of the account that authenticated with
   * password but failed/abandoned MFA. Sent to admins so they can verify
   * whether the form email matches the account that tried to sign in.
   */
  attemptedLoginEmail?: string | null;
}

export default function MFARecoveryDialog({
  open,
  onOpenChange,
  attemptedLoginEmail,
}: MFARecoveryDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "request-mfa-recovery",
        {
          body: {
            email: email.trim(),
            username: username.trim() || undefined,
            message: message.trim() || undefined,
            attempted_login_email: attemptedLoginEmail || undefined,
          },
        },
      );

      if (error || (data && data.error)) {
        const msg = (data && data.error) || error?.message || "Unknown error";
        toast.error(
          t("mfa.recoveryError", "Could not send request: {{msg}}", { msg }),
        );
        return;
      }

      setSubmitted(true);
      toast.success(
        t(
          "mfa.recoverySent",
          "Request sent. An admin will contact you shortly.",
        ),
      );
    } catch (err) {
      logger.error("MFA recovery submit failed:", err);
      toast.error(
        t("mfa.recoveryError", "Could not send request. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setEmail("");
      setUsername("");
      setMessage("");
      setSubmitted(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            {t("mfa.recoveryTitle", "Request account recovery")}
          </DialogTitle>
          <DialogDescription>
            {submitted
              ? t(
                  "mfa.recoverySubmittedDesc",
                  "We've notified our admins. They'll reach out to the email you provided.",
                )
              : t(
                  "mfa.recoveryDesc",
                  "Lost access to your authenticator app? Tell us how to reach you and an admin will help verify your identity and restore access.",
                )}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              {t("common.close", "Close")}
            </Button>
          </DialogFooter>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="recovery-email">
                {t("mfa.recoveryEmail", "Your email")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={submitting}
                maxLength={320}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recovery-username">
                {t("mfa.recoveryUsername", "Username (optional)")}
              </Label>
              <Input
                id="recovery-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@yourhandle"
                disabled={submitting}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recovery-message">
                {t("mfa.recoveryMessage", "Additional details (optional)")}
              </Label>
              <Textarea
                id="recovery-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t(
                  "mfa.recoveryMessagePlaceholder",
                  "Briefly describe what happened (e.g., lost phone, replaced device).",
                )}
                rows={4}
                disabled={submitting}
                maxLength={2000}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={submitting}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={submitting || !email.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("mfa.recoverySending", "Sending...")}
                  </>
                ) : (
                  t("mfa.recoverySend", "Send request")
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
