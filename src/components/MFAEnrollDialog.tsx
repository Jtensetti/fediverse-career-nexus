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
import { Loader2, Copy, CheckCircle, ShieldCheck, Smartphone, QrCode } from "lucide-react";
import { enrollTOTP, verifyEnrollment, EnrollmentResult } from "@/services/mfaService";
import { useIsMobile } from "@/hooks/use-mobile";

interface MFAEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function MFAEnrollDialog({ open, onOpenChange, onSuccess }: MFAEnrollDialogProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<'setup' | 'verify' | 'success'>('setup');
  const [enrollment, setEnrollment] = useState<EnrollmentResult | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [showQRCode, setShowQRCode] = useState(!isMobile);

  // Start enrollment when dialog opens
  useEffect(() => {
    if (open && !enrollment) {
      startEnrollment();
    }
    if (!open) {
      // Reset state when dialog closes
      setStep('setup');
      setEnrollment(null);
      setCode("");
      setSecretCopied(false);
      setShowQRCode(!isMobile);
    }
  }, [open, isMobile]);

  const startEnrollment = async () => {
    setIsLoading(true);
    try {
      // Use "Nolto" as the issuer - this appears in authenticator apps
      const result = await enrollTOTP('Nolto');
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

  const openAuthenticatorApp = () => {
    if (enrollment?.totp.uri) {
      // Open the otpauth:// URI which will trigger the authenticator app
      window.location.href = enrollment.totp.uri;
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
    if (code.length === 6 && step === 'setup') {
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
              : isMobile 
                ? t("mfa.enrollDescMobile", "Add your account to an authenticator app.")
                : t("mfa.enrollDesc", "Scan the QR code with your authenticator app.")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t("mfa.generating", "Generating setup...")}
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
          <div className="space-y-5">
            {/* Mobile: Primary action is to open authenticator app */}
            {isMobile && enrollment?.totp.uri && (
              <div className="space-y-3">
                <Button 
                  onClick={openAuthenticatorApp}
                  className="w-full"
                  size="lg"
                >
                  <Smartphone className="mr-2 h-5 w-5" />
                  {t("mfa.openAuthenticator", "Open Authenticator App")}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  {t("mfa.openAuthenticatorHint", "This will add Nolto to your authenticator app automatically")}
                </p>
              </div>
            )}

            {/* Toggle to show QR code on mobile */}
            {isMobile && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowQRCode(!showQRCode)}
              >
                <QrCode className="mr-2 h-4 w-4" />
                {showQRCode 
                  ? t("mfa.hideQR", "Hide QR Code") 
                  : t("mfa.showQR", "Show QR Code Instead")}
              </Button>
            )}

            {/* QR Code - always shown on desktop, toggleable on mobile */}
            {showQRCode && enrollment?.totp.qr_code && (
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
                {isMobile 
                  ? t("mfa.manualEntry", "Or enter this code manually:")
                  : t("mfa.cantScan", "Can't scan? Enter this code manually:")}
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
