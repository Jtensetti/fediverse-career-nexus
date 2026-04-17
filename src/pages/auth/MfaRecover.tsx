import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

type State = "loading" | "needs_login" | "processing" | "success" | "error";

export default function MfaRecover() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [state, setState] = useState<State>("loading");
  const [errorKey, setErrorKey] = useState<string>("recoveryPageInvalid");

  useEffect(() => {
    if (loading) return;
    if (!token) {
      setState("error");
      setErrorKey("recoveryPageInvalid");
      return;
    }
    if (!user) {
      setState("needs_login");
      return;
    }
    setState("processing");
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "consume-mfa-recovery-token",
          { body: { token } },
        );
        if (error || (data as any)?.error) {
          const code = (data as any)?.error ?? "recoveryPageInvalid";
          setErrorKey(
            code === "wrong_user" ? "recoveryPageWrongUser" : "recoveryPageInvalid",
          );
          setState("error");
          return;
        }
        setState("success");
      } catch (err) {
        logger.error("MFA recovery failed:", err);
        setState("error");
      }
    })();
  }, [loading, user, token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("mfa.recoveryPageTitle", "Återställ tvåfaktorsautentisering")}
          </CardTitle>
          {state === "needs_login" && (
            <CardDescription>
              {t("mfa.recoveryPageDescLoggedOut", "Logga in med ditt lösenord för att slutföra återställningen.")}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {(state === "loading" || state === "processing") && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("mfa.recoveryPageProcessing", "Bekräftar återställning…")}
            </div>
          )}

          {state === "needs_login" && (
            <Button
              className="w-full"
              onClick={() =>
                navigate(
                  `/auth?redirect=${encodeURIComponent(`/aterstall-mfa?token=${token}`)}`,
                )
              }
            >
              {t("auth.login", "Logga in")}
            </Button>
          )}

          {state === "success" && (
            <>
              <p className="text-sm">
                <strong>{t("mfa.recoveryPageSuccess", "Tvåfaktorsautentisering återställd")}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                {t("mfa.recoveryPageSuccessDesc", "Du kan nu logga in utan kod. Vi rekommenderar att du aktiverar 2FA på nytt direkt.")}
              </p>
              <Button className="w-full" onClick={() => navigate("/profile/edit")}>
                {t("mfa.recoveryPageEnableNew", "Aktivera ny 2FA")}
              </Button>
            </>
          )}

          {state === "error" && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t(`mfa.${errorKey}`, "Länken är ogiltig eller har gått ut.")}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
