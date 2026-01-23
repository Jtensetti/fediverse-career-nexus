import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowRightLeft, Plus, Trash, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AccountMigrationSection() {
  const { t } = useTranslation();
  const [alsoKnownAs, setAlsoKnownAs] = useState<string[]>([]);
  const [movedTo, setMovedTo] = useState<string | null>(null);
  const [newAliasUrl, setNewAliasUrl] = useState("");
  const [newAccountUrl, setNewAccountUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [actorId, setActorId] = useState<string | null>(null);

  useEffect(() => {
    fetchActorData();
  }, []);

  const fetchActorData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: actor, error } = await supabase
        .from("actors")
        .select("id, also_known_as, moved_to")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (actor) {
        setActorId(actor.id);
        setAlsoKnownAs(actor.also_known_as || []);
        setMovedTo(actor.moved_to);
      }
    } catch (error) {
      console.error("Error fetching actor data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addAlias = async () => {
    if (!newAliasUrl.trim() || !actorId) return;

    // Validate URL format
    try {
      new URL(newAliasUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsSaving(true);
    try {
      const updatedAliases = [...alsoKnownAs, newAliasUrl.trim()];
      
      const { error } = await supabase
        .from("actors")
        .update({ also_known_as: updatedAliases })
        .eq("id", actorId);

      if (error) throw error;

      setAlsoKnownAs(updatedAliases);
      setNewAliasUrl("");
      toast.success("Alternative account linked successfully");
    } catch (error) {
      console.error("Error adding alias:", error);
      toast.error("Failed to add alternative account");
    } finally {
      setIsSaving(false);
    }
  };

  const removeAlias = async (url: string) => {
    if (!actorId) return;

    setIsSaving(true);
    try {
      const updatedAliases = alsoKnownAs.filter(a => a !== url);
      
      const { error } = await supabase
        .from("actors")
        .update({ also_known_as: updatedAliases })
        .eq("id", actorId);

      if (error) throw error;

      setAlsoKnownAs(updatedAliases);
      toast.success("Alternative account removed");
    } catch (error) {
      console.error("Error removing alias:", error);
      toast.error("Failed to remove alternative account");
    } finally {
      setIsSaving(false);
    }
  };

  const inititateMigration = async () => {
    if (!newAccountUrl.trim()) return;

    setIsMigrating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("You must be logged in");
        return;
      }

      const response = await supabase.functions.invoke("send-move", {
        body: { new_account_url: newAccountUrl.trim() }
      });

      if (response.error) {
        throw new Error(response.error.message || "Migration failed");
      }

      setMovedTo(newAccountUrl.trim());
      toast.success("Account migration initiated! Your followers will be notified.");
    } catch (error: any) {
      console.error("Migration error:", error);
      toast.error(error.message || "Failed to initiate migration");
    } finally {
      setIsMigrating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // If already migrated, show status
  if (movedTo) {
    return (
      <Card className="border-yellow-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <ArrowRightLeft className="h-5 w-5" />
            {t("migration.movedTitle", "Account Migrated")}
          </CardTitle>
          <CardDescription>
            {t("migration.movedDescription", "Your account has been migrated to another instance.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
            <ExternalLink className="h-4 w-4" />
            <a href={movedTo} target="_blank" rel="noopener noreferrer" className="underline">
              {movedTo}
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          {t("migration.title", "Account Migration")}
        </CardTitle>
        <CardDescription>
          {t("migration.description", "Link alternative accounts or migrate to another Fediverse instance")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Also Known As Section */}
        <div className="space-y-3">
          <Label>{t("migration.alsoKnownAs", "Alternative Accounts (alsoKnownAs)")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("migration.alsoKnownAsDescription", "Link other Fediverse accounts you control. This is required before migrating TO this account from another instance.")}
          </p>
          
          <div className="flex gap-2">
            <Input
              value={newAliasUrl}
              onChange={(e) => setNewAliasUrl(e.target.value)}
              placeholder="https://mastodon.social/@username"
              disabled={isSaving}
            />
            <Button onClick={addAlias} disabled={isSaving || !newAliasUrl.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {alsoKnownAs.length > 0 && (
            <div className="space-y-2">
              {alsoKnownAs.map((url) => (
                <div key={url} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline truncate">
                    {url}
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => removeAlias(url)} disabled={isSaving}>
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Migration Section */}
        <div className="space-y-3 pt-4 border-t">
          <Label>{t("migration.migrateAway", "Migrate to Another Instance")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("migration.migrateAwayDescription", "Move your account to another Fediverse instance. Your followers will be notified and asked to follow your new account.")}
          </p>

          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">{t("migration.warning", "Warning: This action is irreversible")}</p>
                <p className="text-muted-foreground mt-1">
                  {t("migration.warningDescription", "Before migrating, you must add your Nolto account URL to the alsoKnownAs field on your new account.")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={newAccountUrl}
              onChange={(e) => setNewAccountUrl(e.target.value)}
              placeholder="https://mastodon.social/@newaccount"
              disabled={isMigrating}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isMigrating || !newAccountUrl.trim()}>
                  {isMigrating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("migration.migrate", "Migrate")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("migration.confirmTitle", "Are you sure you want to migrate?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("migration.confirmDescription", "This will mark your Nolto account as moved and notify all your followers. They will need to manually follow your new account. This action cannot be undone.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={inititateMigration} className="bg-destructive hover:bg-destructive/90">
                    {t("migration.confirmMigrate", "Yes, migrate my account")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
