import { intlLocale } from "@/lib/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, Trash2 } from "lucide-react";
import { deleteAccount } from "@/services/auth/accountService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { tx } from "@/i18n/tx";
export default function DeleteAccountSection() {
  const [confirmText, setConfirmText] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const canDelete = confirmText === "RADERA" && understood;

  const handleDelete = async () => {
    if (isDeleting || !canDelete) return;
    setIsDeleting(true);
    const result = await deleteAccount();

    if (result.success) {
      toast.success(`Kontot är dolt. Permanent radering sker efter 30 dagar${result.purgeAfter ? ", från " + new Date(result.purgeAfter).toLocaleDateString(intlLocale()) : ""}.`);
      navigate("/");
    } else {
      toast.error(result.error || "Kunde inte radera kontot");
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle size={20} />
          {tx("ui.deleteAccountSection.raderaKonto")}
        </CardTitle>
        <CardDescription>
          {tx("ui.deleteAccountSection.kontotDoljsDirektOch")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-destructive/10 p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium">{tx("ui.deleteAccountSection.efter30DagarRaderas")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>{tx("ui.deleteAccountSection.dinProfilOchDina")}</li>
            <li>{tx("ui.deleteAccountSection.allaDinaInlaggKommentarer")}</li>
            <li>{tx("ui.deleteAccountSection.dinaKontakterOchMeddelanden")}</li>
            <li>{tx("ui.deleteAccountSection.dinErfarenhetUtbildningOch")}</li>
            <li>{tx("ui.deleteAccountSection.allaSparadeObjektOch")}</li>
          </ul>
        </div>

        <p className="text-sm text-muted-foreground">{tx("ui.deleteAccountSection.laddaNerDinaUppgifter")}</p>
        <Button variant="link" onClick={async () => { await signOut(); navigate('/auth', { state: { returnTo: '/profile/edit' } }); }}>{tx("ui.deleteAccountSection.loggaUtOchLogga")}</Button>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="understand"
            checked={understood}
            onCheckedChange={(checked) => setUnderstood(checked === true)}
          />
          <label htmlFor="understand" className="text-sm cursor-pointer">
            {tx("ui.deleteAccountSection.jagForstarAttKontot")}
          </label>
        </div>

        <div className="space-y-2">
          <label htmlFor="delete-confirmation" className="text-sm font-medium">
            {tx("ui.deleteAccountSection.skriv")}{' '}<span className="font-mono bg-muted px-1 rounded">{tx("ui.deleteAccountSection.radera")}</span>{' '}{tx("ui.deleteAccountSection.forAttBekrafta")}
          </label>
          <Input id="delete-confirmation"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={tx("ui.deleteAccountSection.radera")}
            className="font-mono"
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full"
              disabled={!canDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tx("ui.deleteAccountSection.raderaMittKonto")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tx("ui.deleteAccountSection.arDuHeltSaker")}</AlertDialogTitle>
              <AlertDialogDescription>
                {tx("ui.deleteAccountSection.dinProfilOchDitt")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tx("ui.deleteAccountSection.avbryt")}</AlertDialogCancel>
              <Button variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? tx("ui.deleteAccountSection.raderar") : tx("ui.deleteAccountSection.jaRaderaMittKonto")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
