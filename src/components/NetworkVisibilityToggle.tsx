
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UsersRound } from "lucide-react";

interface NetworkVisibilityToggleProps {
  initialValue?: boolean;
  onChange?: (value: boolean) => void;
}

const NetworkVisibilityToggle = ({ 
  initialValue = true, 
  onChange 
}: NetworkVisibilityToggleProps) => {
  const [enabled, setEnabled] = useState(initialValue);
  
  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (onChange) {
      onChange(checked);
    }
  };
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersRound size={18} className="text-bondy-primary" />
          <Label htmlFor="network-visibility" className="font-medium">Show my network connections to others</Label>
        </div>
        <Switch 
          id="network-visibility" 
          checked={enabled}
          onCheckedChange={handleToggle}
        />
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
