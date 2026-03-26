import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitReport, type ContentType } from "@/services/reportService";

interface ReportDialogProps {
  contentType: ContentType;
  contentId: string;
  contentTitle?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const reportReasons = [
  { value: "spam", label: "Spam eller vilseledande" },
  { value: "harassment", label: "Trakasserier eller mobbning" },
  { value: "hate_speech", label: "Hatretorik eller diskriminering" },
  { value: "inappropriate", label: "Olämpligt innehåll" },
  { value: "impersonation", label: "Identitetsstöld" },
  { value: "other", label: "Annat" },
];

const contentTypeLabels: Record<string, string> = {
  post: "inlägg",
  article: "artikel",
  comment: "kommentar",
  job: "jobbannons",
  event: "evenemang",
  user: "användare",
  company: "företag",
};

export function ReportDialog({
  contentType,
  contentId,
  contentTitle,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ReportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const localizedType = contentTypeLabels[contentType] || contentType;

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Välj en anledning för rapporteringen");
      return;
    }

    setIsSubmitting(true);
    
    const success = await submitReport(contentType, contentId, reason, details || undefined);
    
    if (success) {
      toast.success("Rapport inskickad. Vi granskar den inom kort.");
      setOpen(false);
      setReason("");
      setDetails("");
    } else {
      toast.error("Kunde inte skicka rapport. Försök igen.");
    }
    setIsSubmitting(false);
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Rapportera {localizedType}</DialogTitle>
        <DialogDescription>
          {contentTitle 
            ? `Rapporterar: "${contentTitle.substring(0, 50)}${contentTitle.length > 50 ? '...' : ''}"`
            : `Hjälp oss förstå vad som är fel med detta ${localizedType}.`
          }
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div className="space-y-3">
          <Label>Anledning till rapportering</Label>
          <RadioGroup value={reason} onValueChange={setReason}>
            {reportReasons.map((r) => (
              <div key={r.value} className="flex items-center space-x-2">
                <RadioGroupItem value={r.value} id={r.value} />
                <Label htmlFor={r.value} className="font-normal cursor-pointer">
                  {r.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="details">Ytterligare detaljer (valfritt)</Label>
          <Textarea
            id="details"
            placeholder="Ge ytterligare sammanhang..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Avbryt
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !reason}
          className="bg-destructive hover:bg-destructive/90"
        >
          {isSubmitting ? "Skickar..." : "Skicka rapport"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (isControlled && !trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag className="h-4 w-4 mr-1" />
            Rapportera
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}

export default ReportDialog;
