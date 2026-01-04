
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type CallbackStatus = 'processing' | 'success' | 'error';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth errors from the remote instance
      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || `Authentication was denied: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setErrorMessage('Invalid callback parameters. Please try logging in again.');
        return;
      }

      try {
        // Get the redirect URI we stored earlier
        const redirectUri = sessionStorage.getItem('federated_auth_redirect') || `${window.location.origin}/auth/callback`;
        sessionStorage.removeItem('federated_auth_redirect');

        // Call the callback edge function
        const response = await supabase.functions.invoke('federated-auth-callback', {
          body: { 
            code,
            state,
            redirectUri
          }
        });

        if (response.error) {
          throw new Error(response.error.message || 'Failed to complete authentication');
        }

        const { success, error: callbackError, profile: userProfile, auth, isNewUser } = response.data;

        if (callbackError || !success) {
          throw new Error(callbackError || 'Authentication failed');
        }

        setProfile(userProfile);

        // Use the magic link token to create a session
        if (auth?.token) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: auth.token,
            type: 'magiclink'
          });

          if (verifyError) {
            console.error('Session verification error:', verifyError);
            // Even if this fails, the user might still be logged in
          }
        }

        setStatus('success');
        
        if (isNewUser) {
          toast.success(`Welcome to Nolto! Your account has been linked to your Fediverse identity.`);
        } else {
          toast.success(`Welcome back, ${userProfile.fullname || userProfile.username}!`);
        }

        // Redirect after a short delay to show success message
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);

      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'An unexpected error occurred');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <CardTitle>Completing Sign In</CardTitle>
              <CardDescription>
                Please wait while we verify your identity with your Fediverse instance...
              </CardDescription>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle>Welcome to Nolto!</CardTitle>
              <CardDescription>
                Successfully authenticated via {profile?.home_instance}
              </CardDescription>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>Authentication Failed</CardTitle>
              <CardDescription className="text-destructive">
                {errorMessage}
              </CardDescription>
            </>
          )}
        </CardHeader>

        {status === 'success' && profile && (
          <CardContent className="text-center">
            <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
              {profile.avatar_url && (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.username}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div className="text-left">
                <p className="font-medium">{profile.fullname}</p>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Redirecting you to the home page...
            </p>
          </CardContent>
        )}

        {status === 'error' && (
          <CardContent className="text-center space-y-4">
            <Button 
              onClick={() => navigate('/auth', { replace: true })}
              className="w-full"
            >
              Try Again
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/', { replace: true })}
              className="w-full"
            >
              Go Home
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
