import { useState } from "react";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { blockUser } from "@/services/blockService";

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string;
  onBlocked?: () => void;
}

export default function BlockUserDialog({
  open,
  onOpenChange,
  userId,
  userName = "denna användare",
  onBlocked,
}: BlockUserDialogProps) {
  const [reason, setReason] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    setIsBlocking(true);
    const success = await blockUser(userId, reason || undefined);

    if (success) {
      toast.success(`${userName} har blockerats`);
      onOpenChange(false);
      setReason("");
      onBlocked?.();
    } else {
      toast.error("Kunde inte blockera användaren");
    }
    setIsBlocking(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            Blockera {userName}
          </DialogTitle>
          <DialogDescription>
            Att blockera denna användare kommer att:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Dölja deras inlägg från ditt flöde</li>
              <li>Förhindra dem från att skicka meddelanden till dig</li>
              <li>Ta bort dem från sökresultat</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Anledning (valfritt)</Label>
            <Textarea
              id="reason"
              placeholder="Varför blockerar du denna användare?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            variant="destructive"
            onClick={handleBlock}
            disabled={isBlocking}
          >
            {isBlocking ? "Blockerar..." : "Blockera användare"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
