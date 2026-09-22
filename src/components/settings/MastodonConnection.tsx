import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export default function MastodonConnection() {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const connect = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.functions.invoke("federated-auth-init", { body: { handle, redirectUri, link: true } });
      if (error || !data?.authorizationUrl || !data.state) throw new Error(data?.error || (sv ? "Kunde inte ansluta. Kontrollera adressen och försök igen." : "Could not connect. Check the address and retry."));
      sessionStorage.setItem("federated_auth_state", data.state);
      sessionStorage.setItem("federated_auth_redirect", redirectUri);
      window.location.assign(data.authorizationUrl);
    } catch (e) { setError(e instanceof Error ? e.message : "Connection failed"); setBusy(false); }
  };
  return <Card><CardHeader><CardTitle>{sv ? "Koppla Mastodon" : "Link Mastodon"}</CardTitle></CardHeader><CardContent>
    <p className="text-sm text-muted-foreground mb-4">{sv ? "Koppla ett konto så att du kan logga in på samma Nolto-konto med Mastodon. Din Nolto-adress och profil behålls. Inlägg och privata meddelanden speglas inte automatiskt." : "Link an account to sign in to this Nolto account with Mastodon. Your Nolto address and profile stay in place. Posts and private messages are not mirrored automatically."}</p>
    <form onSubmit={connect} className="space-y-3"><Label htmlFor="mastodon-handle">{sv ? "Mastodon-adress" : "Mastodon address"}</Label><Input id="mastodon-handle" required value={handle} onChange={e => setHandle(e.target.value)} placeholder="username@mastodon.social" autoCapitalize="none" spellCheck={false}/><Button disabled={busy || !handle.trim()}>{busy ? "…" : sv ? "Fortsätt till Mastodon" : "Continue to Mastodon"}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>
  </CardContent></Card>;
}
