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

  const canDelete = confirmText === "DELETE" && understood;

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteAccount();
    
    if (result.success) {
      toast.success("Your account has been deleted");
      navigate("/");
    } else {
      toast.error(result.error || "Failed to delete account");
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle size={20} />
          Delete Account
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-destructive/10 p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium">This will permanently delete:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Your profile and all personal information</li>
            <li>All your posts, comments, and reactions</li>
            <li>Your connections and messages</li>
            <li>Your experience, education, and skills</li>
            <li>All saved items and notifications</li>
          </ul>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="understand" 
            checked={understood}
            onCheckedChange={(checked) => setUnderstood(checked === true)}
          />
          <label htmlFor="understand" className="text-sm cursor-pointer">
            I understand that this action is permanent and cannot be undone
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Type <span className="font-mono bg-muted px-1 rounded">DELETE</span> to confirm
          </label>
          <Input 
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
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
              Delete My Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Your account and all associated data will be permanently deleted from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Yes, delete my account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
