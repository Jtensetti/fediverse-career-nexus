
import { useState, useEffect } from "react";
import { ExternalLink, Key, Globe2, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FederationFollowButton from "./FederationFollowButton";

interface FederationInfoProps {
  username: string;
  isOwnProfile: boolean;
}

export default function FederationInfo({ username, isOwnProfile }: FederationInfoProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [actor, setActor] = useState<any>(null);
  const [currentUserActor, setCurrentUserActor] = useState<any>(null);
  const [federationEnabled, setFederationEnabled] = useState<boolean>(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchActorInfo = async () => {
      try {
        setLoading(true);
        
        const { data: session } = await supabase.auth.getSession();
        
        // Fetch actor information for this user
        const { data, error } = await supabase
          .from("actors")
          .select("*")
          .eq("preferred_username", username)
          .single();
        
        if (error) {
          console.error("Error fetching actor information:", error);
          return;
        }
        
        setActor(data);
        setFederationEnabled(data?.status === "active");
        
        // If logged in, fetch current user's actor info for follow functionality
        if (session?.session?.user) {
          const { data: currentUserProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", session.session.user.id)
            .single();
            
          if (currentUserProfile) {
            const { data: currentUserActorData } = await supabase
              .from("actors")
              .select("*")
              .eq("preferred_username", currentUserProfile.username)
              .single();
              
            setCurrentUserActor(currentUserActorData);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (username) {
      fetchActorInfo();
    }
  }, [username]);
  
  const toggleFederation = async (enabled: boolean) => {
    if (!isOwnProfile || !actor) return;
    
    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from("actors")
        .update({ status: enabled ? "active" : "disabled" })
        .eq("id", actor.id);
      
      if (error) {
        toast({
          title: "Error updating federation status",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      setFederationEnabled(enabled);
      toast({
        title: `Federation ${enabled ? "enabled" : "disabled"}`,
        description: `Your profile is now ${enabled ? "visible to" : "hidden from"} other Fediverse instances.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error updating federation status:", error);
      toast({
        title: "An error occurred",
        description: "Could not update federation status.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };
  
  if (loading) {
    return null; // Or a loading spinner
  }
  
  if (!actor) {
    return null; // This user doesn't have a federated profile
  }
  
  const domain = window.location.hostname;
  const federatedHandle = `@${username}@${domain}`;
  const remoteActorUri = `${window.location.origin}/actor/${username}`;
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe2 size={20} className="text-bondy-primary" />
            Fediverse Profile
          </h3>
          
          {isOwnProfile && (
            <div className="flex items-center space-x-2">
              <Label htmlFor="federation-toggle">
                {federationEnabled ? "Active" : "Disabled"}
              </Label>
              <Switch
                id="federation-toggle"
                checked={federationEnabled}
                onCheckedChange={toggleFederation}
                disabled={updating}
              />
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col space-y-1">
            <Label className="text-sm text-muted-foreground">Fediverse Handle</Label>
            <div className="flex items-center space-x-2">
              <code className="bg-muted px-2 py-1 rounded text-sm">{federatedHandle}</code>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigator.clipboard.writeText(federatedHandle)}>
                <span className="sr-only">Copy handle</span>
                <ExternalLink size={14} />
              </Button>
            </div>
          </div>
          
          {actor.key_fingerprint && (
            <div className="flex flex-col space-y-1">
              <Label className="text-sm text-muted-foreground">Key Fingerprint</Label>
              <div className="flex items-center space-x-2">
                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{actor.key_fingerprint}</code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigator.clipboard.writeText(actor.key_fingerprint)}>
                  <span className="sr-only">Copy fingerprint</span>
                  <Key size={14} />
                </Button>
              </div>
            </div>
          )}
          
          {!isOwnProfile && currentUserActor && (
            <div className="mt-4 pt-4 border-t">
              <FederationFollowButton
                remoteActorUri={remoteActorUri}
                localActorId={currentUserActor.id}
                disabled={!currentUserActor || currentUserActor.status !== "active"}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
