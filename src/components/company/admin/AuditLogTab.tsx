import { useTranslation } from "react-i18next";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common";
import { format } from "date-fns";
import type { AuditLogWithActor } from "@/services/companyAuditService";

interface AuditLogTabProps {
  auditLog: AuditLogWithActor[];
}

export default function AuditLogTab({ auditLog }: AuditLogTabProps) {
  const { t } = useTranslation();

  if (auditLog.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title={t("companyAdmin.noActivity", "No activity yet")}
        description={t("companyAdmin.noActivityDesc", "Actions performed by admins will appear here")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {auditLog.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="flex items-center gap-3 py-3">
            <ScrollText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">
                  {entry.actor_profile?.fullname ||
                    entry.actor_profile?.username ||
                    t("common.system", "System")}
                </span>{" "}
                <span className="text-muted-foreground">{entry.action}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(entry.created_at), "PPp")}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
