import SocialSignIn from '@/components/auth/SocialSignIn';
import BlueskySignIn from '@/components/auth/BlueskySignIn';
import { consumeAppAuthorization } from '@/lib/appAuthorizationReturn';
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { processReferralCode } from "@/services/social/referralService";
import { Globe, Loader2, ArrowLeft, CheckCircle, Mail, Cloud, ChevronRight } from "lucide-react";
import { SEOHead } from "@/components/common/SEOHead";
import ResendConfirmation from "@/components/auth/ResendConfirmation";

export default function AuthPage() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const pendingAuth = useRef(false);
  const [isFederatedLoading, setIsFederatedLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [fediError, setFediError] = useState("");
  const [fediHandle, setFediHandle] = useState("");
  const [refCode, setRefCode] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [confirmation, setConfirmation] = useState<{ email: string; deliveryFailed: boolean } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    username?: string;
  }>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, loading, mfaPending } = useAuth();

  // Determine default tab based on URL path
  const activeTab = location.pathname === "/auth/signup" ? "signup" : "signin";
  const requestedMethod = new URLSearchParams(location.search).get('method');
  const method = location.pathname === '/auth/login' || location.pathname === '/auth/signup'
    ? 'email' : requestedMethod === 'mastodon' || requestedMethod === 'bluesky' ? requestedMethod : null;
  const chooseMethod = (next: 'email' | 'mastodon' | 'bluesky' | null) => {
    const params = new URLSearchParams(location.search);
    params.delete('method');
    if (next && next !== 'email') params.set('method', next);
    setFormError(''); setFediError(''); setFieldErrors({}); setPassword('');
    navigate({ pathname: next === 'email' ? '/auth/login' : '/auth', search: params.toString() }, { state: location.state });
  };

  const changeTab = (tab: string) => {
    setFieldErrors({}); setFormError(""); setPassword("");
    navigate({ pathname: tab === "signup" ? "/auth/signup" : "/auth/login", search: location.search, hash: location.hash }, { state: location.state });
  };

  // Capture referral code from URL or localStorage (24h expiry)
  useEffect(() => {
    const REFERRAL_KEY = "referral_code";
    const REFERRAL_TTL_MS = 24 * 60 * 60 * 1000;
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) {
      const code = ref.toUpperCase();
      setRefCode(code);
      localStorage.setItem(
        REFERRAL_KEY,
        JSON.stringify({ code, expiresAt: Date.now() + REFERRAL_TTL_MS })
      );
    } else {
      const stored = localStorage.getItem(REFERRAL_KEY);
      if (!stored) return;
      try {
        // New format
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && parsed.code && parsed.expiresAt) {
          if (Date.now() < parsed.expiresAt) {
            setRefCode(parsed.code);
          } else {
            localStorage.removeItem(REFERRAL_KEY);
          }
          return;
        }
        // Legacy plain-string fallback — adopt and re-stamp with TTL
        if (typeof parsed === "string" && parsed) {
          setRefCode(parsed);
          localStorage.setItem(
            REFERRAL_KEY,
            JSON.stringify({ code: parsed, expiresAt: Date.now() + REFERRAL_TTL_MS })
          );
        }
      } catch {
        // Legacy plain-string (not JSON) — adopt and re-stamp
        setRefCode(stored);
        localStorage.setItem(
          REFERRAL_KEY,
          JSON.stringify({ code: stored, expiresAt: Date.now() + REFERRAL_TTL_MS })
        );
      }
    }
  }, [location.search]);

  const requestedReturn = location.state?.returnTo;
  const returnTo = typeof requestedReturn === "string" && /^\/(?![\\/])/.test(requestedReturn) && !requestedReturn.startsWith("/auth") ? requestedReturn : "/feed";
  const signedInReturn = useRef<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (user || (!loading && session && mfaPending && returnTo.startsWith("/aterstall-mfa?"))) {
      // StrictMode can replay the effect; consume the saved consent route once.
      if (user) signedInReturn.current ??= consumeAppAuthorization() || returnTo;
      navigate(user ? signedInReturn.current! : returnTo, { replace: true });
    }
  }, [user, session, loading, mfaPending, navigate, returnTo]);

  // Name validation helper - relaxed to support diverse naming conventions
  const validateName = (name: string, field: string): string | null => {
    const trimmed = name.trim();
    // Allow single character names (many cultures have them, also initials like "J.")
    if (trimmed.length < 1) {
      return t(field === t("auth.lastName") ? "auth.lastNameRequired" : "auth.firstNameRequired");
    }
    if (trimmed.length > 50) {
      return t("auth.nameTooLong");
    }
    // Allow letters (including international), spaces, hyphens, apostrophes, and periods (for initials)
    if (!/^[\p{L}\p{M}\s\-'.]+$/u.test(trimmed)) {
      return t("auth.nameInvalidChars");
    }
    return null;
  };

  // Real-time field validation
  const validateField = (field: 'firstName' | 'lastName' | 'email' | 'password', value: string) => {
    let error: string | undefined;

    if (field === 'firstName' || field === 'lastName') {
      const validationError = validateName(value, field === 'firstName' ? t("auth.firstName") : t("auth.lastName"));
      error = validationError || undefined;
    } else if (field === 'email') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = t("auth.invalidEmailFormat", "Please enter a valid email address");
      }
    } else if (field === 'password') {
      if (value && value.length < 12) {
        error = t("auth.passwordTooShort", "Password must be at least 12 characters");
      }
    }

    setFieldErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  // Username validation
  const validateUsername = (value: string): string | null => {
    if (!value) return t("auth.usernameRequired");
    if (value.length < 3) return t("auth.usernameMinChars");
    if (value.length > 30) return t("auth.usernameMaxChars");
    if (!/^[a-z0-9_]*$/.test(value)) return t("auth.usernameCharsOnly");
    if (["admin","administrator","support","security","nolto","root","system","moderator"].includes(value)) return t("auth.usernameTaken");
    return null;
  };

  // Check username availability (debounced)
  useEffect(() => {
    let active = true;
    setUsernameAvailable(null);
    setCheckingUsername(false);
    if (!username || username.length < 3 || validateUsername(username)) {
      setUsernameAvailable(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const { data, error } = await supabase.rpc("is_username_available", { candidate: username.trim().toLowerCase() });
        if (active) setUsernameAvailable(error ? null : data === true);
      } catch {
        if (active) setUsernameAvailable(null);
      } finally {
        if (active) setCheckingUsername(false);
      }
    }, 500);

    return () => { active = false; clearTimeout(timeout); };
  }, [username]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingAuth.current) return;

    // Clear previous errors
    setFieldErrors({});
    setFormError("");

    // Validate all fields BEFORE setting loading state (fixes mobile stuck button)
    if (!email || !password || !firstName || !lastName) {
      const errors: typeof fieldErrors = {};
      if (!firstName) errors.firstName = t("auth.firstNameRequired");
      if (!lastName) errors.lastName = t("auth.lastNameRequired");
      if (!email) errors.email = t("auth.emailRequired");
      if (!password) errors.password = t("auth.passwordRequired");
      if (!username) errors.username = t("auth.usernameRequired");
      setFieldErrors(errors);
      toast.error(t("toasts.fillAllFields"));
      return;
    }

    // Validate names
    const firstNameError = validateName(firstName, t("auth.firstName"));
    if (firstNameError) {
      setFieldErrors(prev => ({ ...prev, firstName: firstNameError }));
      toast.error(firstNameError);
      return;
    }

    const lastNameError = validateName(lastName, t("auth.lastName"));
    if (lastNameError) {
      setFieldErrors(prev => ({ ...prev, lastName: lastNameError }));
      toast.error(lastNameError);
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors(prev => ({ ...prev, email: t("toasts.invalidEmailFormat") }));
      toast.error(t("toasts.invalidEmailFormat"));
      return;
    }

    // Validate password length
    if (password.length < 12) {
      setFieldErrors(prev => ({ ...prev, password: t("toasts.passwordTooShort") }));
      toast.error(t("toasts.passwordTooShort"));
      return;
    }

    // Only set loading AFTER all validation passes
    pendingAuth.current = true;
    setIsLoading(true);
    try {
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const preferredUsername = username.trim().toLowerCase();

      // Validate the required username
      {
        const usernameError = validateUsername(preferredUsername);
        if (usernameError) {
          setFieldErrors(prev => ({ ...prev, username: usernameError }));
          document.getElementById('signup-username')?.focus();
          setIsLoading(false);
          return;
        }
        if (usernameAvailable === false) {
          setFieldErrors(prev => ({ ...prev, username: t("auth.usernameTaken") }));
          document.getElementById('signup-username')?.focus();
          setIsLoading(false);
          return;
        }
      }

      // Use custom auth-signup edge function for email confirmation via Resend
      const { data, error } = await supabase.functions.invoke('auth-signup', {
        body: {
          email,
          password,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          username: preferredUsername,
        },
      });

      if (error || data?.success !== true) {
        const status = error?.context?.status;
        throw new Error(t(status === 429 ? "auth.tooManyAttempts" : status === 503 ? "auth.signupUnavailable" : "auth.createFailed"));
      }

      // Process referral code if exists
      if (data?.userId && refCode) {
        try {
          await processReferralCode(refCode, data.userId);
          localStorage.removeItem("referral_code");
        } catch (refError) {
          console.error("Failed to process referral:", refError);
          // Don't block signup for referral errors
        }
      }

      setConfirmation({ email, deliveryFailed: data?.emailSent === false });
      // Clear the form
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setUsername("");
    } catch (error: any) {
      setFormError(error instanceof Error ? error.message : t("auth.createFailed"));
    } finally {
      pendingAuth.current = false;
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingAuth.current) return;
    setFormError("");
    if (!email || !password) {
      setFieldErrors({ email: !email ? t("auth.emailRequired") : undefined, password: !password ? t("auth.passwordRequired") : undefined });
      document.getElementById(!email ? "signin-email" : "signin-password")?.focus();
      return;
    }
    if (!validateField("email", email)) return;

    pendingAuth.current = true;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // AuthProvider owns the single MFA challenge and releases user only after verification.
    } catch (error: any) {
      setFormError(t(error?.code === "email_not_confirmed" ? "auth.emailNotConfirmed"
        : error?.code === "invalid_credentials" ? "auth.invalidCredentials" : "auth.signInFailed"));
    } finally {
      pendingAuth.current = false;
      setIsLoading(false);
    }
  };

  const handleFederatedLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setFediError("");
    if (!fediHandle) {
      setFediError(t("auth.invalidFediHandle"));
      return;
    }

    // Validate handle format
    const handlePattern = /^@?[a-zA-Z0-9_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!handlePattern.test(fediHandle)) {
      setFediError(t("auth.invalidFediHandle"));
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
        sessionStorage.setItem("federated_auth_state", response.data.state);
        // Redirect to the remote instance for authorization
        window.location.href = authorizationUrl;
      }
    } catch (error: any) {
      setFediError(t("auth.fediFailed"));
    } finally {
      setIsFederatedLoading(false);
    }
  };

  return <div className="min-h-screen bg-background">
    <SEOHead title={t("auth.welcomeTitle")} description={t("auth.welcomeSubtitle")} />
    <div className="mx-auto max-w-md px-4 py-4 sm:py-8">
      <Button variant="ghost" className="mb-4 -ml-3" asChild><Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />{t("auth.backToHome")}</Link></Button>
      <header className="mb-5 flex items-center gap-3">
        <img src="/brand/mascot.webp" alt="" width="48" height="48" className="h-12 w-12 object-contain" />
        <div><h1 className="text-2xl font-semibold">{t("auth.welcomeTitle")}</h1><p className="text-sm text-muted-foreground">{t(method ? "auth.compactIntro" : "auth.chooseMethod")}</p></div>
      </header>
      {refCode && <Badge variant="secondary" className="mb-3">{t("auth.invitedWithCode")}: {refCode}</Badge>}
      <Card><CardContent className="space-y-5 p-5 sm:p-6">
        {confirmation ? <section className="space-y-4" aria-labelledby="confirmation-title">
          <CheckCircle className="h-8 w-8 text-primary" aria-hidden="true" />
          <h2 id="confirmation-title" className="text-xl font-semibold">{t("auth.confirmationTitle")}</h2>
          <p role="status">{t("auth.confirmationIntro", { email: confirmation.email })}</p>
          {confirmation.deliveryFailed && <p role="alert" className="text-sm text-destructive">{t("auth.confirmationDeliveryFailed")}</p>}
          <p className="text-sm text-muted-foreground">{t("auth.confirmationNext")}</p>
          <ResendConfirmation initialEmail={confirmation.email} expanded />
          <Button className="w-full" onClick={() => { setEmail(confirmation.email); setConfirmation(null); changeTab("signin"); }}>{t("auth.confirmationSignIn")}</Button>
        </section> : !method ? <section aria-label={t("auth.chooseMethod")} className="space-y-3">
          <Button type="button" variant="outline" className="h-auto min-h-14 w-full justify-start gap-3 rounded-xl px-4 py-3 text-left whitespace-normal" onClick={() => chooseMethod('email')}>
            <Mail className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="flex-1">{t("auth.continueEmail")}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Button>
          <SocialSignIn chooser />
          <Button type="button" variant="outline" className="h-auto min-h-14 w-full justify-start gap-3 rounded-xl px-4 py-3 text-left whitespace-normal" onClick={() => chooseMethod('mastodon')}>
            <Globe className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="flex-1">{t("auth.socialContinue", { provider: 'Mastodon' })}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" className="h-auto min-h-14 w-full justify-start gap-3 rounded-xl px-4 py-3 text-left whitespace-normal" onClick={() => chooseMethod('bluesky')}>
            <Cloud className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="flex-1">{t("auth.socialContinue", { provider: 'Bluesky' })}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Button>
          <p className="pt-2 text-center text-xs leading-relaxed text-muted-foreground">{t("auth.chooseMethodHelp")}</p>
        </section> : <>
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => chooseMethod(null)} disabled={isLoading || isFederatedLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t("auth.allMethods")}
          </Button>
          {method === 'email' && <>
          <Tabs value={activeTab} onValueChange={changeTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin" disabled={isLoading}>{t("auth.signIn")}</TabsTrigger>
              <TabsTrigger value="signup" disabled={isLoading}>{t("auth.signUp")}</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="pt-3">
              <form onSubmit={handleSignIn} noValidate className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="signin-email">{t("auth.email")}</Label>
                  <Input id="signin-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} disabled={isLoading}
                    onChange={event => { setEmail(event.target.value); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
                    aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "signin-email-error" : undefined} />
                  {fieldErrors.email && <p id="signin-email-error" role="alert" className="text-sm text-destructive">{fieldErrors.email}</p>}
                </div>
                <div className="space-y-1.5"><Label htmlFor="signin-password">{t("auth.password")}</Label>
                  <Input id="signin-password" type="password" autoComplete="current-password" required value={password} disabled={isLoading}
                    onChange={event => { setPassword(event.target.value); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
                    aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? "signin-password-error" : undefined} />
                  {fieldErrors.password && <p id="signin-password-error" role="alert" className="text-sm text-destructive">{fieldErrors.password}</p>}
                  <Link to="/auth/recovery" className="inline-block pt-1 text-sm underline">{t("auth.forgotPassword")}</Link>
                </div>
                {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>{t(isLoading ? "auth.signingIn" : "auth.signInWithEmail")}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="pt-3">
              <form onSubmit={handleSignUp} noValidate className="space-y-4">
                <p className="text-xs text-muted-foreground">{t("auth.requiredFields")}</p>
                <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="signup-firstname">{t("auth.firstName")}</Label>
                    <Input id="signup-firstname" autoComplete="given-name" required maxLength={50} value={firstName} disabled={isLoading}
                      onChange={event => { setFirstName(event.target.value); setFieldErrors(prev => ({ ...prev, firstName: undefined })); }}
                      onBlur={() => validateField("firstName", firstName)} aria-invalid={!!fieldErrors.firstName} aria-describedby={fieldErrors.firstName ? "signup-firstname-error" : undefined} />
                    {fieldErrors.firstName && <p id="signup-firstname-error" role="alert" className="text-sm text-destructive">{fieldErrors.firstName}</p>}
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="signup-lastname">{t("auth.lastName")}</Label>
                    <Input id="signup-lastname" autoComplete="family-name" required maxLength={50} value={lastName} disabled={isLoading}
                      onChange={event => { setLastName(event.target.value); setFieldErrors(prev => ({ ...prev, lastName: undefined })); }}
                      onBlur={() => validateField("lastName", lastName)} aria-invalid={!!fieldErrors.lastName} aria-describedby={fieldErrors.lastName ? "signup-lastname-error" : undefined} />
                    {fieldErrors.lastName && <p id="signup-lastname-error" role="alert" className="text-sm text-destructive">{fieldErrors.lastName}</p>}
                  </div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="signup-username">{t("auth.username")}</Label>
                  <Input id="signup-username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={30}
                    value={username} disabled={isLoading} onChange={event => { setUsername(event.target.value.toLowerCase()); setUsernameAvailable(null); setFieldErrors(prev => ({ ...prev, username: undefined })); }}
                    onBlur={() => setFieldErrors(prev => ({ ...prev, username: validateUsername(username.trim().toLowerCase()) || undefined }))}
                    aria-invalid={!!fieldErrors.username || usernameAvailable === false} aria-describedby="signup-username-help signup-username-status" />
                  <p id="signup-username-help" className="text-xs text-muted-foreground">{t("auth.usernameRules")}</p>
                  <div id="signup-username-status" aria-live="polite" className="text-sm">
                    {fieldErrors.username ? <p role="alert" className="text-destructive">{fieldErrors.username}</p>
                      : usernameAvailable === false ? <p className="text-destructive">{t("auth.usernameTaken")}</p>
                      : checkingUsername ? <p className="text-muted-foreground">{t("auth.checkingUsername")}</p>
                      : username && !validateUsername(username) ? <p className="break-all text-muted-foreground">@{username}@nolto.social{usernameAvailable === true ? " · " + t("auth.usernameAvailable") : ""}</p> : null}
                  </div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="signup-email">{t("auth.email")}</Label>
                  <Input id="signup-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} disabled={isLoading}
                    onChange={event => { setEmail(event.target.value); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
                    onBlur={() => validateField("email", email)} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "signup-email-error" : undefined} />
                  {fieldErrors.email && <p id="signup-email-error" role="alert" className="text-sm text-destructive">{fieldErrors.email}</p>}
                </div>
                <div className="space-y-1.5"><Label htmlFor="signup-password">{t("auth.password")}</Label>
                  <Input id="signup-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} disabled={isLoading}
                    onChange={event => { setPassword(event.target.value); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
                    onBlur={() => validateField("password", password)} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? "signup-password-help signup-password-error" : "signup-password-help"} />
                  <p id="signup-password-help" className="text-xs text-muted-foreground">{t("auth.passwordHelp")}</p>
                  {fieldErrors.password && <p id="signup-password-error" role="alert" className="text-sm text-destructive">{fieldErrors.password}</p>}
                </div>
                {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
                <Button type="submit" className="w-full" disabled={isLoading || checkingUsername}>{t(isLoading ? "auth.creatingAccount" : "auth.createAccountWithEmail")}</Button>
              </form>
            </TabsContent>
          </Tabs>
          <ResendConfirmation initialEmail={email} />
          </>}
          {method === 'mastodon' && <section className="space-y-4">
                <h2 className="text-lg font-semibold">{t("auth.socialContinue", { provider: 'Mastodon' })}</h2>
                <form onSubmit={handleFederatedLogin} noValidate className="space-y-3">
                  <div className="space-y-1.5"><Label htmlFor="mastodon-handle">{t("auth.mastodonAccount")}</Label>
                    <p id="mastodon-help" className="text-xs text-muted-foreground">{t("auth.fediLoginDesc")}</p>
                    <Input id="mastodon-handle" value={fediHandle} onChange={event => { setFediHandle(event.target.value); setFediError(""); }} placeholder="@name@mastodon.social"
                      autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={isFederatedLoading} aria-invalid={!!fediError} aria-describedby="mastodon-help mastodon-error" />
                    <p id="mastodon-error" role={fediError ? "alert" : undefined} className="text-sm text-destructive">{fediError}</p>
                  </div>
                  <Button type="submit" variant="outline" className="w-full" disabled={isFederatedLoading}>
                    {isFederatedLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}{t(isFederatedLoading ? "auth.connecting" : "auth.continueWithFediverse")}
                  </Button>
                </form>
          </section>}
          {method === 'bluesky' && <BlueskySignIn showUnavailable />}
        </>}
      </CardContent></Card>
      <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
        {t("auth.termsAgreement")} <Link to="/terms" className="underline">{t("auth.termsOfService")}</Link> {t("auth.and")} <Link to="/privacy" className="underline">{t("auth.privacyPolicy")}</Link>
      </p>
    </div>
  </div>;
}
