import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { CompanyRoleWithProfile } from "@/services/companyRolesService";
import AddRoleForm from "./AddRoleForm";

interface RolesTabProps {
  roles: CompanyRoleWithProfile[];
  userRole: string | null;
  companyId: string;
  onRemoveRole: (userId: string, userName?: string) => Promise<void>;
  onRoleAdded: () => void;
}

export default function RolesTab({
  roles,
  userRole,
  companyId,
  onRemoveRole,
  onRoleAdded,
}: RolesTabProps) {
  const { t } = useTranslation();
  const [removeTarget, setRemoveTarget] = useState<CompanyRoleWithProfile | null>(null);

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    await onRemoveRole(removeTarget.user_id, removeTarget.profile?.fullname || undefined);
    setRemoveTarget(null);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Add role form (owners only) */}
        {userRole === "owner" && (
          <AddRoleForm companyId={companyId} onRoleAdded={onRoleAdded} />
        )}

        {roles.length > 0 ? (
          roles.map((role) => (
            <Card key={role.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={role.profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {(role.profile?.fullname || role.profile?.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {role.profile?.fullname ||
                        role.profile?.username ||
                        role.user_id.slice(0, 8) + "…"}
                    </p>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {role.role}
                    </Badge>
                  </div>
                </div>
                {userRole === "owner" && role.role !== "owner" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoveTarget(role)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={UserPlus}
            title={t("companyAdmin.noAdditionalRoles", "No additional roles")}
            description={t(
              "companyAdmin.onlyOwnerAccess",
              "Only the owner currently has access"
            )}
          />
        )}
      </div>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("companyAdmin.removeRoleTitle", "Remove role?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "companyAdmin.removeRoleDesc",
                "This will remove {{name}}'s access to manage this company page. They can be re-added later.",
                {
                  name:
                    removeTarget?.profile?.fullname ||
                    removeTarget?.profile?.username ||
                    t("common.unknown", "Unknown"),
                }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("companyAdmin.removeRole", "Remove Role")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
