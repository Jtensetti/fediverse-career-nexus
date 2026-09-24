import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResendConfirmation({ initialEmail = "", expanded = false }: { initialEmail?: string; expanded?: boolean }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  useEffect(() => { setEmail(initialEmail); }, [initialEmail]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage(""); setFailed(false);
    try {
      const { data, error } = await supabase.functions.invoke("auth-signup", { body: { action: "resend", email: email.trim() } });
      const failure = !!error || data?.success !== true;
      setFailed(failure); setMessage(t(failure ? "auth.resendFailed" : "auth.resendRequested"));
    } catch { setFailed(true); setMessage(t("auth.resendFailed")); }
    finally { pending.current = false; setBusy(false); }
  };
  const form = <form onSubmit={submit} className="space-y-3 pt-3">
      <Label htmlFor="confirmation-email">{t("auth.email")}</Label>
      <Input id="confirmation-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required disabled={busy} value={email} onChange={e => setEmail(e.target.value)} />
      <Button type="submit" variant="outline" disabled={busy}>{t(busy ? "auth.resending" : "auth.resendConfirmation")}</Button>
      {message && <p role={failed ? "alert" : "status"} className={failed ? "text-destructive" : ""}>{message}</p>}
    </form>;
  return expanded ? <div className="text-sm">{form}</div> : <details className="text-sm">
    <summary className="cursor-pointer underline">{t("auth.resendConfirmation")}</summary>{form}
  </details>;
}
