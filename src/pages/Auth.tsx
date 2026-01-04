
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Globe, Loader2, Shield, Users, Zap, ArrowLeft } from "lucide-react";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFederatedLoading, setIsFederatedLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fediHandle, setFediHandle] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        throw error;
      }

      if (data.user && !data.user.email_confirmed_at) {
        toast.success("Please check your email to confirm your account");
      } else {
        toast.success("Account created successfully!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        toast.success("Signed in successfully!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFederatedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fediHandle) {
      toast.error("Please enter your Fediverse handle");
      return;
    }

    // Validate handle format
    const handlePattern = /^@?[a-zA-Z0-9_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!handlePattern.test(fediHandle)) {
      toast.error("Invalid handle format. Use @username@instance.social");
      return;
    }

    setIsFederatedLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      
      const response = await supabase.functions.invoke('federated-auth-init', {
        body: { 
          handle: fediHandle,
          redirectUri 
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to initiate federated login');
      }

      const { authorizationUrl, error } = response.data;
      
      if (error) {
        throw new Error(error);
      }

      if (authorizationUrl) {
        // Store state in session storage for callback verification
        sessionStorage.setItem('federated_auth_redirect', redirectUri);
        // Redirect to the remote instance for authorization
        window.location.href = authorizationUrl;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to connect with your Fediverse instance");
    } finally {
      setIsFederatedLoading(false);
    }
  };

  const trustFeatures = [
    { icon: Shield, text: "No tracking or data selling" },
    { icon: Users, text: "Own your professional identity" },
    { icon: Zap, text: "Connect across the Fediverse" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4">
        <Button variant="ghost" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="flex-grow flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Branding */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                alt="Nolto" 
                className="w-16 h-16" 
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground font-display">Welcome to Nolto</h1>
            <p className="mt-2 text-muted-foreground">
              The federated professional network that puts you in control
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {trustFeatures.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <feature.icon className="h-3 w-3" />
                  <span className="text-xs">{feature.text}</span>
                </Badge>
              ))}
            </div>
          </div>

          <Card className="shadow-lg border-2">
            {/* Fediverse Login - Prominent at top */}
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Login with Fediverse
              </CardTitle>
              <CardDescription>
                Use your existing Mastodon, Pleroma, or other Fediverse account
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <form onSubmit={handleFederatedLogin} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    value={fediHandle}
                    onChange={(e) => setFediHandle(e.target.value)}
                    placeholder="@username@mastodon.social"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isFederatedLoading}
                >
                  {isFederatedLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Continue with Fediverse
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <div className="relative px-6">
              <div className="absolute inset-0 flex items-center px-6">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or use email
                </span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mx-6 mt-4" style={{ width: 'calc(100% - 48px)' }}>
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <CardContent className="space-y-4 pt-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign In with Email"}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>

              <TabsContent value="signup">
                <CardContent className="space-y-4 pt-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password (min 6 characters)"
                        required
                        minLength={6}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating account..." : "Create Account with Email"}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground">
            By signing up, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>
            {" "}and{" "}
            <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
