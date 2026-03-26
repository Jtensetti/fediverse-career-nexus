import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
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
import { deleteAccount } from "@/services/accountService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function DeleteAccountSection() {
  const [confirmText, setConfirmText] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const canDelete = confirmText === "RADERA" && understood;

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteAccount();
    
    if (result.success) {
      toast.success("Ditt konto har raderats");
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
          Radera konto
        </CardTitle>
        <CardDescription>
          Radera ditt konto och all tillhörande data permanent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-destructive/10 p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium">Detta kommer permanent att radera:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Din profil och all personlig information</li>
            <li>Alla dina inlägg, kommentarer och reaktioner</li>
            <li>Dina kontakter och meddelanden</li>
            <li>Din erfarenhet, utbildning och kompetenser</li>
            <li>Alla sparade objekt och notiser</li>
          </ul>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="understand" 
            checked={understood}
            onCheckedChange={(checked) => setUnderstood(checked === true)}
          />
          <label htmlFor="understand" className="text-sm cursor-pointer">
            Jag förstår att denna åtgärd är permanent och inte kan ångras
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Skriv <span className="font-mono bg-muted px-1 rounded">RADERA</span> för att bekräfta
          </label>
          <Input 
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RADERA"
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
              Radera mitt konto
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Är du helt säker?</AlertDialogTitle>
              <AlertDialogDescription>
                Denna åtgärd kan inte ångras. Ditt konto och all tillhörande data kommer att raderas permanent från våra servrar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Raderar..." : "Ja, radera mitt konto"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
