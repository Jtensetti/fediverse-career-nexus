import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Users, Plus, Clock, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { useAuth } from "@/contexts/AuthContext";
import {
  getVerifiedEmployees,
  getUserEmployment,
} from "@/services/companyEmployeeService";
import CompanyEmployeeForm from "./CompanyEmployeeForm";

interface CompanyPeopleTabProps {
  companyId: string;
}

export default function CompanyPeopleTab({ companyId }: CompanyPeopleTabProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const {
    data: employees = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["companyEmployees", companyId],
    queryFn: () => getVerifiedEmployees(companyId),
    enabled: !!companyId,
  });

  const { data: userEmployment, refetch: refetchUserEmployment } = useQuery({
    queryKey: ["userEmployment", companyId],
    queryFn: () => getUserEmployment(companyId),
    enabled: !!companyId && !!user,
  });

  const handleSuccess = () => {
    refetch();
    refetchUserEmployment();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* I work here button */}
      {user && !userEmployment && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("companies.iWorkHere", "I work here")}
          </Button>
        </div>
      )}

      {/* Pending status message */}
      {userEmployment && !userEmployment.is_verified && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="flex items-center gap-3 py-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {t("companies.pendingVerification", "Your employment claim is pending verification")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("companies.pendingVerificationDescription", "A company admin will review your claim.")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee list */}
      {employees.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {employees.map((emp) => (
            <Card key={emp.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center gap-3 py-3">
                <Link
                  to={emp.profile?.username ? `/profile/${emp.profile.username}` : `/profile/${emp.user_id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={emp.profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {(emp.profile?.fullname || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {emp.profile?.fullname || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.title}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <Badge variant="secondary" className="text-xs font-normal">
                    {emp.employment_type.replace("_", "-")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={t("companies.noPeople", "No employees listed")}
          description={t(
            "companies.noPeopleDescription",
            "Be the first to add yourself as an employee"
          )}
        />
      )}

      {/* Employee form dialog */}
      <CompanyEmployeeForm
        companyId={companyId}
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
