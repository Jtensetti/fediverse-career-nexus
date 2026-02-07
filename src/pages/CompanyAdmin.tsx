import { useParams, Navigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Users, Shield, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/common";
import { useAuth } from "@/contexts/AuthContext";
import { getCompanyBySlug } from "@/services/companyService";
import { getUserCompanyRole, getCompanyRoles, removeCompanyRole } from "@/services/companyRolesService";
import {
  getPendingEmployees,
  getAllEmployees,
  verifyEmployee,
  removeEmployee,
} from "@/services/companyEmployeeService";
import { getCompanyAuditLog, logAuditAction } from "@/services/companyAuditService";
import { VerificationQueue, RolesTab, AuditLogTab } from "@/components/company/admin";

export default function CompanyAdmin() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["company", slug],
    queryFn: () => getCompanyBySlug(slug!),
    enabled: !!slug,
  });

  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ["companyRole", company?.id],
    queryFn: () => getUserCompanyRole(company!.id),
    enabled: !!company?.id && !!user,
  });

  const { data: pendingEmployees = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["pendingEmployees", company?.id],
    queryFn: () => getPendingEmployees(company!.id),
    enabled: !!company?.id && (userRole === "owner" || userRole === "admin"),
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ["allEmployees", company?.id],
    queryFn: () => getAllEmployees(company!.id),
    enabled: !!company?.id && (userRole === "owner" || userRole === "admin"),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["companyRoles", company?.id],
    queryFn: () => getCompanyRoles(company!.id),
    enabled: !!company?.id && (userRole === "owner" || userRole === "admin"),
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ["companyAuditLog", company?.id],
    queryFn: () => getCompanyAuditLog(company!.id),
    enabled: !!company?.id && (userRole === "owner" || userRole === "admin"),
  });

  const canManage = userRole === "owner" || userRole === "admin";

  if (companyLoading || roleLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container max-w-5xl mx-auto py-6 px-4">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96 rounded-lg" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!company || !canManage) {
    return <Navigate to={company ? `/company/${slug}` : "/companies"} replace />;
  }

  const handleVerify = async (employeeId: string, employeeName?: string) => {
    try {
      await verifyEmployee(employeeId);
      await logAuditAction(company.id, "verified_employee", { employee_id: employeeId, name: employeeName });
      toast.success(t("companyAdmin.employeeVerified", "Employee verified"));
      queryClient.invalidateQueries({ queryKey: ["pendingEmployees", company.id] });
      queryClient.invalidateQueries({ queryKey: ["allEmployees", company.id] });
      queryClient.invalidateQueries({ queryKey: ["companyAuditLog", company.id] });
    } catch (err: any) {
      toast.error(err.message || t("companyAdmin.verifyFailed", "Failed to verify"));
    }
  };

  const handleReject = async (employeeId: string, employeeName?: string) => {
    try {
      await removeEmployee(employeeId);
      await logAuditAction(company.id, "rejected_employee", { employee_id: employeeId, name: employeeName });
      toast.success(t("companyAdmin.claimRemoved", "Employee claim removed"));
      queryClient.invalidateQueries({ queryKey: ["pendingEmployees", company.id] });
      queryClient.invalidateQueries({ queryKey: ["allEmployees", company.id] });
      queryClient.invalidateQueries({ queryKey: ["companyAuditLog", company.id] });
    } catch (err: any) {
      toast.error(err.message || t("companyAdmin.rejectFailed", "Failed to remove"));
    }
  };

  const handleRemoveRole = async (userId: string, userName?: string) => {
    try {
      await removeCompanyRole(company.id, userId);
      await logAuditAction(company.id, "removed_role", { user_id: userId, name: userName });
      toast.success(t("companyAdmin.roleRemoved", "Role removed"));
      queryClient.invalidateQueries({ queryKey: ["companyRoles", company.id] });
      queryClient.invalidateQueries({ queryKey: ["companyAuditLog", company.id] });
    } catch (err: any) {
      toast.error(err.message || t("companyAdmin.roleRemoveFailed", "Failed to remove role"));
    }
  };

  const handleRoleAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["companyRoles", company.id] });
    queryClient.invalidateQueries({ queryKey: ["companyAuditLog", company.id] });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title={`Admin - ${company.name}`} />
      <Navbar />
      <main className="flex-grow">
        <div className="container max-w-5xl mx-auto py-6 px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/company/${slug}`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("common.back", "Back")}
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {company.name} — {t("companyAdmin.title", "Admin")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("companyAdmin.subtitle", "Manage employees, roles, and view activity")}
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{allEmployees.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("companyAdmin.employees", "Employees")}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{pendingEmployees.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("companyAdmin.pendingVerification", "Pending Verification")}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Shield className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{roles.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("companyAdmin.adminsAndEditors", "Admins & Editors")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="verification">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="verification"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                {t("companyAdmin.verificationQueue", "Verification Queue")}{" "}
                {pendingEmployees.length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 text-xs">
                    {pendingEmployees.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="roles"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                {t("companyAdmin.roles", "Roles")}
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                {t("companyAdmin.auditLog", "Audit Log")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="verification" className="mt-6">
              <VerificationQueue
                employees={pendingEmployees}
                isLoading={pendingLoading}
                onVerify={handleVerify}
                onReject={handleReject}
              />
            </TabsContent>

            <TabsContent value="roles" className="mt-6">
              <RolesTab
                roles={roles}
                userRole={userRole}
                companyId={company.id}
                onRemoveRole={handleRemoveRole}
                onRoleAdded={handleRoleAdded}
              />
            </TabsContent>

            <TabsContent value="audit" className="mt-6">
              <AuditLogTab auditLog={auditLog} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
