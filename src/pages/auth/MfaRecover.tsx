import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function MfaRecover() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const valid = /^[A-Za-z0-9_-]{43}$/.test(token);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function recover() {
    setPending(true); setError("");
    try {
      const { data, error } = await supabase.functions.invoke("consume-mfa-recovery-token", { body: { token } });
      if (error || !data?.success) throw new Error("Recovery failed");
      await supabase.auth.refreshSession();
      setDone(true);
      window.history.replaceState(null, "", "/aterstall-mfa");
    } catch {
      setError("Återställningen kunde inte slutföras. Länken kan ha gått ut eller redan använts. Kontakta support för en ny länk.");
    } finally { setPending(false); }
  }
  return <div className="mx-auto max-w-md space-y-5 px-6 py-16">
    <h1 className="text-2xl font-bold">Återställ tvåfaktorsautentisering</h1>
    {loading ? <p role="status">Kontrollerar inloggning…</p> : done ? <>
      <p role="status">Tvåfaktorsautentiseringen har återställts. Aktivera den igen i dina kontoinställningar.</p>
      <Link to="/profile/edit" className="underline">Öppna kontoinställningar</Link>
    </> : !valid ? <p role="alert">Länken är ogiltig. Kontakta jtensetti@protonmail.com om du behöver hjälp.</p> : !session ? <>
      <p>Logga in med ditt lösenord för att använda återställningslänken.</p>
      <Button asChild><Link to="/auth" state={{ returnTo: location.pathname + location.search }}>Logga in</Link></Button>
    </> : <>
      <p>Detta tar bort dina befintliga tvåfaktorsmetoder och loggar ut dina andra sessioner. Länken fungerar endast för det konto som den utfärdades till.</p>
      <Button disabled={pending} onClick={recover}>{pending ? "Återställer…" : "Återställ tvåfaktorsautentisering"}</Button>
    </>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <p><Link to="/" className="underline">Tillbaka till Nolto</Link></p>
  </div>;
}
