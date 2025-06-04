
import { useState, useEffect } from "react";
import { UserPlus, UserCheck, UserX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ensureActorKeys } from "@/services/actorService";
import { getOutgoingFollowStatus, subscribeToOutgoingFollows } from "@/services/outgoingFollowsService";

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
  const [followStatus, setFollowStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!localActorId) return;
      
      try {
        const status = await getOutgoingFollowStatus(localActorId, remoteActorUri);
        setFollowStatus(status);
      } catch (error) {
        console.error("Error fetching follow status:", error);
      }
    };
    
    fetchFollowStatus();
    
    // Subscribe to real-time updates
    if (localActorId) {
      const subscription = subscribeToOutgoingFollows(localActorId, () => {
        fetchFollowStatus();
      });
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [localActorId, remoteActorUri]);
  
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
      const hasKeys = await ensureActorKeys(localActorId);
      
      if (!hasKeys) {
        console.error("Error ensuring actor keys");
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
      
      // Update local status to pending
      setFollowStatus('pending');
      
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
  
  const getButtonContent = () => {
    if (loading) {
      return {
        icon: <Clock size={16} className="animate-spin" />,
        text: "Processing...",
        variant: "secondary" as const
      };
    }
    
    switch (followStatus) {
      case 'pending':
        return {
          icon: <Clock size={16} />,
          text: "Pending",
          variant: "secondary" as const
        };
      case 'accepted':
        return {
          icon: <UserCheck size={16} />,
          text: "Following",
          variant: "default" as const
        };
      case 'rejected':
        return {
          icon: <UserX size={16} />,
          text: "Rejected",
          variant: "destructive" as const
        };
      default:
        return {
          icon: <UserPlus size={16} />,
          text: "Follow",
          variant: "default" as const
        };
    }
  };
  
  const { icon, text, variant } = getButtonContent();
  const isDisabled = disabled || loading || !localActorId || followStatus === 'accepted' || followStatus === 'pending';
  
  return (
    <Button 
      onClick={handleFollow} 
      disabled={isDisabled} 
      variant={variant}
      className="flex items-center gap-2"
    >
      {icon}
      <span>{text}</span>
    </Button>
  );
}
