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
import { blockUser } from "@/services/moderation/blockService";

import { useTranslation } from "react-i18next";
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
  userName,
  onBlocked,
}: BlockUserDialogProps) {
  const { t: tx } = useTranslation();
  const [reason, setReason] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    setIsBlocking(true);
    const success = await blockUser(userId, reason || undefined);

    if (success) {
      toast.success(tx("reviewUI.userBlocked"));
      onOpenChange(false);
      setReason("");
      onBlocked?.();
    } else {
      toast.error(tx("ui.blockUserDialog.kundeInteBlockeraAnvandaren"));
    }
    setIsBlocking(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            {userName ? tx("reviewUI.blockName", { name: userName }) : tx("ui.blockUserDialog.blockeraAnvandare")}
          </DialogTitle>
          <DialogDescription>
            {tx("ui.blockUserDialog.attBlockeraDennaAnvandare")}
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>{tx("ui.blockUserDialog.doljaDerasInlaggFran")}</li>
              <li>{tx("ui.blockUserDialog.forhindraDemFranAtt")}</li>
              <li>{tx("ui.blockUserDialog.taBortDemFran")}</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{tx("ui.blockUserDialog.anledningValfritt")}</Label>
            <Textarea
              id="reason"
              placeholder={tx("ui.blockUserDialog.varforBlockerarDuDenna")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tx("ui.blockUserDialog.avbryt")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleBlock}
            disabled={isBlocking}
          >
            {isBlocking ? tx("ui.blockUserDialog.blockerar") : tx("ui.blockUserDialog.blockeraAnvandare")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
