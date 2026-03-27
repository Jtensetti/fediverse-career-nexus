
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
        title: "Vyer uppdaterade",
        description: "Alla vyer har uppdaterats till SECURITY INVOKER",
      });
    } catch (error) {
      console.error("Error fixing view security:", error);
      toast({
        title: "Kunde inte uppdatera vyer",
        description: error.message || "Ett okänt fel inträffade",
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
          Säkerhetsfix för vyer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Detta verktyg uppdaterar alla federationsrelaterade vyer till SECURITY INVOKER-kontext,
          vilket löser eventuella varningar om SECURITY DEFINER-vyer.
        </p>
        
        <Button 
          onClick={handleFixViews} 
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Uppdaterar vyer...
            </>
          ) : (
            "Åtgärda säkerhetsinställningar"
          )}
        </Button>

        {result && (
          <div className="mt-4 rounded-md bg-muted p-3">
            <h3 className="font-medium mb-2">Uppdaterade vyer:</h3>
            <ul className="list-disc list-inside text-sm">
              {result.views.map((view: string) => (
                <li key={view} className="text-xs">{view}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4">
          <p>OBS: Efter att denna fix har körts kan det ta några minuter innan 
          varningarna försvinner.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminFixSecurityInvoker;