import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Loader2, Mail, ShieldCheck, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { logger } from "@/lib/logger";

type RecoveryRequest = {
  id: string;
  email: string;
  username: string | null;
  message: string | null;
  status: string;
  created_at: string;
  user_id: string | null;
  attempted_login_email: string | null;
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  in_progress: "secondary",
  resolved: "outline",
  rejected: "destructive",
};

export default function MfaRecoveryQueue() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const locale = i18n.language === "sv" ? sv : undefined;
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["mfa-recovery-requests"],
    queryFn: async (): Promise<RecoveryRequest[]> => {
      const { data, error } = await supabase
        .from("mfa_recovery_requests")
        .select("id, email, username, message, status, created_at, user_id, attempted_login_email")
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as RecoveryRequest[];
    },
  });

  const issueLink = async (requestId: string) => {
    setBusyId(requestId);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-issue-mfa-recovery",
        { body: { request_id: requestId } },
      );
      if (error || (data as any)?.error) {
        const code = (data as any)?.error;
        if (code === "no_user_match") {
          toast.error(t("mfa.recoveryNoUserMatch"));
        } else {
          toast.error(t("mfa.recoveryLinkError"));
        }
        return;
      }
      toast.success(t("mfa.recoveryLinkSent"));
      qc.invalidateQueries({ queryKey: ["mfa-recovery-requests"] });
    } catch (err) {
      logger.error("Issue link failed:", err);
      toast.error(t("mfa.recoveryLinkError"));
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  const reject = async (requestId: string) => {
    setBusyId(requestId);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("mfa_recovery_requests")
        .update({
          status: "rejected",
          handled_by: u.user?.id ?? null,
          handled_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (error) throw error;
      toast.success(t("mfa.recoveryRejected"));
      qc.invalidateQueries({ queryKey: ["mfa-recovery-requests"] });
    } catch (err) {
      logger.error("Reject failed:", err);
      toast.error(t("mfa.recoveryLinkError"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          {t("mfa.recoveryQueueTitle")}
        </CardTitle>
        <CardDescription>{t("mfa.recoveryQueueDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> ...
          </div>
        )}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">{t("mfa.recoveryNoRequests")}</p>
        )}
        {data?.map((r) => (
          <div
            key={r.id}
            className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-lg border bg-card p-4"
          >
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium break-all">{r.email}</span>
                <Badge variant={statusVariant[r.status] ?? "default"}>
                  {t(
                    `mfa.recoveryStatus${r.status.charAt(0).toUpperCase()}${r.status.slice(1).replace("_", "")}`,
                    r.status,
                  )}
                </Badge>
              </div>
              {r.username && (
                <p className="text-sm text-muted-foreground">@{r.username}</p>
              )}
              {r.message && (
                <p className="text-sm whitespace-pre-wrap break-words">{r.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale })}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => setConfirmId(r.id)}
                disabled={busyId === r.id || r.status === "resolved"}
              >
                <Mail className="h-4 w-4 mr-1" />
                {t("mfa.recoveryIssueLink")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => reject(r.id)}
                disabled={busyId === r.id}
              >
                <X className="h-4 w-4 mr-1" />
                {t("mfa.recoveryReject")}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("mfa.recoveryConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("mfa.recoveryConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Avbryt")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && issueLink(confirmId)}
              disabled={!!busyId}
            >
              {busyId ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {t("mfa.recoveryConfirmSend")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
