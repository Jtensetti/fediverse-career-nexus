
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, Loader2 } from "lucide-react";
import { 
  getProfileVisibilitySettings, 
  updateProfileVisibilitySettings 
} from "@/services/profileViewService";

const ProfileVisitsToggle = () => {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
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
          <Eye size={18} className="text-bondy-primary" />
          <Label htmlFor="profile-visits-visibility" className="font-medium">Show who viewed my profile</Label>
        </div>
        {loading ? (
          <Loader2 size={18} className="animate-spin text-gray-400" />
        ) : (
          <Switch 
            id="profile-visits-visibility" 
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={updating}
          />
        )}
      </div>
      <p className="text-sm text-gray-600">
        {enabled 
          ? "You'll see who viewed your profile, and others will know when you view theirs." 
          : "Profile views will be anonymous, and you won't see who viewed your profile."}
      </p>
    </div>
  );
};

export default ProfileVisitsToggle;
