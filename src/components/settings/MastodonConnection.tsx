import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export default function MastodonConnection() {
  const { t } = useTranslation();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const connect = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.functions.invoke("federated-auth-init", { body: { handle, redirectUri, link: true } });
      if (error || !data?.authorizationUrl || !data.state) throw new Error(data?.error || (t("ui.mastodonConnection.couldNotConnectCheck")));
      sessionStorage.setItem("federated_auth_state", data.state);
      sessionStorage.setItem("federated_auth_redirect", redirectUri);
      window.location.assign(data.authorizationUrl);
    } catch (e) { setError(t('ui.mastodonConnection.couldNotConnectCheck')); setBusy(false); }
  };
  return <Card><CardHeader><CardTitle>{t("ui.mastodonConnection.linkMastodon")}</CardTitle></CardHeader><CardContent>
    <p className="text-sm text-muted-foreground mb-4">{t("ui.mastodonConnection.linkAnAccountTo")}</p>
    <form onSubmit={connect} className="space-y-3"><Label htmlFor="mastodon-handle">{t("ui.mastodonConnection.mastodonAddress")}</Label><Input id="mastodon-handle" required value={handle} onChange={e => setHandle(e.target.value)} placeholder="username@mastodon.social" autoCapitalize="none" spellCheck={false}/><Button disabled={busy || !handle.trim()}>{busy ? "…" : t("ui.mastodonConnection.continueToMastodon")}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>
  </CardContent></Card>;
}
