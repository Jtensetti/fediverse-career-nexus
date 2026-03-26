import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EmailNotificationPreferences = () => {
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPreference = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("email_digest_enabled")
          .eq("id", user.id)
          .single();

        if (data) {
          setDigestEnabled(data.email_digest_enabled !== false);
        }
      } catch (error) {
        console.error("Error fetching email preferences:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreference();
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Du måste vara inloggad");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ 
          email_digest_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;

      setDigestEnabled(enabled);
      toast.success(enabled ? "E-postnotifieringar aktiverade" : "E-postnotifieringar inaktiverade");
    } catch (error) {
      console.error("Error updating email preferences:", error);
      toast.error("Kunde inte uppdatera inställningar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="h-3 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-6 w-11 bg-muted animate-pulse rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Mail size={16} className="text-primary" />
        <span>E-postnotifieringar</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="digest-toggle" className="font-normal">
            Sammanfattningsmail för notifieringar
          </Label>
          <p className="text-sm text-muted-foreground">
            Ta emot e-postsammanfattningar av olästa notifieringar
          </p>
        </div>
        <Switch
          id="digest-toggle"
          checked={digestEnabled}
          onCheckedChange={handleToggle}
          disabled={saving}
        />
      </div>
    </div>
  );
};

export default EmailNotificationPreferences;
