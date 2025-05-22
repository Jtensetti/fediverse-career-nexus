
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const AdminFixSecurityInvoker = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFixViews = async () => {
    try {
      setIsFixing(true);
      setResult(null);

      const { data, error } = await supabase.functions.invoke("fix-security-invoker", {
        body: {},
      });

      if (error) {
        throw error;
      }

      setResult(data);
      toast({
        title: "Views updated successfully",
        description: "All views have been updated to use SECURITY INVOKER",
      });
    } catch (error) {
      console.error("Error fixing view security:", error);
      toast({
        title: "Failed to update views",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          Security Invoker Fix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This utility will update all federation-related views to use SECURITY INVOKER
          context, resolving any Supabase linter warnings about SECURITY DEFINER views.
        </p>
        
        <Button 
          onClick={handleFixViews} 
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Updating views...
            </>
          ) : (
            "Fix View Security Settings"
          )}
        </Button>

        {result && (
          <div className="mt-4 rounded-md bg-muted p-3">
            <h3 className="font-medium mb-2">Updated views:</h3>
            <ul className="list-disc list-inside text-sm">
              {result.views.map((view: string) => (
                <li key={view} className="text-xs">{view}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4">
          <p>Note: After running this fix, you may need to wait a few minutes for 
          the Supabase linter to refresh its cache before the warnings disappear.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminFixSecurityInvoker;
