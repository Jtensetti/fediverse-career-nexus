import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes in ms

export default function SessionExpiryWarning() {
  const { session } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!session?.expires_at) return;

    const checkExpiry = () => {
      const expiresAt = session.expires_at * 1000; // Convert to ms
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= SESSION_WARNING_THRESHOLD && remaining > 0) {
        setTimeRemaining(Math.floor(remaining / 1000));
        setShowWarning(true);
      } else if (remaining <= 0) {
        setShowWarning(false);
        toast.error("Your session has expired. Please sign in again.");
      } else {
        setShowWarning(false);
      }
    };

    // Check immediately and then every 30 seconds
    checkExpiry();
    const interval = setInterval(checkExpiry, 30000);

    return () => clearInterval(interval);
  }, [session?.expires_at]);

  // Update countdown every second when warning is shown
  useEffect(() => {
    if (!showWarning || timeRemaining === null) return;

    const countdown = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          setShowWarning(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [showWarning]);

  const handleExtendSession = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
      toast.success("Session extended successfully");
      setShowWarning(false);
    } catch {
      toast.error("Failed to extend session. Please sign in again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!showWarning || timeRemaining === null) return null;

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in{" "}
            <span className="font-bold text-foreground">
              {formatTime(timeRemaining)}
            </span>
            . Would you like to extend your session?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => setShowWarning(false)}>
            Dismiss
          </Button>
          <Button onClick={handleExtendSession} disabled={isRefreshing}>
            {isRefreshing ? "Extending..." : "Extend Session"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
