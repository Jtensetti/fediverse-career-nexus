import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EmptyState } from "@/components/common";
import { format } from "date-fns";
import { formatEmploymentType } from "./utils";

interface Employee {
  id: string;
  title: string;
  employment_type: string;
  start_date: string;
  profile?: {
    fullname: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

interface VerificationQueueProps {
  employees: Employee[];
  isLoading: boolean;
  onVerify: (employeeId: string, employeeName?: string) => Promise<void>;
  onReject: (employeeId: string, employeeName?: string) => Promise<void>;
}

export default function VerificationQueue({
  employees,
  isLoading,
  onVerify,
  onReject,
}: VerificationQueueProps) {
  const { t } = useTranslation();
  const [rejectTarget, setRejectTarget] = useState<Employee | null>(null);

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    await onReject(rejectTarget.id, rejectTarget.profile?.fullname || undefined);
    setRejectTarget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title={t("companyAdmin.allCaughtUp", "All caught up")}
        description={t("companyAdmin.noPendingVerifications", "No pending employee verifications")}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {employees.map((emp) => (
          <Card key={emp.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={emp.profile?.avatar_url || ""} />
                  <AvatarFallback>
                    {(emp.profile?.fullname || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {emp.profile?.fullname || emp.profile?.username || t("common.unknown", "Unknown")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {emp.title} · {formatEmploymentType(emp.employment_type)} · {t("companyAdmin.since", "since")}{" "}
                    {format(new Date(emp.start_date), "MMM yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setRejectTarget(emp)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {t("companyAdmin.reject", "Reject")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => onVerify(emp.id, emp.profile?.fullname || undefined)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {t("companyAdmin.verify", "Verify")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("companyAdmin.rejectEmployeeTitle", "Reject employee claim?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "companyAdmin.rejectEmployeeDesc",
                "This will permanently remove {{name}}'s employment claim. They will need to submit a new claim.",
                { name: rejectTarget?.profile?.fullname || rejectTarget?.profile?.username || t("common.unknown", "Unknown") }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("companyAdmin.reject", "Reject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
