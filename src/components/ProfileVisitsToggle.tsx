
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

// Helper function to get profile visibility settings
const getProfileVisibilitySettings = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('show_network_connections')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching visibility settings:', error);
      return true;
    }
    
    return data?.show_network_connections ?? true;
  } catch (error) {
    console.error('Error fetching visibility settings:', error);
    return true;
  }
};

// Helper function to update profile visibility settings
const updateProfileVisibilitySettings = async (visible: boolean): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        show_network_connections: visible,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error updating visibility settings:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating visibility settings:', error);
    return false;
  }
};

const ProfileVisitsToggle = () => {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { t } = useTranslation();
  
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const showVisitors = await getProfileVisibilitySettings();
        setEnabled(showVisitors);
      } catch (error) {
        console.error("Error fetching profile visibility settings:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  const handleToggle = async (checked: boolean) => {
    setUpdating(true);
    try {
      const success = await updateProfileVisibilitySettings(checked);
      if (success) {
        setEnabled(checked);
      }
    } catch (error) {
      console.error("Error updating profile visibility settings:", error);
    } finally {
      setUpdating(false);
    }
  };
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye size={18} className="text-primary" />
          <Label htmlFor="profile-visits-visibility" className="font-medium">{t('profile.showWhoViewed')}</Label>
        </div>
        {loading ? (
          <Loader2 size={18} className="animate-spin text-muted-foreground" aria-label={t('common.loading')} />
        ) : (
          <Switch 
            id="profile-visits-visibility" 
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={updating}
            aria-label={t('profile.showWhoViewed')}
          />
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {enabled 
          ? t('profile.profileViewsVisible')
          : t('profile.profileViewsAnonymous')}
      </p>
    </div>
  );
};

export default ProfileVisitsToggle;
