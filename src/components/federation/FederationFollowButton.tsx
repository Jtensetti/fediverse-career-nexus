import { useState, useEffect } from "react";
import { UserPlus, UserCheck, UserX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ensureActorKeys } from "@/services/federation/actorService";
import { getOutgoingFollowStatus, subscribeToOutgoingFollows } from "@/services/federation/outgoingFollowsService";

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
      
      const { data, error } = await supabase.rpc('create_follow', {
        p_local_actor_id: localActorId,
        p_remote_actor_url: remoteActorUri
      });
      
      if (error) {
        toast({
          title: "Följning misslyckades",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Följförfrågan skickad",
        description: "Din följförfrågan har lagts i kö för federation med korrekta HTTP-signaturer.",
        variant: "default"
      });
      
      setFollowStatus('pending');
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
          text: "Väntande",
          variant: "secondary" as const
        };
      case 'accepted':
        return {
          icon: <UserCheck size={16} />,
          text: "Följer",
          variant: "default" as const
        };
      case 'rejected':
        return {
          icon: <UserX size={16} />,
          text: "Avvisad",
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
