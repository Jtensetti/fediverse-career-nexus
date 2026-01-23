import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { SEOHead } from "@/components/common/SEOHead";

type ConfirmationStatus = "loading" | "success" | "error" | "expired";

const ConfirmEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConfirmationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    const confirmEmail = async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage("No confirmation token provided");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("auth-confirm-email", {
          body: { token },
        });

        if (error) {
          console.error("Confirmation error:", error);
          setStatus("error");
          setErrorMessage(error.message || "Failed to confirm email");
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
        toast.success("Email confirmed successfully!");
      } catch (err: any) {
        console.error("Confirmation error:", err);
        setStatus("error");
        setErrorMessage(err.message || "An unexpected error occurred");
      }
    };

    confirmEmail();
  }, [token]);

  const handleContinue = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SEOHead title="Confirm Email" description="Verify your email address for Nolto." />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <CardTitle>Confirming your email...</CardTitle>
              <CardDescription>Please wait while we verify your email address.</CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-green-600">Email Confirmed!</CardTitle>
              <CardDescription>
                Your email has been successfully verified. You can now sign in to your account.
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Confirmation Failed</CardTitle>
              <CardDescription>{errorMessage || "We couldn't confirm your email address."}</CardDescription>
            </>
          )}

          {status === "expired" && (
            <>
              <div className="mx-auto mb-4">
                <Mail className="h-12 w-12 text-muted-foreground" />
              </div>
              <CardTitle>Link Expired</CardTitle>
              <CardDescription>
                This confirmation link has expired. Please sign up again or request a new confirmation email.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {status === "success" && (
            <Button onClick={handleContinue} className="w-full">
              Continue to Sign In
            </Button>
          )}

          {(status === "error" || status === "expired") && (
            <>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Go to Sign Up
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Return Home
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;
