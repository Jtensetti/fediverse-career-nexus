import { useState, useEffect } from "react";
import { UserPlus, UserCheck, UserX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ensureActorKeys } from "@/services/federation/actorService";
import { getOutgoingFollowStatus, subscribeToOutgoingFollows, followRemoteActor, unfollowRemoteActor } from "@/services/federation/outgoingFollowsService";

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
        // Silently handle error - status will remain null
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
        title: "Kan inte följa",
        description: "Du måste vara inloggad och ha en aktiv federationsprofil för att följa andra.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const hasKeys = await ensureActorKeys(localActorId);
      
      if (!hasKeys) {
        toast({
          title: "Nyckelgenerering misslyckades",
          description: "Kunde inte generera signeringsnycklar för din aktör.",
          variant: "destructive"
        });
        return;
      }
      
      const unfollow = followStatus === 'accepted';
      const result = await (unfollow ? unfollowRemoteActor : followRemoteActor)(localActorId, remoteActorUri);
      if (!result.success) throw new Error(result.error || "Kunde inte skicka förfrågan");
      toast({ title: unfollow ? "Du följer inte längre kontot" : "Följförfrågan skickad" });
      setFollowStatus(unfollow ? null : await getOutgoingFollowStatus(localActorId, remoteActorUri) || 'pending');
    } catch (error) {
      toast({
        title: "Ett fel uppstod",
        description: "Kunde inte skicka följförfrågan.",
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
        text: "Bearbetar...",
        variant: "secondary" as const
      };
    }
    
    switch (followStatus) {
      case 'pending':
        return {
          icon: <Clock size={16} />,
          text: "Väntande · skicka igen",
          variant: "secondary" as const
        };
      case 'accepted':
        return {
          icon: <UserCheck size={16} />,
          text: "Sluta följa",
          variant: "default" as const
        };
      case 'rejected':
        return {
          icon: <UserX size={16} />,
          text: "Avvisad · försök igen",
          variant: "destructive" as const
        };
      default:
        return {
          icon: <UserPlus size={16} />,
          text: "Följ",
          variant: "default" as const
        };
    }
  };
  
  const { icon, text, variant } = getButtonContent();
  const isDisabled = disabled || loading || !localActorId;
  
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
