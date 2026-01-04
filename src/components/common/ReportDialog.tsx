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
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate_speech", label: "Hate speech or discrimination" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
];

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

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason for reporting");
      return;
    }

    setIsSubmitting(true);
    
    const success = await submitReport(contentType, contentId, reason, details || undefined);
    
    if (success) {
      toast.success("Report submitted successfully. We'll review it shortly.");
      setOpen(false);
      setReason("");
      setDetails("");
    } else {
      toast.error("Failed to submit report. Please try again.");
    }
    setIsSubmitting(false);
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Report {contentType}</DialogTitle>
        <DialogDescription>
          {contentTitle 
            ? `Reporting: "${contentTitle.substring(0, 50)}${contentTitle.length > 50 ? '...' : ''}"`
            : `Help us understand what's wrong with this ${contentType}.`
          }
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div className="space-y-3">
          <Label>Reason for reporting</Label>
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
          <Label htmlFor="details">Additional details (optional)</Label>
          <Textarea
            id="details"
            placeholder="Provide any additional context..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !reason}
          className="bg-destructive hover:bg-destructive/90"
        >
          {isSubmitting ? "Submitting..." : "Submit Report"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  // If controlled mode without trigger, just render dialog without trigger
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
            Report
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}

export default ReportDialog;
