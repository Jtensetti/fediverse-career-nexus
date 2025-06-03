
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FederationFollowButtonProps {
  remoteActorUri: string;
  localActorId?: string;
  disabled?: boolean;
}

export default function FederationFollowButton({
  remoteActorUri,
  localActorId,
  disabled = false
}: FederationFollowButtonProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();
  
  const handleFollow = async () => {
    if (!localActorId) {
      toast({
        title: "Cannot follow",
        description: "You need to be logged in and have an active federation profile to follow others.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Ensure the actor has RSA keys before creating follow
      const { error: ensureKeysError } = await supabase.rpc('ensure_actor_keys', {
        actor_id: localActorId
      });
      
      if (ensureKeysError) {
        console.error("Error ensuring actor keys:", ensureKeysError);
        toast({
          title: "Key generation failed",
          description: "Could not generate signing keys for your actor.",
          variant: "destructive"
        });
        return;
      }
      
      const { data, error } = await supabase.rpc('create_follow', {
        local_actor_id: localActorId,
        remote_actor_uri: remoteActorUri
      });
      
      if (error) {
        console.error("Error following actor:", error);
        toast({
          title: "Follow failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Follow request sent",
        description: "Your follow request has been queued for federation with proper HTTP signatures.",
        variant: "default"
      });
      
      console.log("Follow activity created with ID:", data);
    } catch (error) {
      console.error("Error following actor:", error);
      toast({
        title: "An error occurred",
        description: "Could not send follow request.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={handleFollow} 
      disabled={disabled || loading || !localActorId} 
      className="flex items-center gap-2"
    >
      <UserPlus size={16} />
      <span>{loading ? "Processing..." : "Follow"}</span>
    </Button>
  );
}
