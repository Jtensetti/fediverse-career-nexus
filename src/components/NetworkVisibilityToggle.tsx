
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UsersRound, Loader2 } from "lucide-react";
import { 
  getProfileVisibilitySettings, 
  updateProfileVisibilitySettings 
} from "@/services/networkConnectionsService";

interface NetworkVisibilityToggleProps {
  initialValue?: boolean;
  onChange?: (value: boolean) => void;
}

const NetworkVisibilityToggle = ({ initialValue, onChange }: NetworkVisibilityToggleProps) => {
  const [enabled, setEnabled] = useState(initialValue ?? true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
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
          <UsersRound size={18} className="text-bondy-primary" />
          <Label htmlFor="network-visibility" className="font-medium">Show my network connections to others</Label>
        </div>
        {loading ? (
          <Loader2 size={18} className="animate-spin text-gray-400" />
        ) : (
          <Switch 
            id="network-visibility" 
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={updating}
          />
        )}
      </div>
      <p className="text-sm text-gray-600">
        {enabled 
          ? "Your connections can see your network and your degree of connection with other members." 
          : "Your connections will not be visible to others and you won't appear in others' connection lists."}
      </p>
    </div>
  );
};

export default NetworkVisibilityToggle;
