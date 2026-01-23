import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { processReferralCode } from "@/services/referralService";
import { Globe, Loader2, Shield, Users, Zap, ArrowLeft, CheckCircle, XCircle } from "lucide-react";

export default function AuthPage() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isFederatedLoading, setIsFederatedLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [fediHandle, setFediHandle] = useState("");
  const [refCode, setRefCode] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  }>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Determine default tab based on URL path
  const defaultTab = location.pathname === "/auth/signup" ? "signup" : "signin";

  // Capture referral code from URL or localStorage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) {
      setRefCode(ref.toUpperCase());
      localStorage.setItem("referral_code", ref.toUpperCase());
    } else {
      const stored = localStorage.getItem("referral_code");
      if (stored) setRefCode(stored);
    }
  }, [location.search]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // Name validation helper - relaxed to support diverse naming conventions
  const validateName = (name: string, field: string): string | null => {
    const trimmed = name.trim();
    // Allow single character names (many cultures have them, also initials like "J.")
    if (trimmed.length < 1) {
      return `${field} is required`;
    }
    if (trimmed.length > 50) {
      return `${field} must be less than 50 characters`;
    }
    // Allow letters (including international), spaces, hyphens, apostrophes, and periods (for initials)
    if (!/^[a-zA-ZÀ-ÿ\s\-'.]+$/.test(trimmed)) {
      return `${field} can only contain letters, spaces, hyphens, apostrophes, and periods`;
    }
    return null;
  };

  // Real-time field validation
  const validateField = (field: 'firstName' | 'lastName' | 'email' | 'password', value: string) => {
    let error: string | undefined;
    
    if (field === 'firstName' || field === 'lastName') {
      const fieldName = field === 'firstName' ? 'First name' : 'Last name';
      const validationError = validateName(value, fieldName);
      error = validationError || undefined;
    } else if (field === 'email') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = 'Please enter a valid email address';
      }
    } else if (field === 'password') {
      if (value && value.length < 6) {
        error = 'Password must be at least 6 characters';
      }
    }
    
    setFieldErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  // Username validation
  const validateUsername = (value: string): string | null => {
    if (value.length > 0 && value.length < 3) return "At least 3 characters";
    if (value.length > 20) return "Maximum 20 characters";
    if (!/^[a-z0-9_]*$/.test(value)) return "Lowercase letters, numbers, underscores only";
    return null;
  };

  // Check username availability (debounced)
  useEffect(() => {
    if (!username || username.length < 3 || validateUsername(username)) {
      setUsernameAvailable(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const { data } = await supabase
          .from("public_profiles")
          .select("id")
          .eq("username", username.toLowerCase())
          .maybeSingle();

        setUsernameAvailable(!data);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [username]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFieldErrors({});

    // Validate all fields BEFORE setting loading state (fixes mobile stuck button)
    if (!email || !password || !firstName || !lastName) {
      const errors: typeof fieldErrors = {};
      if (!firstName) errors.firstName = "First name is required";
      if (!lastName) errors.lastName = "Last name is required";
      if (!email) errors.email = "Email is required";
      if (!password) errors.password = "Password is required";
      setFieldErrors(errors);
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate names
    const firstNameError = validateName(firstName, "First name");
    if (firstNameError) {
      setFieldErrors(prev => ({ ...prev, firstName: firstNameError }));
      toast.error(firstNameError);
      return;
    }

    const lastNameError = validateName(lastName, "Last name");
    if (lastNameError) {
      setFieldErrors(prev => ({ ...prev, lastName: lastNameError }));
      toast.error(lastNameError);
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setFieldErrors(prev => ({ ...prev, password: "Password must be at least 6 characters" }));
      toast.error("Password must be at least 6 characters");
      return;
    }

    // Only set loading AFTER all validation passes
    setIsLoading(true);
    try {
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const fullname = `${trimmedFirstName} ${trimmedLastName}`;
      const preferredUsername = username.trim().toLowerCase() || null;

      // Validate username if provided
      if (preferredUsername) {
        const usernameError = validateUsername(preferredUsername);
        if (usernameError) {
          toast.error(`Username: ${usernameError}`);
          setIsLoading(false);
          return;
        }
        if (usernameAvailable === false) {
          toast.error("This username is already taken");
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: trimmedFirstName,
            last_name: trimmedLastName,
            fullname: fullname,
            preferred_username: preferredUsername,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Process referral code if exists
      if (data.user && refCode) {
        try {
          await processReferralCode(refCode, data.user.id);
          localStorage.removeItem("referral_code");
        } catch (refError) {
          console.error("Failed to process referral:", refError);
          // Don't block signup for referral errors
        }
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

      const response = await supabase.functions.invoke("federated-auth-init", {
        body: {
          handle: fediHandle,
          redirectUri,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to initiate federated login");
      }

      const { authorizationUrl, error } = response.data;

      if (error) {
        throw new Error(error);
      }

      if (authorizationUrl) {
        // Store state in session storage for callback verification
        sessionStorage.setItem("federated_auth_redirect", redirectUri);
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
    { icon: Shield, text: t("auth.noTracking", "No tracking or data selling") },
    { icon: Users, text: t("auth.ownIdentity", "Own your professional identity") },
    { icon: Zap, text: t("auth.connectFediverse", "Connect across the Fediverse") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4">
        <Button variant="ghost" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("auth.backToHome", "Back to Home")}
          </Link>
        </Button>
      </div>

      <div className="flex-grow flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Branding */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" alt="Nolto" className="w-16 h-16" />
            </div>
            <h1 className="text-3xl font-bold text-foreground font-display">
              {t("auth.welcomeTitle", "Welcome to Nolto")}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t("auth.welcomeSubtitle", "The federated professional network that puts you in control")}
            </p>

            {/* Referral badge */}
            {refCode && (
              <Badge variant="secondary" className="mt-2">
                {t("auth.invitedWithCode", "Invited with code")}: {refCode}
              </Badge>
            )}

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
                {t("auth.fediLogin", "Login with Fediverse")}
              </CardTitle>
              <CardDescription>
                {t("auth.fediLoginDesc", "Use your existing Mastodon, Pleroma, or other Fediverse account")}
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
                <Button type="submit" className="w-full" disabled={isFederatedLoading}>
                  {isFederatedLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("auth.connecting", "Connecting...")}
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      {t("auth.continueWithFediverse", "Continue with Fediverse")}
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
                <span className="bg-card px-2 text-muted-foreground">{t("auth.orUseEmail", "Or use email")}</span>
              </div>
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mx-6 mt-4" style={{ width: "calc(100% - 48px)" }}>
                <TabsTrigger value="signin">{t("auth.signIn", "Sign In")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.signUp", "Sign Up")}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <CardContent className="space-y-4 pt-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email">{t("auth.email", "Email")}</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("auth.enterEmail", "Enter your email")}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signin-password">{t("auth.password", "Password")}</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("auth.enterPassword", "Enter your password")}
                        required
                      />
                      <div className="flex justify-end mt-1">
                        <Link
                          to="/auth/recovery"
                          className="text-sm text-muted-foreground hover:text-primary underline"
                        >
                          {t("auth.forgotPassword", "Forgot password?")}
                        </Link>
                      </div>
                    </div>
                    <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
                      {isLoading
                        ? t("auth.signingIn", "Signing in...")
                        : t("auth.signInWithEmail", "Sign In with Email")}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>

              <TabsContent value="signup">
                <CardContent className="space-y-4 pt-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="signup-firstname">{t("auth.firstName", "First Name")} *</Label>
                        <Input
                          id="signup-firstname"
                          type="text"
                          value={firstName}
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            if (fieldErrors.firstName) {
                              setFieldErrors(prev => ({ ...prev, firstName: undefined }));
                            }
                          }}
                          onBlur={() => validateField('firstName', firstName)}
                          placeholder="Firstname"
                          required
                          maxLength={50}
                          className={fieldErrors.firstName ? "border-destructive" : ""}
                        />
                        {fieldErrors.firstName && (
                          <p className="text-xs text-destructive mt-1">{fieldErrors.firstName}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="signup-lastname">{t("auth.lastName", "Last Name")} *</Label>
                        <Input
                          id="signup-lastname"
                          type="text"
                          value={lastName}
                          onChange={(e) => {
                            setLastName(e.target.value);
                            if (fieldErrors.lastName) {
                              setFieldErrors(prev => ({ ...prev, lastName: undefined }));
                            }
                          }}
                          onBlur={() => validateField('lastName', lastName)}
                          placeholder="Surname"
                          required
                          maxLength={50}
                          className={fieldErrors.lastName ? "border-destructive" : ""}
                        />
                        {fieldErrors.lastName && (
                          <p className="text-xs text-destructive mt-1">{fieldErrors.lastName}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="signup-username">
                        {t("auth.username", "Username")}{" "}
                        <span className="text-muted-foreground text-xs">({t("auth.optional", "optional")})</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="signup-username"
                          type="text"
                          value={username}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                            setUsername(val);
                          }}
                          placeholder="your_username"
                          maxLength={20}
                          className="pr-9"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {checkingUsername && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                          {!checkingUsername && usernameAvailable === true && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                          {!checkingUsername && usernameAvailable === false && (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {username
                          ? `@${username}@nolto.social`
                          : t("auth.usernameHint", "Your @username@nolto.social handle")}
                      </p>
                      {usernameAvailable === false && (
                        <p className="text-xs text-destructive mt-1">
                          {t("auth.usernameTaken", "This username is taken")}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="signup-email">{t("auth.email", "Email")} *</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldErrors.email) {
                            setFieldErrors(prev => ({ ...prev, email: undefined }));
                          }
                        }}
                        onBlur={() => validateField('email', email)}
                        placeholder={t("auth.enterEmail", "Enter your email")}
                        required
                        className={fieldErrors.email ? "border-destructive" : ""}
                      />
                      {fieldErrors.email && (
                        <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="signup-password">{t("auth.password", "Password")} *</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) {
                            setFieldErrors(prev => ({ ...prev, password: undefined }));
                          }
                        }}
                        onBlur={() => validateField('password', password)}
                        placeholder={t("auth.createPassword", "Create a password (min 6 characters)")}
                        required
                        minLength={6}
                        className={fieldErrors.password ? "border-destructive" : ""}
                      />
                      {fieldErrors.password && (
                        <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
                      )}
                    </div>
                    <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
                      {isLoading
                        ? t("auth.creatingAccount", "Creating account...")
                        : t("auth.createAccountWithEmail", "Create Account with Email")}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground">
            {t("auth.termsAgreement", "By signing up, you agree to our")}{" "}
            <Link to="/terms" className="underline hover:text-foreground">
              {t("auth.termsOfService", "Terms of Service")}
            </Link>{" "}
            {t("auth.and", "and")}{" "}
            <Link to="/privacy" className="underline hover:text-foreground">
              {t("auth.privacyPolicy", "Privacy Policy")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
