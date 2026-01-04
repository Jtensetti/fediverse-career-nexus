
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UsersRound, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { 
  getProfileVisibilitySettings, 
  updateProfileVisibilitySettings 
} from "@/services/connectionsService";

interface NetworkVisibilityToggleProps {
  initialValue?: boolean;
  onChange?: (value: boolean) => void;
}

const NetworkVisibilityToggle = ({ initialValue, onChange }: NetworkVisibilityToggleProps) => {
  const [enabled, setEnabled] = useState(initialValue ?? true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { t } = useTranslation();
  
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        // Only fetch from service if initialValue is not provided
        if (initialValue === undefined) {
          const showVisitors = await getProfileVisibilitySettings();
          setEnabled(showVisitors);
        }
      } catch (error) {
        console.error("Error fetching profile visibility settings:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [initialValue]);
  
  const handleToggle = async (checked: boolean) => {
    setUpdating(true);
    try {
      // If onChange is provided, use it, otherwise update service
      if (onChange) {
        onChange(checked);
        setEnabled(checked);
      } else {
        const success = await updateProfileVisibilitySettings(checked);
        if (success) {
          setEnabled(checked);
        }
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
          <UsersRound size={18} className="text-primary" />
          <Label htmlFor="network-visibility" className="font-medium">{t('network.showConnections')}</Label>
        </div>
        {loading ? (
          <Loader2 size={18} className="animate-spin text-muted-foreground" aria-label={t('common.loading')} />
        ) : (
          <Switch 
            id="network-visibility" 
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={updating}
            aria-label={t('network.showConnections')}
          />
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {enabled 
          ? t('network.connectionsVisible')
          : t('network.connectionsHidden')}
      </p>
    </div>
  );
};

export default NetworkVisibilityToggle;
