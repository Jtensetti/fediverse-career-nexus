import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Loader2, CheckCircle } from "lucide-react";
import { getMFAFactors, unenrollFactor, challengeAndVerify, MFAFactor } from "@/services/mfaService";
import MFAEnrollDialog from "./MFAEnrollDialog";

interface MFASettingsProps {
  isFederatedUser?: boolean;
}

export default function MFASettings({ isFederatedUser = false }: MFASettingsProps) {
  const { t } = useTranslation();
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);

  const verifiedFactor = factors.find(f => f.status === 'verified');
  const isEnabled = !!verifiedFactor;

  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    setIsLoading(true);
    try {
      const mfaFactors = await getMFAFactors();
      setFactors(mfaFactors);
    } catch (error) {
      console.error('Error loading MFA factors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (disableCode.length !== 6 || !verifiedFactor) return;

    setIsDisabling(true);
    try {
      // First verify the code to confirm user has access
      await challengeAndVerify(verifiedFactor.id, disableCode);
      
      // Then unenroll the factor
      await unenrollFactor(verifiedFactor.id);
      
      toast.success(t("mfa.disabled", "Two-factor authentication disabled"));
      setDisableDialogOpen(false);
      setDisableCode("");
      await loadFactors();
    } catch (error: any) {
      toast.error(error.message || t("mfa.disableError", "Failed to disable 2FA. Check your code."));
      setDisableCode("");
    } finally {
      setIsDisabling(false);
    }
  };

  const handleEnrollSuccess = () => {
    loadFactors();
  };

  // Federated users can't use local MFA
  if (isFederatedUser) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <Label className="text-base font-medium">
            {t("mfa.title", "Two-Factor Authentication")}
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("mfa.federatedNote", "As a federated user, your security settings are managed by your home instance. Configure 2FA on your Fediverse server to protect your account.")}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">
          {t("mfa.loading", "Loading security settings...")}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <Label className="text-base font-medium">
              {t("mfa.title", "Two-Factor Authentication")}
            </Label>
            {isEnabled && (
              <Badge variant="default" className="bg-primary/10 text-primary">
                <CheckCircle className="mr-1 h-3 w-3" />
                {t("mfa.enabled", "Enabled")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isEnabled 
              ? t("mfa.enabledDesc", "Your account is protected with two-factor authentication.")
              : t("mfa.description", "Add an extra layer of security by requiring a verification code when you sign in.")}
          </p>
        </div>
      </div>

      {isEnabled ? (
        <Button 
          variant="outline" 
          onClick={() => setDisableDialogOpen(true)}
          className="text-destructive hover:text-destructive"
        >
          <ShieldOff className="mr-2 h-4 w-4" />
          {t("mfa.disable", "Disable Two-Factor Authentication")}
        </Button>
      ) : (
        <Button onClick={() => setEnrollDialogOpen(true)}>
          <ShieldCheck className="mr-2 h-4 w-4" />
          {t("mfa.enable", "Enable Two-Factor Authentication")}
        </Button>
      )}

      {/* Enroll Dialog */}
      <MFAEnrollDialog
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        onSuccess={handleEnrollSuccess}
      />

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-destructive" />
              {t("mfa.disableTitle", "Disable Two-Factor Authentication?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("mfa.disableDesc", "This will remove the extra security from your account. Enter your current authentication code to confirm.")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-3">
            <Label>{t("mfa.enterCodeToDisable", "Enter your 6-digit code:")}</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={disableCode}
                onChange={setDisableCode}
                disabled={isDisabling}
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

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setDisableCode("")}
              disabled={isDisabling}
            >
              {t("common.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={disableCode.length !== 6 || isDisabling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisabling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("mfa.disabling", "Disabling...")}
                </>
              ) : (
                t("mfa.confirmDisable", "Disable 2FA")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
