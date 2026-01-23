import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileJson, Globe, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DataExportSection() {
  const { t } = useTranslation();
  const [isExportingGdpr, setIsExportingGdpr] = useState(false);
  const [isExportingActivityPub, setIsExportingActivityPub] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(
    localStorage.getItem("last_data_export")
  );

  const handleExport = async (format: "gdpr" | "activitypub") => {
    const setLoading = format === "gdpr" ? setIsExportingGdpr : setIsExportingActivityPub;
    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("You must be logged in to export your data");
        return;
      }

      const response = await supabase.functions.invoke("export-user-data", {
        body: {},
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      // Build URL with query param for format
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const exportUrl = `${supabaseUrl}/functions/v1/export-user-data?format=${format}`;
      
      const fetchResponse = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (!fetchResponse.ok) {
        throw new Error("Export failed");
      }

      const data = await fetchResponse.json();
      
      // Create download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "gdpr" 
        ? `nolto-data-export-${new Date().toISOString().split('T')[0]}.json`
        : `nolto-activitypub-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update last export time
      const now = new Date().toISOString();
      localStorage.setItem("last_data_export", now);
      setLastExport(now);

      toast.success(
        format === "gdpr" 
          ? "Your data has been exported successfully" 
          : "ActivityPub export complete - you can import following.csv to your new instance"
      );
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          {t("dataExport.title", "Download Your Data")}
        </CardTitle>
        <CardDescription>
          {t("dataExport.description", "Export all your data in compliance with GDPR Article 20 (Right to Data Portability)")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GDPR Export */}
        <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
          <div className="flex items-start gap-3">
            <FileJson className="h-8 w-8 text-muted-foreground mt-1" />
            <div>
              <h4 className="font-medium">{t("dataExport.gdprTitle", "Complete Data Export (GDPR)")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("dataExport.gdprDescription", "Download all your data including profile, posts, messages, connections, and settings in JSON format.")}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => handleExport("gdpr")} 
            disabled={isExportingGdpr}
            variant="outline"
          >
            {isExportingGdpr ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("dataExport.exporting", "Exporting...")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t("dataExport.download", "Download")}
              </>
            )}
          </Button>
        </div>

        {/* ActivityPub Export */}
        <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
          <div className="flex items-start gap-3">
            <Globe className="h-8 w-8 text-muted-foreground mt-1" />
            <div>
              <h4 className="font-medium">{t("dataExport.activityPubTitle", "Fediverse Migration Export")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("dataExport.activityPubDescription", "Export in ActivityPub format for migrating to another Fediverse instance. Includes following list for import to Mastodon.")}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => handleExport("activitypub")} 
            disabled={isExportingActivityPub}
            variant="outline"
          >
            {isExportingActivityPub ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("dataExport.exporting", "Exporting...")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t("dataExport.download", "Download")}
              </>
            )}
          </Button>
        </div>

        {/* Last export info */}
        {lastExport && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {t("dataExport.lastExport", "Last export")}: {new Date(lastExport).toLocaleDateString()}
          </div>
        )}

        {/* What's included */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">{t("dataExport.whatsIncluded", "What's included in your export:")}</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• {t("dataExport.includeProfile", "Profile information (name, bio, contact details)")}</li>
            <li>• {t("dataExport.includeExperience", "Work experience and education")}</li>
            <li>• {t("dataExport.includePosts", "Posts, articles, and replies")}</li>
            <li>• {t("dataExport.includeMessages", "Direct messages")}</li>
            <li>• {t("dataExport.includeConnections", "Connections and follows")}</li>
            <li>• {t("dataExport.includeSaved", "Saved items and reactions")}</li>
            <li>• {t("dataExport.includeSettings", "Privacy settings and consents")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
