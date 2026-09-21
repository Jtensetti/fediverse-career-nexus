import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function DataExportSection() {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  async function download() {
    setBusy(true); setError(""); setDownloaded(false);
    try {
      const { data, error } = await supabase.functions.invoke("export-user-data", { body: {} });
      if (error || data?.error || data?.schema !== "nolto-account-export/1") throw new Error("Export failed");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `nolto-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(true);
    } catch {
      setError(sv ? "Exporten kunde inte slutföras. Försök igen eller kontakta jtensetti@protonmail.com för hjälp med ett registerutdrag." : "The export could not be completed. Retry or contact jtensetti@protonmail.com for help with your data request.");
    } finally { setBusy(false); }
  }
  return <Card><CardHeader>
    <CardTitle>{sv ? "Ladda ner dina uppgifter" : "Download your data"}</CardTitle>
    <CardDescription>{sv ? "Profil, inlägg, meddelanden, kontakter och inställningar i en JSON-fil." : "Your profile, posts, messages, connections and settings in a JSON file."}</CardDescription>
  </CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">{sv ? "Uppladdade filer listas i exporten; själva filerna laddar du ner separat. Lösenord, nycklar och inloggningstoken ingår inte. Exporten kan inte importeras direkt i Mastodon." : "The export lists uploaded files; download the files themselves separately. Passwords, keys and login tokens are excluded. This archive cannot be imported directly into Mastodon."}</p>
    <Button onClick={download} disabled={busy}>{busy ? (sv ? "Förbereder export…" : "Preparing export…") : (sv ? "Ladda ner JSON" : "Download JSON")}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {downloaded && <p role="status" className="text-sm">{sv ? "Exporten är klar. Förvara den säkert; den innehåller privata meddelanden och kontaktuppgifter." : "Your export is ready. Store it securely; it contains private messages and contact details."}</p>}
  </CardContent></Card>;
}
