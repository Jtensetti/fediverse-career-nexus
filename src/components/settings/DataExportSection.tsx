import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function DataExportSection() {
  const { t } = useTranslation();
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
      setError(t("ui.dataExportSection.theExportCouldNot"));
    } finally { setBusy(false); }
  }
  return <Card><CardHeader>
    <CardTitle>{t("ui.dataExportSection.downloadYourData")}</CardTitle>
    <CardDescription>{t("ui.dataExportSection.yourProfilePostsMessages")}</CardDescription>
  </CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">{t("ui.dataExportSection.theExportListsUploaded")}</p>
    <Button onClick={download} disabled={busy}>{busy ? (t("ui.dataExportSection.preparingExport")) : (t("ui.dataExportSection.downloadJson"))}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {downloaded && <p role="status" className="text-sm">{t("ui.dataExportSection.yourExportIsReady")}</p>}
  </CardContent></Card>;
}
