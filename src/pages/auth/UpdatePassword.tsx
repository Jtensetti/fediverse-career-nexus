import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

import { tx } from "@/i18n/tx";
export default function UpdatePassword() {
  const { user, loading, mfaPending } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmation) { setError(tx("ui.updatePassword.passwordMismatch")); return; }
    setPending(true);
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmation("");
      setSaved(true);
    } catch {
      setError(tx("ui.updatePassword.updateFailed"));
    } finally { setPending(false); }
  }

  if (loading || mfaPending) return <p role="status" className="p-8 text-center">{tx("ui.updatePassword.verifierarInloggning")}</p>;
  return <div className="mx-auto max-w-md px-6 py-16 space-y-6">
    <h1 className="text-3xl font-bold">{tx("ui.updatePassword.valjNyttLosenord")}</h1>
    {saved ? <><p role="status">{tx("ui.updatePassword.dittLosenordHarAndrats")}</p><Link to="/feed" className="text-primary underline">{tx("ui.updatePassword.fortsattTillNolto")}</Link></> : !user ? <>
      <p>{tx("ui.updatePassword.aterstallningslankenSaknasHarGatt")}</p>
      <Link to="/auth/recovery" className="text-primary underline">{tx("ui.updatePassword.begarEnNyLank")}</Link>
    </> : <form onSubmit={submit} className="space-y-4">
      <Label htmlFor="password">{tx("ui.updatePassword.nyttLosenordMinst12")}</Label>
      <Input id="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
      <Label htmlFor="confirmation">{tx("ui.updatePassword.bekraftaLosenord")}</Label>
      <Input id="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? tx("ui.updatePassword.sparar") : tx("ui.updatePassword.andraLosenord")}</Button>
    </form>}
  </div>;
}
