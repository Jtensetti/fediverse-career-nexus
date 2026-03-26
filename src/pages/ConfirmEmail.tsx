import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { SEOHead } from "@/components/common/SEOHead";

type ConfirmationStatus = "loading" | "success" | "error" | "expired";

const ConfirmEmail = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConfirmationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    const confirmEmail = async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage(t("confirmEmail.noToken"));
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("auth-confirm-email", {
          body: { token },
        });

        if (error) {
          setStatus("error");
          setErrorMessage(error.message || t("confirmEmail.failed"));
          return;
        }

        if (data?.error) {
          if (data.error.includes("expired")) {
            setStatus("expired");
          } else {
            setStatus("error");
          }
          setErrorMessage(data.error);
          return;
        }

        setStatus("success");
        toast.success(t("toasts.emailConfirmed"));
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message || t("confirmEmail.failed"));
      }
    };

    confirmEmail();
  }, [token, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SEOHead title={t("confirmEmail.title")} description={t("confirmEmail.pleaseWait")} />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <CardTitle>{t("confirmEmail.confirming")}</CardTitle>
              <CardDescription>{t("confirmEmail.pleaseWait")}</CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-green-600">{t("confirmEmail.confirmed")}</CardTitle>
              <CardDescription>{t("confirmEmail.confirmedDesc")}</CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-destructive">{t("confirmEmail.failed")}</CardTitle>
              <CardDescription>{errorMessage || t("confirmEmail.couldNotConfirm")}</CardDescription>
            </>
          )}

          {status === "expired" && (
            <>
              <div className="mx-auto mb-4">
                <Mail className="h-12 w-12 text-muted-foreground" />
              </div>
              <CardTitle>{t("confirmEmail.linkExpired")}</CardTitle>
              <CardDescription>{t("confirmEmail.linkExpiredDesc")}</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {status === "success" && (
            <Button onClick={() => navigate("/auth")} className="w-full">
              {t("confirmEmail.continueToSignIn")}
            </Button>
          )}

          {(status === "error" || status === "expired") && (
            <>
              <Button onClick={() => navigate("/auth")} className="w-full">
                {t("confirmEmail.goToSignUp")}
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                {t("confirmEmail.returnHome")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;
