import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

import { tx } from "@/i18n/tx";
export default function AuthRecovery() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setError("Det gick inte att begära återställning. Vänta en stund och försök igen.");
    } finally { setPending(false); }
  }

  return <div className="mx-auto max-w-md px-6 py-16 space-y-6">
    <Link to="/auth" className="text-primary underline">{tx("ui.authRecovery.tillbakaTillInloggning")}</Link>
    <h1 className="text-3xl font-bold">{tx("ui.authRecovery.aterstallLosenord")}</h1>
    {sent ? <p role="status">{tx("ui.authRecovery.omAdressenTillhorEtt")}</p> : <>
      <p className="text-muted-foreground">{tx("ui.authRecovery.angeEPostadressenFor")}</p>
      <form onSubmit={submit} className="space-y-4">
        <Label htmlFor="email">{tx("ui.authRecovery.ePostadress")}</Label>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} />
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <Button type="submit" disabled={pending}>{pending ? tx("ui.authRecovery.skickar") : tx("ui.authRecovery.skickaAterstallningslank")}</Button>
      </form>
    </>}
  </div>;
}
