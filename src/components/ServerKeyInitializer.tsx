
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Key, CheckCircle, AlertCircle } from "lucide-react";

export default function ServerKeyInitializer() {
  const [loading, setLoading] = useState(false);
  const [keyStatus, setKeyStatus] = useState<"unknown" | "exists" | "none" | "created">("unknown");
  const [actorKeyStatus, setActorKeyStatus] = useState<"checking" | "ok" | "needs_keys">("checking");
  const { toast } = useToast();

  const checkServerKey = async () => {
    setLoading(true);
    try {
      // Check if a server key already exists
      const { count, error } = await supabase
        .from("server_keys")
        .select("*", { count: "exact", head: true })
        .is("revoked_at", null);
      
      if (error) {
        throw error;
      }
      
      setKeyStatus(count && count > 0 ? "exists" : "none");
    } catch (error) {
      console.error("Error checking server key:", error);
      toast({
        title: "Error",
        description: "Kunde inte kontrollera servernyckels status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkActorKeys = async () => {
    try {
      // Get current user's actor
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: actor } = await supabase
        .from('actors')
        .select('id, private_key, public_key')
        .eq('user_id', user.id)
        .single();

      if (actor) {
        // Use the new database function to check if keys exist
        const { data: hasKeys, error } = await supabase
          .rpc('ensure_actor_has_keys', { actor_uuid: actor.id });
        
        if (error) {
          console.error('Error checking actor keys:', error);
          setActorKeyStatus("needs_keys");
        } else {
          setActorKeyStatus(hasKeys ? "ok" : "needs_keys");
        }
      } else {
        setActorKeyStatus("needs_keys");
      }
    } catch (error) {
      console.error("Error checking actor keys:", error);
      setActorKeyStatus("needs_keys");
    }
  };

  const generateServerKey = async () => {
    setLoading(true);
    try {
      // Call the key-manager edge function to generate a new key
      const { data, error } = await supabase.functions.invoke("key-manager");
      
      if (error) {
        throw error;
      }
      
      setKeyStatus("created");
      toast({
        title: "Success",
        description: "Servernyckel genererades",
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating server key:", error);
      toast({
        title: "Error",
        description: "Kunde inte generera servernyckel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateActorKeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call the create-user-actor edge function
      const { data, error } = await supabase.functions.invoke("create-user-actor", {
        body: { user_id: user.id }
      });
      
      if (error) {
        throw error;
      }
      
      setActorKeyStatus("ok");
      toast({
        title: "Success",
        description: "Aktörnycklar genererades",
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating actor keys:", error);
      toast({
        title: "Error",
        description: "Kunde inte generera aktörnycklar",
        variant: "destructive",
      });
    }
  };

  // Check status when component mounts
  useEffect(() => {
    checkServerKey();
    checkActorKeys();
  }, []);

  return (
    <div className="space-y-4">
      {/* Servernyckelhantering */}
      <div className="p-4 bg-card border rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium">Servernyckelhantering</h3>
            <p className="text-muted-foreground text-sm">
              {keyStatus === "unknown" && "Kontrollerar servernyckels status..."}
              {keyStatus === "exists" && "Servern har ett giltigt RSA-nyckelpar"}
              {keyStatus === "none" && "Ingen servernyckel hittad - generera en för att aktivera federation"}
              {keyStatus === "created" && "Servernyckel skapades"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {keyStatus === "exists" || keyStatus === "created" ? (
              <CheckCircle className="text-green-500" />
            ) : keyStatus === "none" ? (
              <AlertCircle className="text-yellow-500" />
            ) : (
              <Key className="text-muted-foreground" />
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {keyStatus === "none" && (
            <Button 
              onClick={generateServerKey} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Generera servernyckel
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={checkServerKey} 
            disabled={loading}
          >
            Uppdatera status
          </Button>
        </div>
      </div>

      {/* Aktörnyckelhantering */}
      <div className="p-4 bg-card border rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium">Aktörnyckelhantering</h3>
            <p className="text-muted-foreground text-sm">
              {actorKeyStatus === "checking" && "Kontrollerar aktörnyckels status..."}
              {actorKeyStatus === "ok" && "Aktören har ett giltigt RSA-nyckelpar"}
              {actorKeyStatus === "needs_keys" && "Aktören behöver nyckelgenerering för federation"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {actorKeyStatus === "ok" ? (
              <CheckCircle className="text-green-500" />
            ) : actorKeyStatus === "needs_keys" ? (
              <AlertCircle className="text-yellow-500" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {actorKeyStatus === "needs_keys" && (
            <Button 
              onClick={generateActorKeys}
              className="flex items-center gap-2"
            >
              Generera aktörnycklar
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={checkActorKeys}
          >
            Uppdatera status
          </Button>
        </div>
      </div>
    </div>
  );
}
