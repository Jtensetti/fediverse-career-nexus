import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail, Loader2, CheckCircle, KeyRound, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Step = "email" | "code" | "password" | "success";

export default function AuthRecovery() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Ange din e-postadress");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-password-reset", { body: { email } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setStep("code");
      toast.success("Återställningskod skickad! Kolla din e-post.");
    } catch (error: any) {
      toast.error(error.message || "Kunde inte skicka återställningskod");
    } finally { setIsLoading(false); }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { toast.error("Ange den 6-siffriga koden"); return; }
    setStep("password");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("Lösenordet måste vara minst 6 tecken"); return; }
    if (newPassword !== confirmPassword) { toast.error("Lösenorden matchar inte"); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-reset-code", { body: { email, code, newPassword } });
      if (error) throw error;
      if (data?.error) {
        if (data.error === "Invalid or expired code") setStep("code");
        toast.error(data.error);
        return;
      }
      setStep("success");
      toast.success("Lösenordet har återställts!");
    } catch (error: any) {
      toast.error(error.message || "Kunde inte återställa lösenordet");
    } finally { setIsLoading(false); }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-password-reset", { body: { email } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setCode("");
      toast.success("Ny kod skickad!");
    } catch (error: any) {
      toast.error(error.message || "Kunde inte skicka ny kod");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="p-4">
        <Button variant="ghost" asChild>
          <Link to="/auth">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till inloggning
          </Link>
        </Button>
      </div>

      <div className="flex-grow flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" alt="Samverkan" className="w-16 h-16" />
            </div>
            <h1 className="text-3xl font-bold text-foreground font-display">Återställ lösenord</h1>
            <p className="mt-2 text-muted-foreground">
              {step === "email" && "Ange din e-post för att få en återställningskod"}
              {step === "code" && "Ange den 6-siffriga koden vi skickade"}
              {step === "password" && "Skapa ditt nya lösenord"}
              {step === "success" && "Ditt lösenord har återställts"}
            </p>
          </div>

          <Card className="shadow-lg border-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                {step === "email" && <Mail className="h-5 w-5 text-primary" />}
                {step === "code" && <KeyRound className="h-5 w-5 text-primary" />}
                {step === "password" && <ShieldCheck className="h-5 w-5 text-primary" />}
                {step === "success" && <CheckCircle className="h-5 w-5 text-success" />}
                {step === "email" && "Lösenordsåterställning"}
                {step === "code" && "Verifiera kod"}
                {step === "password" && "Nytt lösenord"}
                {step === "success" && "Klart!"}
              </CardTitle>
              <CardDescription>
                {step === "email" && "Vi skickar en 6-siffrig kod för att återställa ditt lösenord"}
                {step === "code" && `Kod skickad till ${email}`}
                {step === "password" && "Välj ett starkt lösenord"}
                {step === "success" && "Du kan nu logga in med ditt nya lösenord"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === "email" && (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div>
                    <Label htmlFor="email">E-postadress</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ange din e-post" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Skickar...</>) : "Skicka återställningskod"}
                  </Button>
                </form>
              )}
              {step === "code" && (
                <form onSubmit={handleVerifyCode} className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <Label>Ange din 6-siffriga kod</Label>
                    <InputOTP maxLength={6} value={code} onChange={setCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                        <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button type="submit" className="w-full" disabled={code.length !== 6}>Verifiera kod</Button>
                  <div className="text-center">
                    <button type="button" onClick={handleResendCode} disabled={isLoading} className="text-sm text-muted-foreground hover:text-primary underline">
                      {isLoading ? "Skickar..." : "Fick du ingen kod? Skicka igen"}
                    </button>
                  </div>
                </form>
              )}
              {step === "password" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="newPassword">Nytt lösenord</Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Ange nytt lösenord" minLength={6} required />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Bekräfta lösenord</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Bekräfta nytt lösenord" minLength={6} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Återställer...</>) : "Återställ lösenord"}
                  </Button>
                </form>
              )}
              {step === "success" && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center"><CheckCircle className="h-16 w-16 text-success" /></div>
                  <Button onClick={() => navigate("/auth")} className="w-full">Gå till inloggning</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Kommer du ihåg ditt lösenord?{" "}
            <Link to="/auth" className="text-primary underline hover:no-underline">Logga in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
