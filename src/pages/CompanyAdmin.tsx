import { useParams, Navigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Users,
  Shield,
  ScrollText,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead, EmptyState } from "@/components/common";
import { useAuth } from "@/contexts/AuthContext";
import { getCompanyBySlug } from "@/services/companyService";
import { getUserCompanyRole, getCompanyRoles, removeCompanyRole } from "@/services/companyRolesService";
import {
  getPendingEmployees,
  getAllEmployees,
  verifyEmployee,
  removeEmployee,
} from "@/services/companyEmployeeService";
import { getCompanyAuditLog } from "@/services/companyAuditService";
import { format } from "date-fns";

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

  const handleVerify = async (employeeId: string) => {
    try {
      await verifyEmployee(employeeId);
      toast.success("Employee verified");
      queryClient.invalidateQueries({ queryKey: ["pendingEmployees", company.id] });
      queryClient.invalidateQueries({ queryKey: ["allEmployees", company.id] });
    } catch (err: any) {
      toast.error(err.message || "Failed to verify");
    }
  };

  const handleReject = async (employeeId: string) => {
    try {
      await removeEmployee(employeeId);
      toast.success("Employee claim removed");
      queryClient.invalidateQueries({ queryKey: ["pendingEmployees", company.id] });
      queryClient.invalidateQueries({ queryKey: ["allEmployees", company.id] });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    }
  };

  const handleRemoveRole = async (userId: string) => {
    try {
      await removeCompanyRole(company.id, userId);
      toast.success("Role removed");
      queryClient.invalidateQueries({ queryKey: ["companyRoles", company.id] });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove role");
    }
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
              <h1 className="text-2xl font-bold">{company.name} — Admin</h1>
              <p className="text-sm text-muted-foreground">
                Manage employees, roles, and view activity
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
                  <p className="text-xs text-muted-foreground">Employees</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Loader2 className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{pendingEmployees.length}</p>
                  <p className="text-xs text-muted-foreground">Pending Verification</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Shield className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{roles.length}</p>
                  <p className="text-xs text-muted-foreground">Admins & Editors</p>
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
                Verification Queue{" "}
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
                Roles
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Audit Log
              </TabsTrigger>
            </TabsList>

            {/* Verification Queue */}
            <TabsContent value="verification" className="mt-6 space-y-4">
              {pendingLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : pendingEmployees.length > 0 ? (
                pendingEmployees.map((emp) => (
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
                            {emp.profile?.fullname || emp.profile?.username || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {emp.title} · {emp.employment_type.replace("_", "-")} · since{" "}
                            {format(new Date(emp.start_date), "MMM yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleReject(emp.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => handleVerify(emp.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="All caught up"
                  description="No pending employee verifications"
                />
              )}
            </TabsContent>

            {/* Roles */}
            <TabsContent value="roles" className="mt-6 space-y-4">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <Card key={role.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{role.user_id.slice(0, 8)}…</p>
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
                          onClick={() => handleRemoveRole(role.user_id)}
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
                  title="No additional roles"
                  description="Only the owner currently has access"
                />
              )}
            </TabsContent>

            {/* Audit Log */}
            <TabsContent value="audit" className="mt-6 space-y-3">
              {auditLog.length > 0 ? (
                auditLog.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="flex items-center gap-3 py-3">
                      <ScrollText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">
                            {entry.actor_profile?.fullname || entry.actor_profile?.username || "System"}
                          </span>{" "}
                          <span className="text-muted-foreground">{entry.action}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "PPp")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon={ScrollText}
                  title="No activity yet"
                  description="Actions performed by admins will appear here"
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
