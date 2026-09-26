import { dateLocale } from "@/lib/locale";
import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

import { Check, X, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageRequest,
  acceptMessageRequest,
  declineMessageRequest
} from "@/services/messaging/messageRequestService";

import { tx } from "@/i18n/tx";
interface MessageRequestCardProps {
  request: MessageRequest;
  onAction?: (requestId: string, action: 'accepted' | 'declined') => void;
}

export default function MessageRequestCard({ request, onAction }: MessageRequestCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  const sender = request.sender;

  const handleAccept = async () => {
    setIsAccepting(true);
    const success = await acceptMessageRequest(request.id);
    if (success) {
      onAction?.(request.id, 'accepted');
    }
    setIsAccepting(false);
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    const success = await declineMessageRequest(request.id);
    if (success) {
      onAction?.(request.id, 'declined');
    }
    setIsDeclining(false);
    setShowDeclineDialog(false);
  };

  return (
    <>
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Sender avatar */}
            <Link to={`/profile/${sender?.username || sender?.id}`}>
              <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 ring-primary/50 transition-all">
                <AvatarImage src={sender?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {sender?.fullname?.[0] || sender?.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <Link 
                    to={`/profile/${sender?.username || sender?.id}`} 
                    className="font-semibold hover:underline text-foreground"
                  >
                    {sender?.fullname || sender?.username || tx("ui.messageRequestCard.unknown")}
                  </Link>
                  {sender?.headline && (
                    <p className="text-sm text-muted-foreground truncate">{sender.headline}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {request.created_at && formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: dateLocale() })}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAccept}
                  disabled={isAccepting || isDeclining}
                  className="gap-1.5"
                >
                  {isAccepting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                    {tx("ui.messageRequestCard.acceptera")}
                 </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeclineDialog(true)}
                  disabled={isAccepting || isDeclining}
                  className="gap-1.5"
                >
                  {isDeclining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                   {tx("ui.messageRequestCard.avboj")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decline confirmation dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {tx("ui.messageRequestCard.avbojDennaForfragan")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tx("ui.messageRequestCard.kommerInteKunnaSkicka", { name: sender?.fullname || sender?.username || tx("ui.messageRequestCard.unknown") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tx("ui.messageRequestCard.avbryt")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDecline} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tx("ui.messageRequestCard.avbojForfragan")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
