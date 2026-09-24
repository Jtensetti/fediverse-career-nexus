import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

import { tx } from "@/i18n/tx";
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
    <h1 className="text-2xl font-bold">{tx("ui.mfaRecover.aterstallTvafaktorsautentisering")}</h1>
    {loading ? <p role="status">{tx("ui.mfaRecover.kontrollerarInloggning")}</p> : done ? <>
      <p role="status">{tx("ui.mfaRecover.tvafaktorsautentiseringenHarAterstalltsAktivera")}</p>
      <Link to="/profile/edit" className="underline">{tx("ui.mfaRecover.oppnaKontoinstallningar")}</Link>
    </> : !valid ? <p role="alert">{tx("ui.mfaRecover.lankenArOgiltigKontakta")}</p> : !session ? <>
      <p>{tx("ui.mfaRecover.loggaInMedDitt")}</p>
      <Button asChild><Link to="/auth" state={{ returnTo: location.pathname + location.search }}>{tx("ui.mfaRecover.loggaIn")}</Link></Button>
    </> : <>
      <p>{tx("ui.mfaRecover.dettaTarBortDina")}</p>
      <Button disabled={pending} onClick={recover}>{pending ? tx("ui.mfaRecover.aterstaller") : tx("ui.mfaRecover.aterstallTvafaktorsautentisering")}</Button>
    </>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <p><Link to="/" className="underline">{tx("ui.mfaRecover.tillbakaTillNolto")}</Link></p>
  </div>;
}
