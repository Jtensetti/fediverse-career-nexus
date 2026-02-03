import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { challengeAndVerify } from "@/services/mfaService";

interface MFAVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function MFAVerifyDialog({ 
  open, 
  onOpenChange, 
  factorId, 
  onSuccess,
  onCancel 
}: MFAVerifyDialogProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCode("");
      setError(null);
    }
  }, [open]);

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setIsVerifying(true);
    setError(null);
    
    try {
      await challengeAndVerify(factorId, code);
      toast.success(t("mfa.loginSuccess", "Verified successfully!"));
      onSuccess();
    } catch (err: any) {
      setError(err.message || t("mfa.invalidCode", "Invalid code. Please try again."));
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    onCancel?.();
  };

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === 6) {
      handleVerify();
    }
  }, [code]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("mfa.verifyTitle", "Two-Factor Authentication")}
          </DialogTitle>
          <DialogDescription>
            {t("mfa.verifyDesc", "Enter the 6-digit code from your authenticator app to continue.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>
              {t("mfa.authCode", "Authentication Code")}
            </Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setError(null);
                }}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("mfa.verifying", "Verifying...")}
                </>
              ) : (
                t("mfa.continue", "Continue")
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isVerifying}
              className="w-full"
            >
              {t("mfa.useAnotherMethod", "Cancel sign in")}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t("mfa.lostAccess", "Lost access to your authenticator?")} {" "}
            <a href="/help" className="text-primary hover:underline">
              {t("mfa.contactSupport", "Contact support")}
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
