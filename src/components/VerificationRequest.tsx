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
import { requestExperienceVerification, requestEducationVerification } from "@/services/profileCVService";

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
        title: "Token copied!",
        description: "Verification token copied to clipboard"
      });
    }
  };
  
  const getTxtRecordInstructions = () => {
    if (!companyDomain) return null;
    
    return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold">Domain Verification</h4>
        <p className="text-sm text-muted-foreground mt-1">
          Add the following TXT record to your domain's DNS settings:
        </p>
        <div className="bg-muted p-2 rounded mt-2 flex justify-between items-center">
          <code className="text-xs break-all">{`nolto-verify=${token}`}</code>
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
          Request Verification
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Verification</DialogTitle>
          <DialogDescription>
            {type === "experience" 
              ? "Request verification for your work experience."
              : "Request verification for your education credentials."}
          </DialogDescription>
        </DialogHeader>
        
        {!token ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {type === "experience" 
                ? "We'll generate a verification token that you can use to prove your employment."
                : "We'll generate a verification token that you can use to verify your education credentials."}
            </p>
            
            <Button 
              onClick={requestVerification} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Verification Token"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="token">Verification Token</Label>
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
              Share this verification token with the {type === "experience" ? "employer" : "institution"} 
              to verify your credentials.
            </p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationRequest;
