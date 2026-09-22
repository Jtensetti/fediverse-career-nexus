import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResendConfirmation() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const { error } = await supabase.functions.invoke("auth-signup", { body: { action: "resend", email } });
      setMessage(t(error ? "auth.resendFailed" : "auth.resendRequested"));
    } catch { setMessage(t("auth.resendFailed")); }
    finally { setBusy(false); }
  };
  return <details className="text-sm">
    <summary className="cursor-pointer underline">{t("auth.resendConfirmation")}</summary>
    <form onSubmit={submit} className="space-y-3 pt-3">
      <Label htmlFor="confirmation-email">{t("auth.email")}</Label>
      <Input id="confirmation-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
      <Button type="submit" variant="outline" disabled={busy}>{busy ? "…" : t("auth.resendConfirmation")}</Button>
      {message && <p role="status">{message}</p>}
    </form>
  </details>;
}
