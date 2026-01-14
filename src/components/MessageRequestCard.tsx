import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Check, X, MessageCircle, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  declineMessageRequest,
  INTRO_TEMPLATES
} from "@/services/messageRequestService";

interface MessageRequestCardProps {
  request: MessageRequest;
  onAction?: (requestId: string, action: 'accepted' | 'declined') => void;
}

export default function MessageRequestCard({ request, onAction }: MessageRequestCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  const sender = request.sender;
  const template = INTRO_TEMPLATES.find(t => t.id === request.intro_template);

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
            <Link to={`/profile/${sender?.id}`}>
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
                    to={`/profile/${sender?.id}`} 
                    className="font-semibold hover:underline text-foreground"
                  >
                    {sender?.fullname || sender?.username || 'Unknown'}
                  </Link>
                  {sender?.headline && (
                    <p className="text-sm text-muted-foreground truncate">{sender.headline}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Template badge */}
              {template && template.id !== 'custom' && (
                <Badge variant="secondary" className="mb-2 text-xs">
                  {template.label}
                </Badge>
              )}

              {/* Preview text */}
              {request.preview_text && (
                <div className="bg-muted/50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                    "{request.preview_text}"
                  </p>
                </div>
              )}

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
                  Accept
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
                  Decline
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
              Decline this request?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {sender?.fullname || sender?.username} won't be able to send you another message request.
              You can always connect with them later if you change your mind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDecline} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Decline request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
