import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/common/SEOHead";

type CallbackStatus = 'processing' | 'success' | 'error';

export default function AuthCallback() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let navigateTimer: number | undefined;
    let cancelled = false;

    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(errorDescription || `${error}`);
        return;
      }

      if (!code || !state) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(t("authCallback.invalidParams"));
        return;
      }

      try {
        const redirectUri = sessionStorage.getItem('federated_auth_redirect') || `${window.location.origin}/auth/callback`;
        sessionStorage.removeItem('federated_auth_redirect');

        const response = await supabase.functions.invoke('federated-auth-callback', {
          body: { code, state, redirectUri }
        });

        if (response.error) {
          throw new Error(response.error.message || t("authCallback.failed"));
        }

        const { success, error: callbackError, profile: userProfile, auth, isNewUser } = response.data;

        if (callbackError || !success) {
          throw new Error(callbackError || t("authCallback.failed"));
        }

        if (cancelled) return;
        setProfile(userProfile);

        if (auth?.token) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: auth.token,
            type: 'magiclink'
          });

          if (verifyError) {
            throw new Error(t("authCallback.failed"));
          }
        } else {
          throw new Error(t("authCallback.failed"));
        }

        if (cancelled) return;
        setStatus('success');

        if (isNewUser) {
          toast.success(t("authCallback.welcome"));
        } else {
          toast.success(`${t("authCallback.welcome")} ${userProfile.fullname || userProfile.username}!`);
        }

        navigateTimer = window.setTimeout(() => {
          if (!cancelled) navigate('/', { replace: true });
        }, 2000);

      } catch (error: any) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(error.message || t("authCallback.failed"));
      }
    };

    processCallback();

    return () => {
      cancelled = true;
      if (navigateTimer !== undefined) window.clearTimeout(navigateTimer);
    };
  }, [searchParams, navigate, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <SEOHead title={t("authCallback.title")} description={t("authCallback.processingDesc")} />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <CardTitle>{t("authCallback.processing")}</CardTitle>
              <CardDescription>{t("authCallback.processingDesc")}</CardDescription>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle>{t("authCallback.welcome")}</CardTitle>
              <CardDescription>
                {t("authCallback.authenticatedVia")} {profile?.home_instance}
              </CardDescription>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>{t("authCallback.failed")}</CardTitle>
              <CardDescription className="text-destructive">{errorMessage}</CardDescription>
            </>
          )}
        </CardHeader>

        {status === 'success' && profile && (
          <CardContent className="text-center">
            <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
              {profile.avatar_url && (
                <img src={profile.avatar_url} alt={profile.username} className="w-12 h-12 rounded-full" />
              )}
              <div className="text-left">
                <p className="font-medium">{profile.fullname}</p>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">{t("authCallback.redirecting")}</p>
          </CardContent>
        )}

        {status === 'error' && (
          <CardContent className="text-center space-y-4">
            <Button onClick={() => navigate('/auth', { replace: true })} className="w-full">
              {t("authCallback.tryAgain")}
            </Button>
            <Button variant="outline" onClick={() => navigate('/', { replace: true })} className="w-full">
              {t("authCallback.goHome")}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
