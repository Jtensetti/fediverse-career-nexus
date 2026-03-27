import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Copy, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { requestExperienceVerification, requestEducationVerification } from "@/services/profile/profileCVService";

interface VerificationRequestProps {
  type: "experience" | "education";
  itemId: string;
  companyDomain?: string;
}

const VerificationRequest = ({ type, itemId, companyDomain }: VerificationRequestProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const requestVerification = async () => {
    setLoading(true);
    
    try {
      let verificationToken: string | null = null;
      
      if (type === "experience") {
        verificationToken = await requestExperienceVerification(itemId);
      } else if (type === "education") {
        verificationToken = await requestEducationVerification(itemId);
      }
      
      if (verificationToken) {
        setToken(verificationToken);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      toast({
        title: "Token kopierad!",
        description: "Verifieringstoken har kopierats till urklipp"
      });
    }
  };
  
  const getTxtRecordInstructions = () => {
    if (!companyDomain) return null;
    
    return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold">Domänverifiering</h4>
        <p className="text-sm text-muted-foreground mt-1">
          Lägg till följande TXT-post i din domäns DNS-inställningar:
        </p>
        <div className="bg-muted p-2 rounded mt-2 flex justify-between items-center">
          <code className="text-xs break-all">{`samverkan-verify=${token}`}</code>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={copyToClipboard}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <ShieldCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Begär verifiering</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Begär verifiering</DialogTitle>
          <DialogDescription>
            {type === "experience" 
              ? "Begär verifiering av din arbetslivserfarenhet."
              : "Begär verifiering av dina utbildningsmeriter."}
          </DialogDescription>
        </DialogHeader>
        
        {!token ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {type === "experience" 
                ? "Vi genererar en verifieringstoken som du kan använda för att bevisa din anställning."
                : "Vi genererar en verifieringstoken som du kan använda för att verifiera dina utbildningsmeriter."}
            </p>
            
            <Button 
              onClick={requestVerification} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Genererar...
                </>
              ) : (
                "Generera verifieringstoken"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="token">Verifieringstoken</Label>
              <div className="flex mt-1">
                <Input 
                  id="token" 
                  value={token} 
                  readOnly 
                  className="flex-1 font-mono text-sm"
                />
                <Button 
                  variant="ghost" 
                  onClick={copyToClipboard}
                  className="ml-2"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {getTxtRecordInstructions()}
            
            <p className="text-sm text-muted-foreground">
              Dela denna verifieringstoken med {type === "experience" ? "arbetsgivaren" : "lärosätet"} 
              {" "}för att verifiera dina meriter.
            </p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Stäng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationRequest;
