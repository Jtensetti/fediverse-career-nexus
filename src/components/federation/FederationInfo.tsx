import { createUserActor } from "@/services/federation/actorService";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ExternalLink, Key, Globe2, Copy, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getNoltoInstanceDomain, getLocalActorUrl, getWebFingerUrl } from "@/lib/federation";

interface FederationInfoProps {
  username: string;
  isOwnProfile: boolean;
}

export default function FederationInfo({ username, isOwnProfile }: FederationInfoProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [actor, setActor] = useState<any>(null);
  const [federationEnabled, setFederationEnabled] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [lookupInstance, setLookupInstance] = useState("mastodon.social");
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchActorInfo = async () => {
      try {
        setLoading(true);
        
        
        const { data, error } = await supabase
          .from("public_actors")
          .select("*")
          .eq("preferred_username", username).eq("is_remote", false)
          .single();
        
        if (error) {
          console.error("Error fetching actor information:", error);
          return;
        }
        
        setActor(data);
        setFederationEnabled(data?.status === "active");
        
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
      
      const { error } = enabled
        ? await createUserActor(actor.user_id).then(ok => ({ error: ok ? null : new Error("Kunde inte aktivera federation") }))
        : await supabase.from("actors").update({ status: "disabled" }).eq("id", actor.id);
      
      if (error) {
        toast({
          title: "Kunde inte uppdatera federationsstatus",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      setFederationEnabled(enabled);
      toast({
        title: `Federation ${enabled ? "aktiverad" : "inaktiverad"}`,
        description: enabled ? "Din offentliga profil kan hittas från andra servrar." : "Nya federationsleveranser stoppas. Kopior på andra servrar kan finnas kvar.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error updating federation status:", error);
      toast({
        title: "Ett fel inträffade",
        description: "Kunde inte uppdatera federationsstatus.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };
  
  if (loading) {
    return null;
  }
  
  if (!actor) {
    return null;
  }
  
  const isLocalUser = !actor.is_remote;
  const domain = isLocalUser ? getNoltoInstanceDomain() : actor.home_instance;
  const federatedHandle = `@${username}@${domain}`;
  const remoteActorUri = getLocalActorUrl(username);
  const normalizedLookupInstance = lookupInstance
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  const remoteProfileUrl = normalizedLookupInstance
    ? `https://${normalizedLookupInstance}/@${username}@${domain}`
    : "";
  
  const copyHandle = async () => {
    try {
      await navigator.clipboard.writeText(federatedHandle);
      setCopied(true);
      toast({ title: "Handle kopierad!", description: federatedHandle });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Kunde inte kopiera", variant: "destructive" });
    }
  };

  const openRemoteProfile = () => {
    if (!normalizedLookupInstance) {
      toast({
        title: "Ange en instansdomän",
        description: "Lägg till en domän som mastodon.social för att öppna din profil.",
        variant: "destructive"
      });
      return;
    }

    window.open(remoteProfileUrl, "_blank", "noopener,noreferrer");
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe2 size={20} className="text-bondy-primary" />
            Fediverse-profil
          </h3>
          
          {isOwnProfile && (
            <div className="flex items-center space-x-2">
              <Label htmlFor="federation-toggle">
                {federationEnabled ? "Aktiv" : "Inaktiverad"}
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
            <Label className="text-sm text-muted-foreground">Fediverse-handle</Label>
            <div className="flex items-center space-x-2">
              <code className="bg-muted px-2 py-1 rounded text-sm">{federatedHandle}</code>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyHandle}>
                <span className="sr-only">Kopiera handle</span>
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">Adressen är inte en e-postadress. När den publicerats kan användarnamnet inte bytas utan kontoflytt.</p>
          <p className="flex flex-wrap gap-4 text-sm"><Link className="underline" to="/federation">Så fungerar federation</Link><a className="underline" href={getWebFingerUrl(username)} target="_blank" rel="noopener noreferrer">WebFinger</a><a className="underline" href={remoteActorUri} target="_blank" rel="noopener noreferrer">ActivityPub-profil</a></p>
          <div className="flex flex-col space-y-2">
            <Label className="text-sm text-muted-foreground">Hitta din profil på en annan instans</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={lookupInstance}
                onChange={(event) => setLookupInstance(event.target.value)}
                placeholder="mastodon.social"
                className="sm:max-w-xs"
              />
              <Button type="button" onClick={openRemoteProfile} className="sm:w-auto">
                <ExternalLink size={16} />
                <span className="ml-2">Öppna på instans</span>
              </Button>
            </div>
            {remoteProfileUrl && (
              <p className="text-xs text-muted-foreground">
                Detta öppnar{" "}
                <span className="font-mono text-foreground">{remoteProfileUrl}</span>
              </p>
            )}
          </div>
          
          {actor.key_fingerprint && (
            <div className="flex flex-col space-y-1">
              <Label className="text-sm text-muted-foreground">Nyckelfingeravtryck</Label>
              <div className="flex items-center space-x-2">
                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{actor.key_fingerprint}</code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigator.clipboard.writeText(actor.key_fingerprint)}>
                  <span className="sr-only">Kopiera fingeravtryck</span>
                  <Key size={14} />
                </Button>
              </div>
            </div>
          )}
          

        </div>
      </CardContent>
    </Card>
  );
}
