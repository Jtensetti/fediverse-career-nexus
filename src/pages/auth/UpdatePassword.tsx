import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function UpdatePassword() {
  const { user, loading, mfaPending } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmation) { setError("Lösenorden måste vara lika."); return; }
    setPending(true);
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmation("");
      setSaved(true);
    } catch {
      setError("Lösenordet kunde inte ändras. Kontrollera att det är minst 12 tecken. Om länken har gått ut behöver du begära en ny.");
    } finally { setPending(false); }
  }

  if (loading || mfaPending) return <p role="status" className="p-8 text-center">Verifierar inloggning…</p>;
  return <div className="mx-auto max-w-md px-6 py-16 space-y-6">
    <h1 className="text-3xl font-bold">Välj nytt lösenord</h1>
    {saved ? <><p role="status">Ditt lösenord har ändrats.</p><Link to="/feed" className="text-primary underline">Fortsätt till Nolto</Link></> : !user ? <>
      <p>Återställningslänken saknas, har gått ut eller har redan använts.</p>
      <Link to="/auth/recovery" className="text-primary underline">Begär en ny länk</Link>
    </> : <form onSubmit={submit} className="space-y-4">
      <Label htmlFor="password">Nytt lösenord, minst 12 tecken</Label>
      <Input id="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
      <Label htmlFor="confirmation">Bekräfta lösenord</Label>
      <Input id="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Sparar…" : "Ändra lösenord"}</Button>
    </form>}
  </div>;
}
