
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Key } from "lucide-react";

export default function ServerKeyInitializer() {
  const [loading, setLoading] = useState(false);
  const [keyStatus, setKeyStatus] = useState<"unknown" | "exists" | "none" | "created">("unknown");
  const { toast } = useToast();

  const checkServerKey = async () => {
    setLoading(true);
    try {
      // First check if a key already exists in the database
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
        description: "Failed to check server key status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        description: "Server key generated successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating server key:", error);
      toast({
        title: "Error",
        description: "Failed to generate server key",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check status when component mounts
  useState(() => {
    checkServerKey();
  });

  return (
    <div className="p-4 bg-card border rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Server Key Management</h3>
          <p className="text-muted-foreground text-sm">
            {keyStatus === "unknown" && "Checking server key status..."}
            {keyStatus === "exists" && "Server has a valid RSA key pair"}
            {keyStatus === "none" && "No server key found - generate one to enable federation"}
            {keyStatus === "created" && "Server key created successfully"}
          </p>
        </div>
        <Key className="text-muted-foreground" />
      </div>
      
      <div className="flex gap-2">
        {keyStatus === "none" && (
          <Button 
            onClick={generateServerKey} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate Server Key
          </Button>
        )}
        
        <Button 
          variant="outline"
          onClick={checkServerKey} 
          disabled={loading}
        >
          Refresh Status
        </Button>
      </div>
    </div>
  );
}
