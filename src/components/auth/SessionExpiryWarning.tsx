import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
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

import { tx } from "@/i18n/tx";
const SESSION_WARNING_THRESHOLD = 2 * 60 * 1000;
const DISMISS_COOLDOWN = 10 * 60 * 1000;
const ACTIVITY_THRESHOLD = 2 * 60 * 1000;
// Throttle activity writes — once per 5s is plenty to keep the freshness check accurate.
const ACTIVITY_WRITE_THROTTLE_MS = 5_000;

export default function SessionExpiryWarning() {
  const { session } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastActivityWriteRef = useRef(0);

  const updateLastActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
    lastActivityWriteRef.current = now;
    localStorage.setItem('lastActivity', now.toString());
  }, []);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateLastActivity, { passive: true }));
    updateLastActivity();

    return () => {
      events.forEach(event => window.removeEventListener(event, updateLastActivity));
    };
  }, [updateLastActivity]);

  useEffect(() => {
    if (!session?.expires_at) return;

    const checkExpiry = async () => {
      if (!session.expires_at) return;
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      const remaining = expiresAt - now;

      const lastDismissed = localStorage.getItem('sessionWarningDismissed');
      if (lastDismissed && now - parseInt(lastDismissed) < DISMISS_COOLDOWN) {
        return;
      }

      if (remaining <= SESSION_WARNING_THRESHOLD && remaining > 0) {
        const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
        if (now - lastActivity < ACTIVITY_THRESHOLD) {
          try {
            await supabase.auth.refreshSession();
          } catch {
            setTimeRemaining(Math.floor(remaining / 1000));
            setShowWarning(true);
          }
          return;
        }

        setTimeRemaining(Math.floor(remaining / 1000));
        setShowWarning(true);
      } else if (remaining <= 0) {
        setShowWarning(false);
        toast.error(tx("ui.sessionExpiryWarning.dinSessionHarGatt"));
      } else {
        setShowWarning(false);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 30000);

    return () => clearInterval(interval);
  }, [session?.expires_at]);

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
      toast.success(tx("ui.sessionExpiryWarning.sessionenHarForlangts"));
      setShowWarning(false);
    } catch {
      toast.error(tx("ui.sessionExpiryWarning.kundeInteForlangaSessionen"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('sessionWarningDismissed', Date.now().toString());
    setShowWarning(false);
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
            {tx("ui.sessionExpiryWarning.sessionenGarUtSnart")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tx("ui.sessionExpiryWarning.dinSessionGarUt")}{" "}
            <span className="font-bold text-foreground">
              {formatTime(timeRemaining)}
            </span>
            {tx("ui.sessionExpiryWarning.villDuForlangaSessionen")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleDismiss}>
            {tx("ui.sessionExpiryWarning.avfarda")}
          </Button>
          <Button onClick={handleExtendSession} disabled={isRefreshing}>
            {isRefreshing ? tx("ui.sessionExpiryWarning.forlanger") : tx("ui.sessionExpiryWarning.forlangSession")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}