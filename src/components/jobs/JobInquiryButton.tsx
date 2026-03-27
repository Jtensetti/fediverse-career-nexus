import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { sendJobMessage } from "@/services/messaging/jobMessagingService";

interface JobInquiryButtonProps {
  jobId: string;
  jobTitle: string;
  posterId: string;
  companyName: string;
}

export function JobInquiryButton({ jobId, jobTitle, posterId, companyName }: JobInquiryButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (user?.id === posterId) {
    return null;
  }

  const handleSend = async () => {
    if (!user) {
      toast.error(t('jobInquiry.signInToSend'));
      navigate("/auth");
      return;
    }
    if (!message.trim()) {
      toast.error(t('jobInquiry.enterMessage'));
      return;
    }
    setIsSending(true);
    const success = await sendJobMessage(jobId, posterId, message.trim());
    setIsSending(false);
    if (success) {
      toast.success(t('jobInquiry.messageSent'));
      setMessage("");
      setIsOpen(false);
      navigate(`/messages/${posterId}?job=${jobId}`);
    }
  };

  const defaultMessage = t('jobInquiry.templateMessage', { title: jobTitle, company: companyName });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <MessageCircle className="h-4 w-4 mr-2" />
          {t('jobInquiry.messageHiringManager')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('jobInquiry.sendMessage')}</DialogTitle>
          <DialogDescription>
            {t('jobInquiry.reachOutAbout', { title: jobTitle, company: companyName })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            placeholder={t('jobInquiry.writeMessage')}
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
            {t('jobInquiry.useTemplate')}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t('jobInquiry.cancel')}
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim()}>
            {isSending ? (
              <>{t('jobInquiry.sending')}</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t('jobInquiry.sendMessageBtn')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}