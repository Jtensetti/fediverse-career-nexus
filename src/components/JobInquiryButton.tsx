import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { sendJobMessage } from "@/services/jobMessagingService";

interface JobInquiryButtonProps {
  jobId: string;
  jobTitle: string;
  posterId: string;
  companyName: string;
}

export function JobInquiryButton({ jobId, jobTitle, posterId, companyName }: JobInquiryButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Don't show button if user is the poster
  if (user?.id === posterId) {
    return null;
  }

  const handleSend = async () => {
    if (!user) {
      toast.error("Please sign in to send a message");
      navigate("/auth");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSending(true);
    const success = await sendJobMessage(jobId, posterId, message.trim());
    setIsSending(false);

    if (success) {
      toast.success("Message sent successfully!");
      setMessage("");
      setIsOpen(false);
      // Navigate to messages with the poster
      navigate(`/messages/${posterId}?job=${jobId}`);
    }
  };

  const defaultMessage = `Hi, I'm interested in the "${jobTitle}" position at ${companyName}. I'd love to learn more about this opportunity.`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <MessageCircle className="h-4 w-4 mr-2" />
          Message Hiring Manager
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a Message</DialogTitle>
          <DialogDescription>
            Reach out about the {jobTitle} position at {companyName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Write your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px]"
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setMessage(defaultMessage)}
          >
            Use template message
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim()}>
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
