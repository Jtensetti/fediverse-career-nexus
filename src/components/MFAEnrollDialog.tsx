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
import { Loader2, Copy, CheckCircle, ShieldCheck } from "lucide-react";
import { enrollTOTP, verifyEnrollment, EnrollmentResult } from "@/services/mfaService";

interface MFAEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function MFAEnrollDialog({ open, onOpenChange, onSuccess }: MFAEnrollDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'qr' | 'verify' | 'success'>('qr');
  const [enrollment, setEnrollment] = useState<EnrollmentResult | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  // Start enrollment when dialog opens
  useEffect(() => {
    if (open && !enrollment) {
      startEnrollment();
    }
    if (!open) {
      // Reset state when dialog closes
      setStep('qr');
      setEnrollment(null);
      setCode("");
      setSecretCopied(false);
    }
  }, [open]);

  const startEnrollment = async () => {
    setIsLoading(true);
    try {
      const result = await enrollTOTP();
      setEnrollment(result);
    } catch (error: any) {
      toast.error(error.message || t("mfa.enrollError", "Failed to start enrollment"));
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6 || !enrollment) return;

    setIsVerifying(true);
    try {
      await verifyEnrollment(enrollment.id, code);
      setStep('success');
      toast.success(t("mfa.enrollSuccess", "Two-factor authentication enabled!"));
      // Short delay before closing
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || t("mfa.verifyError", "Invalid code. Please try again."));
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const copySecret = () => {
    if (enrollment?.totp.secret) {
      navigator.clipboard.writeText(enrollment.totp.secret);
      setSecretCopied(true);
      toast.success(t("mfa.secretCopied", "Secret copied to clipboard"));
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === 6 && step === 'qr') {
      handleVerify();
    }
  }, [code]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("mfa.enrollTitle", "Set Up Two-Factor Authentication")}
          </DialogTitle>
          <DialogDescription>
            {step === 'success' 
              ? t("mfa.enrollSuccessDesc", "Your account is now protected with 2FA.")
              : t("mfa.enrollDesc", "Scan the QR code with your authenticator app.")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t("mfa.generating", "Generating QR code...")}
            </p>
          </div>
        ) : step === 'success' ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <p className="mt-4 text-center font-medium">
              {t("mfa.enabled", "Two-factor authentication is now enabled!")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* QR Code */}
            {enrollment?.totp.qr_code && (
              <div className="flex flex-col items-center">
                <div 
                  className="rounded-lg border bg-white p-4"
                  dangerouslySetInnerHTML={{ __html: enrollment.totp.qr_code }}
                />
              </div>
            )}

            {/* Manual entry secret */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {t("mfa.cantScan", "Can't scan? Enter this code manually:")}
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                  {enrollment?.totp.secret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copySecret}
                  className="shrink-0"
                >
                  {secretCopied ? (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Verification code input */}
            <div className="space-y-3">
              <Label>
                {t("mfa.enterCode", "Enter the 6-digit code from your app:")}
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
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
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isVerifying}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("mfa.verifying", "Verifying...")}
                  </>
                ) : (
                  t("mfa.verify", "Verify & Enable")
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
